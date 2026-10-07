import { randomUUID } from 'node:crypto'
import { ApplicationError } from '../../shared/contracts'
import type { ErrorCode } from '../../shared/contracts'
import { openRouterPolicy, parseOpenRouterGenerationId, parseOpenRouterImageModel } from '../../shared/openrouter'
import type { OpenRouterCallPurpose, OpenRouterEndpoint, OpenRouterImageModelId } from '../../shared/openrouter'
import type { OpenRouterLedger } from './ledger'
import { parseProviderJson } from './money'

export interface ProviderCredential { key: string; epoch: string }
export interface MetadataRequest { endpoint: Exclude<OpenRouterEndpoint, 'images'>; purpose: Exclude<OpenRouterCallPurpose, 'chapter-image' | 'image-replacement'>; modelId?: OpenRouterImageModelId; generationId?: string }
const category = (status: number): ErrorCode => status === 401 ? 'AUTH_REQUIRED' : status === 403 ? 'ACCESS_RESTRICTED' : status === 402 || status === 429 ? 'USAGE_LIMIT' : 'NETWORK'
const message = (status: number): string => status === 401 ? 'OpenRouter rejected this key. Replace it with a valid ordinary inference key.' : status === 403 ? 'OpenRouter restricted this request. Review the key permissions and provider access.' : status === 402 ? 'The OpenRouter key allowance or account credits are exhausted.' : status === 429 ? 'OpenRouter is rate limited. Wait before explicitly retrying.' : 'OpenRouter could not be reached. Check the connection and explicitly refresh.'
export function openRouterBaseUrl(fixture?: { baseUrl: string; isPackaged: boolean; isolatedProfile: boolean }): string {
  if (!fixture) return openRouterPolicy.baseUrl
  const url = new URL(fixture.baseUrl)
  if (fixture.isPackaged || !fixture.isolatedProfile || url.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(url.hostname) || !url.port || url.username || url.password || url.search || url.hash || url.pathname !== '/api/v1') throw new ApplicationError('FORBIDDEN', 'Provider fixtures require an unpackaged isolated loopback profile.')
  return url.href
}
export function createOpenRouterGateway(ledger: OpenRouterLedger, options: { now?: () => string; createId?: () => string; fetch?: typeof fetch; fixture?: Parameters<typeof openRouterBaseUrl>[0]; timeoutMs?: number } = {}) {
  const baseUrl = openRouterBaseUrl(options.fixture), now = options.now ?? (() => new Date().toISOString()), fetcher = options.fetch ?? fetch, createId = options.createId ?? randomUUID
  const active = new Set<AbortController>(); let disposed = false
  const pending = new Set<Promise<unknown>>()
  async function request(credential: ProviderCredential, request: MetadataRequest, signal?: AbortSignal): Promise<unknown> {
      let path: string
      switch (request.endpoint) {
        case 'key': path = '/key'; break
        case 'image-models': path = '/images/models'; break
        case 'image-model-endpoints': path = `/images/models/${parseOpenRouterImageModel(request.modelId)}/endpoints`; break
        case 'generation': path = '/generation?id=' + encodeURIComponent(parseOpenRouterGenerationId(request.generationId)); break
      }
      if (disposed || signal?.aborted) throw new ApplicationError('CANCELLED', 'Provider request cancelled.')
      const callId = createId()
      await ledger.intent({ schemaVersion: 1, id: callId, startedAt: now(), connectionEpoch: credential.epoch, endpoint: request.endpoint, purpose: request.purpose, modelId: request.modelId ?? null, operationId: null, runId: null, context: null, estimate: { kind: 'unknown', reason: 'Non-inference metadata request.' } })
      const controller = new AbortController(); active.add(controller)
      const cancel = () => controller.abort(); signal?.addEventListener('abort', cancel, { once: true })
      let timedOut = false
      const timer = setTimeout(() => { timedOut = true; cancel() }, options.timeoutMs ?? openRouterPolicy.metadataTimeoutMs)
      let httpStatus: number | null = null, result: unknown, failure: ApplicationError | null = null
      try {
        if (disposed || signal?.aborted) controller.abort()
        controller.signal.throwIfAborted()
        const response = await fetcher(baseUrl + path, { method: 'GET', headers: { Authorization: `Bearer ${credential.key}` }, redirect: 'manual', signal: controller.signal })
        httpStatus = response.status
        if (!response.ok || response.status >= 300 && response.status < 400) { await response.body?.cancel(); throw new ApplicationError(category(response.status), message(response.status)) }
        if (Number(response.headers.get('content-length')) > openRouterPolicy.metadataBytes) { await response.body?.cancel(); throw new ApplicationError('UNAVAILABLE', 'Provider metadata exceeds its size limit.') }
        const reader = response.body?.getReader(); if (!reader) throw new ApplicationError('NETWORK', 'Provider metadata response was empty.')
        const chunks: Uint8Array[] = []; let length = 0
        try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.byteLength; if (length > openRouterPolicy.metadataBytes) throw new ApplicationError('UNAVAILABLE', 'Provider metadata exceeds its size limit.'); chunks.push(chunk.value) } }
        finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
        controller.signal.throwIfAborted()
        result = parseProviderJson(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))
      } catch (error) { failure = timedOut && !disposed && !signal?.aborted ? new ApplicationError('NETWORK', 'OpenRouter metadata timed out. Explicitly refresh when the connection is available.') : controller.signal.aborted ? new ApplicationError('CANCELLED', 'Provider request cancelled.') : error instanceof ApplicationError ? error : new ApplicationError('NETWORK', 'OpenRouter could not be reached. Check the connection and explicitly refresh.') }
      finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); active.delete(controller) }
      // Required durable accounting, not best-effort diagnostics. No replay on terminal failure.
      await ledger.transition(callId, { recordedAt: now(), status: failure?.code === 'CANCELLED' ? 'cancelled' : failure ? 'failed' : 'succeeded', httpStatus, errorCode: failure?.code ?? null, generationId: null, returnedModelId: null, cost: { kind: 'known', usd: '0', source: 'non-inference-contract', recordedAt: now() }, disposition: 'none' })
      if (failure) throw failure
      return result
  }
  return {
    baseUrl,
    request(credential: ProviderCredential, input: MetadataRequest, signal?: AbortSignal): Promise<unknown> {
      const task = request(credential, input, signal); pending.add(task)
      void task.finally(() => pending.delete(task)).catch(() => {})
      return task
    },
    async dispose(): Promise<void> { disposed = true; for (const controller of active) controller.abort(); await Promise.allSettled([...pending]) }
  }
}
export type OpenRouterGateway = ReturnType<typeof createOpenRouterGateway>
