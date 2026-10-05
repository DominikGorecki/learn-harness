import { ApplicationError } from '../../shared/contracts'
import { generateWithPi } from './pi-outline-engine'
import { runModelAccessProfile } from './pi-model-access-profile'
import { parseWorkerRequest } from './worker-protocol'
import type { WorkerReply, WorkerPhase } from './worker-protocol'
import type { TransportState } from './pi-stream-liveness'
import { safeLogData } from '../../shared/diagnostics'

const controller = new AbortController()
let started = false, sequence = 0, phase: WorkerPhase = 'preparing'
let heartbeat: ReturnType<typeof setInterval> | null = null
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
    : runModelAccessProfile(request.input, { signal: controller.signal, onTransport: transport,
      onEvidenceProgress: evidence => reply({ type: 'model-evidence', evidence }),
      onEvidence: evidence => reply({ type: 'model-evidence', evidence }) })
      .then(result => reply({ type: 'result', profile: 'model-access', result }))
  void run.catch(error => {
    const safe = error instanceof ApplicationError ? error : new ApplicationError('INTERNAL', 'AI work could not finish.')
    reply({ type: 'error', code: safe.code })
  }).finally(() => { phase = 'finished'; if (heartbeat) clearInterval(heartbeat); heartbeat = null })
})
