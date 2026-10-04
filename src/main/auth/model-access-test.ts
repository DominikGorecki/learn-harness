import { ApplicationError } from '../../shared/contracts'
import { providerFailure } from './provider-errors'
import { additionalAccountModels } from '../../shared/account'

// A diagnostic target, never evidence of availability by itself.
export const solModel = additionalAccountModels[0]
export const lunaModel = additionalAccountModels[1]
type DiagnosticModel = typeof additionalAccountModels[number]

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
function errorCode(value: unknown): string | undefined {
  return typeof value === 'string' ? value : typeof record(value).code === 'string' ? record(value).code as string : undefined
}
export interface ModelAccessTestDiagnostic {
  requestedModel: DiagnosticModel['id']
  httpStatus: number | null
  contentType: 'sse' | 'json' | 'other' | 'missing'
  bytes: number
  events: number
  textDeltaEvents: number
  completedEvents: number
  hasStreamedText: boolean
  hasFinalText: boolean
  terminalEvent: 'response.completed' | 'response.incomplete' | 'response.failed' | 'error' | null
  returnedModel: string | null
  responseStatus: string | null
  providerCode: string | null
  incompleteReason: string | null
  outcome: string
  elapsedMs: number
}

// Only known protocol values enter diagnostics; arbitrary provider strings never do.
function known(value: unknown, choices: readonly string[]): string | null {
  return value == null ? null : typeof value === 'string' && choices.includes(value) ? value : 'unrecognized'
}
function diagnosticModel(value: unknown): string | null {
  if (value == null) return null
  return typeof value === 'string' && /^gpt-(?:5\.5|5\.6-(?:sol|terra|luna)|6(?:\.1)?-(?:sol|astra|luna))(?:-\d{4}-\d{2}-\d{2})?$/.test(value) ? value : 'unrecognized'
}

/** One tiny, bounded request. Never sends project material or exposes provider output. */
export async function testModelAccess(options: {
  resource: string; accessToken: string; signal: AbortSignal; request: typeof fetch
  model: DiagnosticModel
  onDiagnostic?: (diagnostic: ModelAccessTestDiagnostic) => void
}): Promise<void> {
  const model = options.model
  const signal = AbortSignal.any([options.signal, AbortSignal.timeout(30_000)])
  const started = Date.now()
  const diagnostic: ModelAccessTestDiagnostic = {
    requestedModel: model.id, httpStatus: null, contentType: 'missing', bytes: 0,
    events: 0, textDeltaEvents: 0, completedEvents: 0, hasStreamedText: false, hasFinalText: false, terminalEvent: null,
    returnedModel: null, responseStatus: null, providerCode: null, incompleteReason: null,
    outcome: 'network_error', elapsedMs: 0
  }
  const unverified = (reason: string, message: string) => {
    diagnostic.outcome = reason
    return new ApplicationError('UNAVAILABLE', `${message} ${model.name} access remains unverified. Your model choices have not changed.`)
  }
  const rejection = (status: number, code: string | undefined, stream = false) => {
    diagnostic.outcome = stream ? 'stream_error' : 'http_error'
    diagnostic.providerCode = known(code, ['invalid_grant', 'invalid_token', 'model_not_found',
      'subscription_sharing_unsupported_capability', 'subscription_sharing_usage_limit_exceeded', 'subscription_sharing_usage_unavailable'])
    const failure = providerFailure(status, code)
    return new ApplicationError(failure.code, `${stream ? 'The response stream reported an error.' : `The model test returned HTTP ${status}.`} ${failure.message}`)
  }
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  try {
    const response = await options.request(`${options.resource}/responses`, {
      method: 'POST', redirect: 'error', signal,
      headers: { authorization: `Bearer ${options.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: model.id, input: [{ role: 'user', content: 'Reply with exactly OK.' }], store: false, stream: true })
    })
    diagnostic.httpStatus = response.status
    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
    diagnostic.contentType = !contentType ? 'missing' : contentType === 'text/event-stream' ? 'sse' : contentType === 'application/json' ? 'json' : 'other'
    if (!response.body) throw response.ok ? unverified('missing_body', 'The server returned no response body.') : rejection(response.status, undefined)
    reader = response.body.getReader()
    const decoder = new TextDecoder()
    let bytes = 0, pending = '', completed = false
    const consume = (frame: string) => {
      const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
      if (!data || data === '[DONE]') return
      let event: Record<string, unknown>
      try { event = record(JSON.parse(data)) } catch {
        diagnostic.outcome = 'invalid_event'
        throw new ApplicationError('NETWORK', 'The model test received an unreadable stream event. Try again.')
      }
      diagnostic.events++
      if (event.type === 'response.output_text.delta') {
        diagnostic.textDeltaEvents++
        // Some plan streams deliver the reply only in deltas, without repeating it in response.output.
        // Retain evidence of nonempty text, never the reply itself.
        if (typeof event.delta === 'string' && event.delta.trim()) diagnostic.hasStreamedText = true
      }
      const result = record(event.response)
      if (event.type === 'response.failed' || event.type === 'error' || event.type === 'response.incomplete' || event.type === 'response.completed') {
        diagnostic.terminalEvent = event.type
        diagnostic.returnedModel = diagnosticModel(result.model)
        diagnostic.responseStatus = known(result.status, ['queued', 'in_progress', 'completed', 'failed', 'incomplete', 'cancelled'])
      }
      if (event.type === 'response.failed' || event.type === 'error') throw rejection(400, errorCode(result.error ?? event.error ?? event), true)
      if (event.type === 'response.incomplete') {
        diagnostic.incompleteReason = known(record(result.incomplete_details).reason, ['max_output_tokens', 'content_filter'])
        throw unverified('incomplete_response', 'The server reported an incomplete response.')
      }
      if (event.type === 'response.completed') {
        diagnostic.completedEvents++
        const returnedModel = result.model
        const matching = typeof returnedModel === 'string' && (returnedModel === model.id || returnedModel.startsWith(`${model.id}-`))
        const output = Array.isArray(result.output) ? result.output : []
        const hasText = output.some(value => {
          const item = record(value)
          return item.type === 'message' && Array.isArray(item.content) && item.content.some(value => {
            const content = record(value)
            return content.type === 'output_text' && typeof content.text === 'string' && Boolean(content.text.trim())
          })
        })
        diagnostic.hasFinalText = hasText
        if (result.status !== 'completed') throw unverified('unexpected_status', 'The completion event did not report completed status.')
        if (!matching) throw unverified('model_mismatch', `The completion event ${diagnostic.returnedModel === null ? 'did not identify a model' : diagnostic.returnedModel === 'unrecognized' ? 'identified an unexpected model' : `identified ${diagnostic.returnedModel}`}.`)
        if (!hasText && !diagnostic.hasStreamedText) throw unverified('missing_output', 'The stream and completion event contained no reply text.')
        completed = true
      }
    }
    while (true) {
      signal.throwIfAborted()
      const chunk = await reader.read()
      if (chunk.done) break
      bytes += chunk.value.byteLength
      diagnostic.bytes = bytes
      if (bytes > 256 * 1024) throw unverified('response_too_large', 'The response exceeded the diagnostic size limit.')
      pending += decoder.decode(chunk.value, { stream: true })
      if (!response.ok) continue
      let boundary: RegExpExecArray | null
      while ((boundary = /\r?\n\r?\n/.exec(pending))) {
        consume(pending.slice(0, boundary.index))
        pending = pending.slice(boundary.index + boundary[0].length)
      }
    }
    pending += decoder.decode()
    if (!response.ok) {
      let code: string | undefined
      try { code = errorCode(record(JSON.parse(pending)).error) } catch { /* Classify HTTP failures without exposing raw text. */ }
      throw rejection(response.status, code)
    }
    if (pending.trim()) consume(pending)
    if (!completed) throw unverified('missing_completion', 'The stream ended without a response.completed event.')
    signal.throwIfAborted()
    diagnostic.outcome = 'verified'
  } catch (error) {
    if (options.signal.aborted) {
      diagnostic.outcome = 'cancelled'
      throw new ApplicationError('CANCELLED', 'Model test cancelled. Your available models have not changed.')
    }
    if (signal.aborted) {
      diagnostic.outcome = 'timeout'
      throw new ApplicationError('NETWORK', `The model test timed out after 30 seconds. ${model.name} access remains unverified; try again.`)
    }
    if (error instanceof ApplicationError) throw error
    throw new ApplicationError('NETWORK', 'The model test could not complete. Check your connection and try again.')
  } finally {
    await reader?.cancel().catch(() => {})
    reader?.releaseLock()
    diagnostic.elapsedMs = Date.now() - started
    try { options.onDiagnostic?.(diagnostic) } catch { /* Logging cannot change verification. */ }
  }
}
