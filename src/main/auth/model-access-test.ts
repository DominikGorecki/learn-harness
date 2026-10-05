import { ApplicationError } from '../../shared/contracts'
import { additionalAccountModels } from '../../shared/account'
import { providerFailure } from './provider-errors'
import type { PiProtocolEvidence } from '../generation/pi-protocol-evidence'
import type { PiWorkerTask, WorkerRunOptions } from '../generation/worker-lifecycle'
import type { TransportReason } from '../generation/pi-stream-liveness'
import { observe } from '../generation/observe'

export const solModel = additionalAccountModels[0], lunaModel = additionalAccountModels[1]
type DiagnosticModel = typeof additionalAccountModels[number]
export interface ModelAccessTestDiagnostic extends Omit<PiProtocolEvidence, 'httpStatus'> {
  requestedModel: DiagnosticModel['id']; httpStatus: number | null; outcome: string; elapsedMs: number
}
export function modelMatches(target: DiagnosticModel['id'], actual: string | null): boolean {
  return actual === target || actual !== null && actual.startsWith(target + '-') && /^\d{4}-\d{2}-\d{2}$/.test(actual.slice(target.length + 1))
}
/** Applied to every completion, so a later event cannot repair invalid access proof. */
export function verifyCompletedModelEvidence(model: DiagnosticModel, evidence: PiProtocolEvidence): void {
  const fail = (message: string): never => { throw new ApplicationError('UNAVAILABLE', message + ' ' + model.name + ' access remains unverified. Your model choices have not changed.') }
  if (evidence.responseStatus !== 'completed') fail('The completion event did not report completed status.')
  if (!modelMatches(model.id, evidence.returnedModel)) fail('The completion event ' + (evidence.returnedModel === null ? 'did not identify a model' : evidence.returnedModel === 'unrecognized' ? 'identified an unexpected model' : 'identified ' + evidence.returnedModel) + '.')
  if (!evidence.hasStreamedText && !evidence.hasFinalText) fail('The stream and completion event contained no reply text.')
}
/** Privileged evidence adapter. It neither performs fetch nor accepts a prompt/destination. */
export async function testModelAccess(options: {
  model: DiagnosticModel; signal: AbortSignal; run(callbacks: Pick<WorkerRunOptions, 'onTransport' | 'onModelEvidence'>): PiWorkerTask
  onTransport?: WorkerRunOptions['onTransport']; onEvidence?(evidence: PiProtocolEvidence): void
  onDiagnostic?(diagnostic: ModelAccessTestDiagnostic): void; now?: () => number
  onVerified?(): void
}): Promise<void> {
  const now = options.now ?? (() => performance.now()), started = now()
  const diagnostic: ModelAccessTestDiagnostic = { requestedModel: options.model.id, httpStatus: null, contentType: 'missing', bytes: 0, events: 0,
    textDeltaEvents: 0, completedEvents: 0, hasStreamedText: false, hasFinalText: false, terminalEvent: null, returnedModel: null,
    responseStatus: null, providerCode: null, incompleteReason: null, cleanEof: false, outcome: 'network_error', elapsedMs: 0 }
  let reason: TransportReason | null = null
  try {
    options.signal.throwIfAborted()
    const task = options.run({
      onTransport: state => { diagnostic.bytes = Math.max(diagnostic.bytes, state.bytes); if (state.stage === 'ended') reason = state.reason; observe(() => options.onTransport?.(state)) },
      onModelEvidence: evidence => { Object.assign(diagnostic, evidence, { bytes: Math.max(diagnostic.bytes, evidence.bytes) }); observe(() => options.onEvidence?.(evidence)) }
    })
    const result = await task.result
    if ('kind' in result) throw new ApplicationError('INTERNAL', 'The model test returned an unexpected task result.')
    Object.assign(diagnostic, result)
    options.signal.throwIfAborted()
    if (!result.cleanEof || result.terminalEvent !== 'response.completed' || !result.completedEvents) throw new ApplicationError('UNAVAILABLE', 'The stream ended without a response.completed event.')
    verifyCompletedModelEvidence(options.model, result)
    diagnostic.outcome = 'verified'
    observe(() => options.onVerified?.())
  } catch (error) {
    if (options.signal.aborted) { diagnostic.outcome = 'cancelled'; throw new ApplicationError('CANCELLED', 'Model test cancelled. Your available models have not changed.') }
    if (reason === 'provider-error') diagnostic.outcome = diagnostic.httpStatus !== null && diagnostic.httpStatus >= 400 ? 'http_error' : 'stream_error'
    else if (reason === 'network-idle') diagnostic.outcome = 'network_idle'
    else if (reason === 'response-limit') diagnostic.outcome = 'response_too_large'
    else if (diagnostic.completedEvents && !modelMatches(options.model.id, diagnostic.returnedModel)) diagnostic.outcome = 'model_mismatch'
    else if (diagnostic.terminalEvent === 'response.completed' && diagnostic.responseStatus !== 'completed') diagnostic.outcome = 'unexpected_status'
    else if (diagnostic.completedEvents && !diagnostic.hasStreamedText && !diagnostic.hasFinalText) diagnostic.outcome = 'missing_output'
    else diagnostic.outcome = reason === 'network-idle' ? 'network_idle' : reason === 'response-limit' ? 'response_too_large' : reason === 'invalid-event' ? 'invalid_event' :
      reason === 'incomplete' ? 'incomplete_response' : reason === 'missing-completion' ? 'missing_completion' : reason === 'provider-error' ? diagnostic.httpStatus !== null && diagnostic.httpStatus >= 400 ? 'http_error' : 'stream_error' : 'network_error'
    if (reason === 'provider-error') {
      const failure = providerFailure(diagnostic.httpStatus ?? 0, diagnostic.providerCode ?? undefined)
      throw new ApplicationError(failure.code, (diagnostic.outcome === 'http_error' ? 'The model test returned HTTP ' + diagnostic.httpStatus + '.' : 'The response stream reported an error.') + ' ' + failure.message)
    }
    if (['model_mismatch', 'missing_output'].includes(diagnostic.outcome)) verifyCompletedModelEvidence(options.model, { ...diagnostic, httpStatus: diagnostic.httpStatus ?? 0 })
    if (reason === 'missing-completion') throw new ApplicationError('UNAVAILABLE', 'The stream ended without a response.completed event. Your model access remains unverified.')
    if (error instanceof ApplicationError) throw error
    throw new ApplicationError('NETWORK', 'The model test could not complete. Check your connection and try again.')
  } finally { diagnostic.elapsedMs = Math.max(0, Math.round(now() - started)); observe(() => options.onDiagnostic?.(diagnostic)) }
}
