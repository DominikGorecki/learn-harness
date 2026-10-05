import type { Context, Model, AssistantMessage, AssistantMessageEvent } from '@earendil-works/pi-ai'
import { stream } from '@earendil-works/pi-ai/api/openai-responses'
import { AssistantMessageEventStream } from '@earendil-works/pi-ai/utils/event-stream'
import { normalizeContext } from '@earendil-works/pi-ai/utils/transcript'
import { ApplicationError } from '../../shared/contracts'
import { providerFailure } from '../auth/provider-errors'
import { PiProtocolFailure, PiProtocolObserver, protocolCodes, safeProtocolValue } from './pi-protocol-evidence'
import type { PiProtocolEvidence } from './pi-protocol-evidence'
import { PiStreamLiveness } from './pi-stream-liveness'
import type { MonotonicClock, TransportState, TransportReason } from './pi-stream-liveness'
import { observe } from './observe'

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
/** Whitelist the plan route rather than inherit provider defaults. */
export function planPayload(value: unknown): unknown {
  const data = record(value)
  return { model: data.model, stream: true, store: false,
    input: Array.isArray(data.input) ? data.input.map(value => {
      const item = record(value); return item.role === 'system' ? { ...item, role: 'developer' } : item
    }) : [],
    ...(Array.isArray(data.tools) && data.tools.length ? { tools: [{ type: 'namespace', name: 'learning',
      description: 'Build a learning outline or ask for essential learning context.', tools: data.tools }] } : {}) }
}
export function planEndpoint(baseUrl: string, accessToken: string): URL {
  if (!accessToken || accessToken.startsWith('sk-')) throw new ApplicationError('AUTH_REQUIRED', 'Connect a ChatGPT plan before starting AI work.')
  let endpoint: URL
  try { endpoint = new URL(`${baseUrl.replace(/\/$/, '')}/responses`) } catch { throw new ApplicationError('FORBIDDEN', 'The inference destination is unavailable.') }
  const permitted = endpoint.origin === 'https://api.openai.com' || endpoint.protocol === 'http:' && endpoint.hostname === '127.0.0.1' && Boolean(endpoint.port)
  if (!permitted || endpoint.pathname !== '/v1/responses' || endpoint.search || endpoint.hash || endpoint.username || endpoint.password) throw new ApplicationError('FORBIDDEN', 'The inference destination is unavailable.')
  return endpoint
}
export interface PiTurn {
  stream: AssistantMessageEventStream
  evidence: Promise<PiProtocolEvidence | null>
  readonly failure: ApplicationError | null
  readonly accepted: boolean
}
export interface PiTransportOptions {
  accessToken: string; signal: AbortSignal; turn: number; maximumResponseBytes: number
  request?: typeof fetch; clock?: MonotonicClock; idleMs?: number
  onTransport?(state: TransportState): void
  onRequest?(bytes: number): void
  onResponse?(status: number, elapsedMs: number): void
  onEvidence?(evidence: PiProtocolEvidence): void
}

/** One request, two bounded consumers. Pi success is withheld until the private reader sees clean EOF. */
export function streamPiTurn(model: Model<'openai-responses'>, context: Context, options: PiTransportOptions): PiTurn {
  const endpoint = planEndpoint(model.baseUrl, options.accessToken)
  const controller = new AbortController(), signal = AbortSignal.any([options.signal, controller.signal])
  const output = new AssistantMessageEventStream()
  let failure: ApplicationError | null = null, reason: TransportReason = 'transport-error', accepted = false
  let liveness: PiStreamLiveness | null = null
  let observation: Promise<PiProtocolEvidence | null> = Promise.resolve(null)
  let pump: Promise<void> = Promise.resolve()
  let rawReader: ReadableStreamDefaultReader<Uint8Array> | null = null
  let privateReader: ReadableStreamDefaultReader<Uint8Array> | null = null
  let bodyController: ReadableStreamDefaultController<Uint8Array> | null = null
  let cancellation: Promise<void> | null = null
  let observer: PiProtocolObserver | null = null
  let httpRejection = false
  const now = () => options.clock?.now() ?? performance.now()
  const fail = (error: ApplicationError, why: TransportReason) => { if (!failure) { failure = error; reason = why } }
  const cancelReaders = (): Promise<void> => {
    if (!rawReader && !privateReader && !bodyController) return Promise.resolve()
    if (!cancellation) {
      try { bodyController?.error(signal.reason) } catch { /* Already closed/errored. */ }
      // Start every cancellation before waiting: a single tee cancellation can await its sibling.
      cancellation = Promise.allSettled([rawReader?.cancel(), privateReader?.cancel()]).then(() => {})
    }
    return cancellation
  }
  const abort = () => {
    if (options.signal.aborted) fail(new ApplicationError('CANCELLED', 'AI work cancelled. Your previous work is unchanged.'), 'cancelled')
    void cancelReaders()
  }
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) abort()
  const request: typeof fetch = async (url, init) => {
    if (String(url) !== endpoint.href) throw new ApplicationError('FORBIDDEN', 'The inference destination is unavailable.')
    liveness = new PiStreamLiveness({ turn: options.turn, clock: options.clock, idleMs: options.idleMs,
      onState: state => observe(() => options.onTransport?.(state)), onIdle: () => {
        fail(new PiProtocolFailure('network-idle', 'NETWORK', 'The provider stopped sending data. Your previous work is unchanged; try again.'), 'network-idle')
        controller.abort()
      } })
    if (typeof init?.body !== 'string' || Buffer.byteLength(init.body) > 4 * 1024 * 1024) {
      const error = new PiProtocolFailure('request-limit', 'UNAVAILABLE', 'The provider request exceeded its size limit. Try a smaller request.')
      fail(error, error.reason); throw error
    }
    const started = now()
    observe(() => options.onRequest?.(Buffer.byteLength(init.body as string)))
    const response = await (options.request ?? fetch)(url, { ...init, signal: AbortSignal.any([signal, ...(init.signal ? [init.signal] : [])]), redirect: 'error' })
    if (signal.aborted) { await response.body?.cancel().catch(() => {}); signal.throwIfAborted() }
    liveness.headers(); observe(() => options.onResponse?.(response.status, Math.max(0, Math.round(now() - started))))
    if (signal.aborted) { await response.body?.cancel().catch(() => {}); signal.throwIfAborted() }
    observer = new PiProtocolObserver(response, options.maximumResponseBytes, semantic => liveness?.event(semantic))
    if (!response.body) {
      const error = response.ok ? new PiProtocolFailure('missing-completion', 'UNAVAILABLE', 'The provider returned no response body. Try again.') : providerFailure(response.status)
      fail(error, response.ok ? 'missing-completion' : 'provider-error')
      return response
    }
    rawReader = response.body.getReader()
    let countedBytes = 0
    const bounded = new ReadableStream<Uint8Array>({
      start(destination) {
        bodyController = destination
        // An eager bounded pump makes liveness independent of SDK/renderer consumption. At most
        // the existing response budget can be buffered on a slow tee branch, never an unbounded transcript.
        pump = (async () => {
          try {
            while (!signal.aborted) {
              const value = await rawReader!.read()
              if (signal.aborted) break
              if (value.done) { destination.close(); return }
              liveness?.received(value.value.byteLength); countedBytes += value.value.byteLength
              const maximum = response.ok ? options.maximumResponseBytes : Math.min(options.maximumResponseBytes, 64 * 1024)
              if (countedBytes > maximum) throw new PiProtocolFailure('response-limit', 'UNAVAILABLE', 'The provider response exceeded its size limit. Try a smaller request.')
              destination.enqueue(value.value)
            }
          } catch (error) {
            if (error instanceof PiProtocolFailure) fail(error, error.reason)
            else if (!signal.aborted) fail(new ApplicationError('NETWORK', 'The provider connection could not finish. Try again.'), 'transport-error')
            try { destination.error(error) } catch { /* Already cancelled. */ }
            controller.abort(); await cancelReaders()
          } finally {
            try { rawReader?.releaseLock() } catch { /* Cleanup below awaits pending reads. */ }
          }
        })()
      }, cancel: () => rawReader?.cancel()
    })
    if (!response.ok) {
      httpRejection = true
      privateReader = bounded.getReader()
      observation = (async () => {
        const pieces: Uint8Array[] = []
        while (true) { const value = await privateReader!.read(); if (value.done) break; pieces.push(value.value) }
        let code: string | undefined
        try { const error = record(JSON.parse(Buffer.concat(pieces).toString('utf8'))).error; code = typeof error === 'string' ? error : typeof record(error).code === 'string' ? record(error).code as string : undefined } catch { /* Status still safely classifies rejection. */ }
        observer!.evidence.bytes = countedBytes; observer!.evidence.providerCode = safeProtocolValue(code, protocolCodes)
        fail(providerFailure(response.status, code), 'provider-error'); return null
      })().catch(error => { if (error instanceof PiProtocolFailure) fail(error, error.reason); return null }).finally(() => { privateReader?.releaseLock() })
      // Return headers immediately so the SDK's finite header timer cannot become a body deadline.
      return new Response(JSON.stringify({ error: { message: 'Provider request failed.' } }), { status: response.status, headers: { 'content-type': 'application/json' } })
    }
    const [sdkBody, privateBody] = bounded.tee()
    privateReader = privateBody.getReader()
    observation = (async () => {
      while (true) {
        const value = await privateReader!.read()
        if (value.done) return observer!.eof()
        observer!.chunk(value.value)
      }
    })().catch(error => {
      if (error instanceof PiProtocolFailure) fail(error, error.reason)
      else if (!signal.aborted) fail(new ApplicationError('NETWORK', 'The provider connection could not finish. Try again.'), 'transport-error')
      controller.abort(); return null
    }).finally(() => { privateReader?.releaseLock() })
    return new Response(sdkBody, { status: response.status, statusText: response.statusText, headers: response.headers })
  }
  const source = stream(model, normalizeContext(context), { apiKey: options.accessToken, signal, cacheRetention: 'none',
    maxRetries: 0, onPayload: planPayload, fetch: request })
  let resolveEvidence!: (value: PiProtocolEvidence | null) => void
  const evidence = new Promise<PiProtocolEvidence | null>(resolve => { resolveEvidence = resolve })
  void (async () => {
    let terminalEvent: AssistantMessageEvent | null = null
    let observedResult: PiProtocolEvidence | null = null
    try {
      for await (const event of source) {
        if (event.type !== 'done' && event.type !== 'error') { output.push(event); continue }
        const terminal: AssistantMessage = event.type === 'done' ? event.message : event.error
        if (event.type === 'error' && !httpRejection) {
          if (!failure) fail(new ApplicationError('NETWORK', 'The provider connection could not finish. Try again.'), 'transport-error')
          controller.abort(); await cancelReaders()
        }
        const observed = await observation
        observedResult = observed
        await pump
        if (event.type === 'error' && !failure) fail(new ApplicationError('NETWORK', 'The provider connection could not finish. Try again.'), 'transport-error')
        if (!observed && !failure) fail(new PiProtocolFailure('missing-completion', 'UNAVAILABLE', 'The stream ended without a completed response. Try again.'), 'missing-completion')
        if (signal.aborted && !failure) fail(new ApplicationError('CANCELLED', 'AI work cancelled. Your previous work is unchanged.'), 'cancelled')
        if (failure) {
          terminalEvent = { type: 'error', reason: options.signal.aborted ? 'aborted' : 'error', error: { ...terminal, stopReason: options.signal.aborted ? 'aborted' : 'error', errorMessage: (failure as ApplicationError).message } }
        } else { accepted = true; terminalEvent = event }
        return
      }
    } finally {
      // All terminal paths await every owned consumer; no old turn survives into local tools/new admission.
      if (!accepted) { controller.abort(); await cancelReaders() }
      await Promise.allSettled([pump, observation, source.result()])
      signal.removeEventListener('abort', abort)
      const finalLiveness = liveness as PiStreamLiveness | null
      finalLiveness?.stop(accepted ? 'completed' : reason)
      if (terminalEvent) output.push(terminalEvent)
      const finalObserver = observer as PiProtocolObserver | null
      const finalEvidence = observedResult ?? (finalObserver ? { ...finalObserver.evidence } : null)
      if (finalEvidence) observe(() => options.onEvidence?.(finalEvidence))
      output.end(); resolveEvidence(finalEvidence)
    }
  })()
  return { stream: output, evidence, get failure() { return failure }, get accepted() { return accepted } }
}
