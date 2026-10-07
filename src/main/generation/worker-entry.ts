import { ApplicationError } from '../../shared/contracts'
import { generateWithPi } from './pi-outline-engine'
import { runModelAccessProfile } from './pi-model-access-profile'
import { parseWorkerRequest } from './worker-protocol'
import type { WorkerReply, WorkerPhase } from './worker-protocol'
import type { TransportState } from './pi-stream-liveness'
import { safeLogData } from '../../shared/diagnostics'
import { randomUUID } from 'node:crypto'
import { runImageProfile } from './pi-image-profile'
import type { WorkerRequest } from './worker-protocol'
import type { ImageAuthorization } from './image-worker-contract'

const controller = new AbortController()
let started = false, sequence = 0, phase: WorkerPhase = 'preparing'
let heartbeat: ReturnType<typeof setInterval> | null = null
let imageRequestId: string | null = null, imageCallId: string | null = null
let authorize: ((authority: ImageAuthorization | null) => void) | null = null
let terminalAck: ((accepted: boolean) => void) | null = null
let assetAck: ((accepted: boolean) => void) | null = null
function acknowledgment(request: Exclude<WorkerRequest, { type: 'start' | 'cancel' }>): void {
  if (!started || !imageRequestId || request.requestId !== imageRequestId) throw new ApplicationError('INTERNAL', 'Unexpected image acknowledgment.')
  if (request.type === 'image-authorized') {
    if (!authorize || imageCallId) throw new ApplicationError('INTERNAL', 'Duplicate image authorization.')
    imageCallId = request.authority?.callId ?? null
    const resolve = authorize; authorize = null; resolve(request.authority); return
  }
  if (!imageCallId || request.callId !== imageCallId) throw new ApplicationError('INTERNAL', 'Invalid image correlation.')
  const resolve = request.type === 'image-terminal-ack' ? terminalAck : assetAck
  if (!resolve) throw new ApplicationError('INTERNAL', 'Unexpected image acknowledgment.')
  if (request.type === 'image-terminal-ack') terminalAck = null; else assetAck = null
  resolve(request.accepted)
}
async function image(input: { imageSlotId: string }): Promise<void> {
  imageRequestId = randomUUID()
  const authority = await new Promise<ImageAuthorization | null>(resolve => { authorize = resolve; reply({ type: 'image-intent', requestId: imageRequestId!, imageSlotId: input.imageSlotId }) })
  if (!authority || authority.imageSlotId !== input.imageSlotId) throw new ApplicationError('FORBIDDEN', 'Image dispatch was not authorized.')
  const result = await runImageProfile(authority, { signal: controller.signal, onTransport: transport, onTerminal: async terminal => {
    const accepted = await new Promise<boolean>(resolve => { terminalAck = resolve; reply({ type: 'image-terminal', requestId: imageRequestId!, callId: authority.callId, terminal }) })
    if (!accepted) throw new ApplicationError('STORAGE', 'Image billing could not be saved.')
  } })
  if (controller.signal.aborted) throw new ApplicationError('CANCELLED', 'Image generation cancelled.')
  const accepted = await new Promise<boolean>(resolve => { assetAck = resolve; reply({ type: 'image-asset', requestId: imageRequestId!, image: result }) })
  if (!accepted) throw new ApplicationError('STORAGE', 'The illustration could not be checkpointed.')
  reply({ type: 'result', profile: 'fixed-image', result: { kind: 'image', callId: result.callId, imageSlotId: result.imageSlotId } })
}
type Outgoing = WorkerReply extends infer Frame ? Frame extends WorkerReply ? Omit<Frame, 'sequence'> : never : never
const reply = (value: Outgoing) => process.parentPort?.postMessage({ ...value, sequence: ++sequence })
for (const method of ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const) {
  console[method] = (...args: unknown[]) => {
    try { reply({ type: 'diagnostic', event: 'console.output', data: safeLogData({ method, arguments: args.length,
      omittedCharacters: args.reduce<number>((count, value) => count + (typeof value === 'string' ? value.length : 0), 0),
      errorType: args.find(value => value instanceof Error)?.constructor.name }) }) } catch { /* Ignored stdio is not an inference failure. */ }
  }
}
process.on('uncaughtExceptionMonitor', (error, origin) => {
  try { reply({ type: 'diagnostic', event: 'process.unhandled', data: safeLogData({ errorType: error.constructor.name, origin }) }) } catch { /* Main observes exit. */ }
})
const transport = (state: TransportState) => {
  if (state.stage !== 'ended') phase = state.stage
  reply({ type: 'transport', state })
}
process.parentPort?.on('message', (event: { data: unknown }) => {
  let request: ReturnType<typeof parseWorkerRequest>
  try { request = parseWorkerRequest(event.data) } catch { controller.abort(); reply({ type: 'error', code: 'INTERNAL' }); return }
  if (request.type === 'cancel') { controller.abort(); return }
  if (request.type !== 'start') {
    try { acknowledgment(request) } catch { controller.abort(); reply({ type: 'error', code: 'INTERNAL' }) }
    return
  }
  if (started) { controller.abort(); reply({ type: 'error', code: 'INTERNAL' }); return }
  started = true
  heartbeat = setInterval(() => reply({ type: 'health', phase }), 5000)
  reply({ type: 'health', phase })
  const run = request.profile === 'outline'
    ? generateWithPi(request.input, { signal: controller.signal,
      onPhase: value => { phase = value; reply({ type: 'phase', phase: value }) }, onTransport: transport,
      onProgress: frame => reply({ type: 'progress', ...frame }),
      onDiagnostic: (event, data) => reply({ type: 'diagnostic', event, data: safeLogData(data) }) })
      .then(result => reply({ type: 'result', profile: 'outline', result }))
    : request.profile === 'fixed-image' ? image(request.input) : runModelAccessProfile(request.input, { signal: controller.signal, onTransport: transport,
      onEvidenceProgress: evidence => reply({ type: 'model-evidence', evidence }),
      onEvidence: evidence => reply({ type: 'model-evidence', evidence }) })
      .then(result => reply({ type: 'result', profile: 'model-access', result }))
  void run.catch(error => {
    const safe = error instanceof ApplicationError ? error : new ApplicationError('INTERNAL', 'AI work could not finish.')
    reply({ type: 'error', code: safe.code })
  }).finally(() => { phase = 'finished'; if (heartbeat) clearInterval(heartbeat); heartbeat = null })
})
