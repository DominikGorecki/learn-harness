import { ApplicationError } from '../../shared/contracts'
import { providerFailure } from '../auth/provider-errors'
import type { TransportReason } from './pi-stream-liveness'

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
export interface PiProtocolEvidence {
  httpStatus: number; contentType: 'sse' | 'json' | 'other' | 'missing'; bytes: number; events: number
  textDeltaEvents: number; completedEvents: number; hasStreamedText: boolean; hasFinalText: boolean
  terminalEvent: 'response.completed' | 'response.incomplete' | 'response.failed' | 'error' | null
  returnedModel: string | null; responseStatus: string | null; providerCode: string | null; incompleteReason: string | null
  cleanEof: boolean
}
export const protocolStatuses = ['queued', 'in_progress', 'completed', 'failed', 'incomplete', 'cancelled'] as const
export const protocolCodes = ['invalid_grant', 'invalid_token', 'model_not_found', 'subscription_sharing_unsupported_capability',
  'subscription_sharing_usage_limit_exceeded', 'subscription_sharing_usage_unavailable'] as const
export function safeProtocolValue(value: unknown, values: readonly string[]): string | null {
  return value == null ? null : typeof value === 'string' && values.includes(value) ? value : 'unrecognized'
}
export function safeReturnedModel(value: unknown): string | null {
  return value == null ? null : typeof value === 'string' && /^gpt-(?:5\.5|5\.6-(?:sol|terra|luna)|6(?:\.1)?-(?:sol|astra|luna))(?:-\d{4}-\d{2}-\d{2})?$/.test(value) ? value : 'unrecognized'
}
export class PiProtocolFailure extends ApplicationError {
  constructor(readonly reason: TransportReason, code: ApplicationError['code'], message: string) { super(code, message) }
}

/** A bounded private reducer, not a transcript. Completion sentinels never terminate observation. */
export class PiProtocolObserver {
  readonly evidence: PiProtocolEvidence
  private readonly decoder = new TextDecoder('utf-8', { fatal: true })
  private pending = ''
  private data: string[] = []
  private eventName = ''
  private frameCharacters = 0
  constructor(response: Response, private readonly maximumBytes: number, private readonly onEvent?: (semantic: boolean) => void) {
    const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
    this.evidence = { httpStatus: response.status, contentType: !type ? 'missing' : type === 'text/event-stream' ? 'sse' : type === 'application/json' ? 'json' : 'other',
      bytes: 0, events: 0, textDeltaEvents: 0, completedEvents: 0, hasStreamedText: false, hasFinalText: false,
      terminalEvent: null, returnedModel: null, responseStatus: null, providerCode: null, incompleteReason: null, cleanEof: false }
  }
  chunk(value: Uint8Array): void {
    this.evidence.bytes += value.byteLength
    if (this.evidence.bytes > this.maximumBytes) throw new PiProtocolFailure('response-limit', 'UNAVAILABLE', 'The provider response exceeded its size limit. Try a smaller request.')
    try { this.pending += this.decoder.decode(value, { stream: true }) } catch { this.invalid() }
    this.lines(false)
  }
  eof(): PiProtocolEvidence {
    try { this.pending += this.decoder.decode() } catch { this.invalid() }
    this.lines(true)
    if (this.pending) { this.line(this.pending); this.pending = '' }
    this.frame()
    if (!this.evidence.completedEvents || this.evidence.responseStatus !== 'completed') {
      throw new PiProtocolFailure('missing-completion', 'UNAVAILABLE', 'The stream ended without a completed response. Try again.')
    }
    this.evidence.cleanEof = true
    return { ...this.evidence }
  }
  private invalid(): never { throw new PiProtocolFailure('invalid-event', 'NETWORK', 'The provider returned an unreadable stream event. Try again.') }
  private lines(eof: boolean): void {
    let match: RegExpExecArray | null
    while ((match = /\r\n|\r|\n/.exec(this.pending))) {
      if (!eof && match[0] === '\r' && match.index === this.pending.length - 1) break
      this.line(this.pending.slice(0, match.index)); this.pending = this.pending.slice(match.index + match[0].length)
    }
  }
  private line(line: string): void {
    if (!line) { this.frame(); return }
    if (line.startsWith(':')) return
    this.frameCharacters += line.length
    if (this.frameCharacters > this.maximumBytes) this.invalid()
    const separator = line.indexOf(':')
    const key = separator < 0 ? line : line.slice(0, separator)
    let value = separator < 0 ? '' : line.slice(separator + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (key === 'data') this.data.push(value)
    else if (key === 'event') this.eventName = value
    else if (key !== 'id' && key !== 'retry') this.invalid()
  }
  private frame(): void {
    const data = this.data.join('\n'), name = this.eventName
    this.data = []; this.eventName = ''; this.frameCharacters = 0
    if (!data || data === '[DONE]') return
    let event: Record<string, unknown>
    try { const value: unknown = JSON.parse(data); event = record(value); if (!Object.keys(event).length) this.invalid() } catch { this.invalid() }
    this.evidence.events++
    const type = event.type
    if (name !== 'error' && !event.error && (typeof type !== 'string' || !type || type.length > 128)) this.invalid()
    this.onEvent?.(type === 'response.output_text.delta' || type === 'response.function_call_arguments.delta' || type === 'response.output_item.done')
    if (type === 'response.output_text.delta') {
      this.evidence.textDeltaEvents++
      if (typeof event.delta === 'string' && event.delta.trim()) this.evidence.hasStreamedText = true
    }
    const response = record(event.response)
    if (['response.completed', 'response.incomplete', 'response.failed', 'error'].includes(String(type)) || name === 'error' || event.error) {
      this.evidence.terminalEvent = name === 'error' || event.error ? 'error' : type as PiProtocolEvidence['terminalEvent']
      this.evidence.returnedModel = safeReturnedModel(response.model)
      this.evidence.responseStatus = safeProtocolValue(response.status, protocolStatuses)
    }
    if (type === 'response.failed' || type === 'error' || name === 'error' || event.error) {
      const error = response.error ?? event.error ?? event
      const code = typeof error === 'string' ? error : typeof record(error).code === 'string' ? record(error).code as string : undefined
      this.evidence.providerCode = safeProtocolValue(code, protocolCodes)
      const failure = providerFailure(0, code)
      throw new PiProtocolFailure('provider-error', failure.code, failure.message)
    }
    if (type === 'response.incomplete') {
      this.evidence.incompleteReason = safeProtocolValue(record(response.incomplete_details).reason, ['max_output_tokens', 'content_filter'])
      throw new PiProtocolFailure('incomplete', 'UNAVAILABLE', 'The provider returned an incomplete response. Try again.')
    }
    if (type === 'response.completed') {
      this.evidence.completedEvents++
      if (response.status !== 'completed') throw new PiProtocolFailure('incomplete', 'UNAVAILABLE', 'The completion did not report completed status. Try again.')
      this.evidence.hasFinalText ||= (Array.isArray(response.output) ? response.output : []).some(value => {
        const item = record(value)
        return item.type === 'message' && Array.isArray(item.content) && item.content.some(value => {
          const part = record(value); return part.type === 'output_text' && typeof part.text === 'string' && Boolean(part.text.trim())
        })
      })
    }
  }
}
