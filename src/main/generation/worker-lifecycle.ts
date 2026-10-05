import type { EventEmitter } from 'node:events'
import { ApplicationError } from '../../shared/contracts'
import type { EnginePhase, OutlineEngineResult } from '../../shared/generation'
import { parseWorkerReply, parseWorkerRequest } from './worker-protocol'
import type { WorkerReply, WorkerRequest, WorkerProfile, WorkerDiagnosticEvent } from './worker-protocol'
import type { PiProtocolEvidence } from './pi-protocol-evidence'
import type { TransportState, MonotonicClock } from './pi-stream-liveness'
import { systemClock } from './pi-stream-liveness'
import { observe } from './observe'

export interface WorkerHandle extends Pick<EventEmitter, 'on' | 'once' | 'removeListener'> {
  readonly pid?: number
  postMessage(value: WorkerRequest): void
  kill(): boolean
}
export interface WorkerRunOptions {
  signal: AbortSignal; clock?: MonotonicClock; spawnMs?: number; healthMs?: number; cleanupMs?: number
  onPhase?(phase: EnginePhase): void; onTransport?(state: TransportState): void
  onProgress?(frame: Extract<WorkerReply, { type: 'progress' }>): void
  onModelEvidence?(evidence: PiProtocolEvidence): void
  onDiagnostic?(event: WorkerDiagnosticEvent, data: unknown): void
  onLifecycle?(event: 'spawned' | 'health' | 'exited' | 'stopping', data: Record<string, unknown>): void
}
export interface PiWorkerTask {
  result: Promise<OutlineEngineResult | PiProtocolEvidence>
  stop(): Promise<void>
}
const errorMessages: Partial<Record<ApplicationError['code'], string>> = {
  CANCELLED: 'AI work cancelled. Your previous work is unchanged.', NETWORK: 'The AI connection stopped. Your previous work is unchanged; try again.',
  UNAVAILABLE: 'The AI response could not be completed. Try a smaller request or try again.',
  AUTH_REQUIRED: 'Your ChatGPT connection needs to be renewed. Please reconnect.',
  USAGE_LIMIT: 'Your ChatGPT usage limit has been reached. Your previous work is unchanged.',
  ACCESS_RESTRICTED: 'ChatGPT plan access is unavailable for this account or location.'
}

/** Admission can settle only after the owned process exits, including successful worker results. */
export function startPiWorker(profile: WorkerProfile, options: WorkerRunOptions, fork: () => WorkerHandle): PiWorkerTask {
  const parsed = parseWorkerRequest({ type: 'start', ...profile })
  const clock = options.clock ?? systemClock
  let resolveResult!: (value: OutlineEngineResult | PiProtocolEvidence) => void
  let rejectResult!: (error: ApplicationError) => void
  const result = new Promise<OutlineEngineResult | PiProtocolEvidence>((resolve, reject) => { resolveResult = resolve; rejectResult = reject })
  // stop() consumes a failure without changing the result seen by the domain owner.
  const stopped = result.then(() => {}, () => {})
  if (options.signal.aborted) { rejectResult(new ApplicationError('CANCELLED', errorMessages.CANCELLED!)); return { result, stop: () => stopped } }
  let worker: WorkerHandle
  try { worker = fork() } catch { rejectResult(new ApplicationError('INTERNAL', 'The AI process could not start. Try again.')); return { result, stop: () => stopped } }
  let spawned = false, exited = false, stopping = false, killed = false
  let sequence = -1, healthSequence = -1, transportTurn = -1
  let previousTransport: TransportState | null = null
  let outcome: OutlineEngineResult | PiProtocolEvidence | undefined
  let failure: ApplicationError | null = null
  let spawnTimer: unknown | null = null, healthTimer: unknown | null = null, cleanupTimer: unknown | null = null
  const lifecycle = (event: Parameters<NonNullable<WorkerRunOptions['onLifecycle']>>[0], data: Record<string, unknown>) => observe(() => options.onLifecycle?.(event, data))
  const clear = () => {
    for (const handle of [spawnTimer, healthTimer, cleanupTimer]) if (handle !== null) clock.cancel(handle)
    spawnTimer = null; healthTimer = null; cleanupTimer = null
  }
  const kill = () => {
    if (exited || killed) return
    try { killed = worker.kill() } catch { /* Exit/spawn monitoring continues; never resolve before exit. */ }
  }
  const stop = (error?: ApplicationError, cooperative = false) => {
    if (exited) return
    if (error && !failure) failure = error
    if (stopping && cooperative) return
    if (!stopping) { stopping = true; lifecycle('stopping', { code: failure?.code }); clear() }
    if (cooperative && spawned && cleanupTimer === null) {
      try { worker.postMessage({ type: 'cancel' }) } catch { kill(); return }
      cleanupTimer = clock.schedule(() => { cleanupTimer = null; kill() }, options.cleanupMs ?? 5000)
    } else kill()
  }
  const resetHealth = () => {
    if (healthTimer !== null) clock.cancel(healthTimer)
    healthTimer = clock.schedule(() => {
      healthTimer = null
      stop(new ApplicationError('INTERNAL', 'The AI process stopped responding. Your previous work is unchanged; try again.'))
    }, options.healthMs ?? 30_000)
  }
  const cancel = () => stop(new ApplicationError('CANCELLED', errorMessages.CANCELLED!), true)
  const spawnedEvent = () => {
    spawned = true
    if (spawnTimer !== null) clock.cancel(spawnTimer)
    spawnTimer = null; lifecycle('spawned', { pid: worker.pid })
    if (stopping) { kill(); return }
    resetHealth()
    try { worker.postMessage(parsed) } catch { stop(new ApplicationError('INTERNAL', 'The AI process could not receive its request. Try again.')) }
  }
  const messageEvent = (value: unknown) => {
    if (exited) return
    try {
      const message = parseWorkerReply(value, profile)
      if (message.sequence <= sequence) throw new ApplicationError('INTERNAL', 'The AI process sent an out-of-order message.')
      sequence = message.sequence
      if (stopping) {
        // Cleanup summaries remain useful while cancellation awaits exit. They cannot
        // publish progress, change the pending outcome or extend worker health.
        if (message.type === 'diagnostic') observe(() => options.onDiagnostic?.(message.event, message.data))
        if (message.type === 'error' || message.type === 'result') kill()
        return
      }
      if (!spawned) throw new ApplicationError('INTERNAL', 'The AI process sent a premature message.')
      switch (message.type) {
        case 'health':
          if (profile.profile === 'model-access' && !['preparing', 'waiting', 'receiving', 'finished'].includes(message.phase)) throw new ApplicationError('INTERNAL', 'The model diagnostic exceeded its task scope.')
          if (message.sequence <= healthSequence) throw new ApplicationError('INTERNAL', 'The AI process sent invalid health evidence.')
          healthSequence = message.sequence; resetHealth(); lifecycle('health', { phase: message.phase }); break
        case 'phase':
          if (profile.profile === 'model-access') throw new ApplicationError('INTERNAL', 'The model diagnostic exceeded its task scope.')
          observe(() => options.onPhase?.(message.phase)); break
        case 'transport': {
          const state = message.state
          if (state.turn < 1 || state.turn > (profile.profile === 'outline' ? 16 : 1)) throw new ApplicationError('INTERNAL', 'The AI process exceeded its turn scope.')
          if (state.turn < transportTurn || state.turn === transportTurn && previousTransport && (state.bytes < previousTransport.bytes || state.chunks < previousTransport.chunks || state.events < previousTransport.events)) {
            throw new ApplicationError('INTERNAL', 'The AI process sent invalid transport evidence.')
          }
          transportTurn = state.turn; previousTransport = state
          observe(() => options.onTransport?.(state)); break
        }
        case 'progress':
          if (profile.profile === 'model-access' && !['none', 'model-test-evidence'].includes(message.preview.kind) ||
            profile.profile === 'outline' && profile.input.topicId && (message.preview.kind !== 'none' && (message.preview.kind !== 'topic' || message.preview.topicId !== profile.input.topicId))) {
            throw new ApplicationError('INTERNAL', 'The AI process sent a preview outside its task scope.')
          }
          observe(() => options.onProgress?.(message)); break
        case 'diagnostic': observe(() => options.onDiagnostic?.(message.event, message.data)); break
        case 'model-evidence': observe(() => options.onModelEvidence?.(message.evidence)); break
        case 'result': outcome = message.result; stop(); break
        case 'error': stop(new ApplicationError(message.code, errorMessages[message.code] ?? 'AI work could not finish. Your previous work is unchanged; try again.')); break
      }
    } catch { stop(new ApplicationError('INTERNAL', 'The AI process sent an invalid message. Your previous work is unchanged; try again.')) }
  }
  const exitEvent = (exitCode: number) => {
    if (exited) return
    exited = true; clear(); options.signal.removeEventListener('abort', cancel)
    worker.removeListener('spawn', spawnedEvent); worker.removeListener('message', messageEvent); worker.removeListener('exit', exitEvent); worker.removeListener('error', errorEvent)
    lifecycle('exited', { exitCode })
    if (failure) rejectResult(failure)
    else if (outcome) resolveResult(outcome)
    else rejectResult(new ApplicationError('INTERNAL', profile.profile === 'outline' ? 'The outline process stopped unexpectedly. Your previous work is unchanged.' : 'The AI process stopped unexpectedly. Your previous work is unchanged; try again.'))
  }
  const errorEvent = () => stop(new ApplicationError('INTERNAL', 'The AI process could not start or continue. Try again.'))
  worker.once('spawn', spawnedEvent); worker.on('message', messageEvent); worker.once('exit', exitEvent); worker.on('error', errorEvent)
  options.signal.addEventListener('abort', cancel, { once: true })
  spawnTimer = clock.schedule(() => { spawnTimer = null; stop(new ApplicationError('INTERNAL', 'The AI process did not start. Try again.')) }, options.spawnMs ?? 30_000)
  if (options.signal.aborted) cancel()
  return { result, stop: () => { cancel(); return stopped } }
}
