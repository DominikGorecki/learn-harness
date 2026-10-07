import { createModels, createProvider } from '@earendil-works/pi-ai'
import type { AssistantImages, ImageModel } from '@earendil-works/pi-ai'
import { ApplicationError } from '../../shared/contracts'
import { openRouterPolicy, parseOpenRouterGenerationId, parseOpenRouterImageModel, parseUsdDecimal } from '../../shared/openrouter'
import { parseProviderJson } from '../openrouter/money'
import { ImageResponseLiveness } from './image-response-liveness'
import { decodeImage } from './image-decoder'
import { parseImageAuthorization } from './image-worker-contract'
import type { DecodedImage, ImageAuthorization, ImageTerminal } from './image-worker-contract'
import type { MonotonicClock, TransportState } from './pi-stream-liveness'

const api = 'learning-openrouter-images'
const category = (status: number) => status === 401 ? 'AUTH_REQUIRED' : status === 403 ? 'ACCESS_RESTRICTED' : status === 402 || status === 429 ? 'USAGE_LIMIT' : 'NETWORK'
/** One authorized image, no ambient credentials, discovery, retries or fallback routes. */
export async function runImageProfile(input: ImageAuthorization, options: {
  signal: AbortSignal; onTerminal(terminal: ImageTerminal): Promise<void>;
  onTransport?(state: TransportState): void; fetch?: typeof fetch; clock?: MonotonicClock
}): Promise<DecodedImage> {
  const authority = parseImageAuthorization(input)
  const model: ImageModel<typeof api> = { type: 'image', id: authority.modelId, name: authority.modelId, api, provider: api, baseUrl: authority.baseUrl,
    input: ['text'], output: ['image'], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }
  let invoked = false, raster: Uint8Array | null = null, mediaType: unknown, failure: ApplicationError | null = null, terminalPersisted = false
  const generateImages = async (): Promise<AssistantImages> => {
    if (invoked) throw new ApplicationError('FORBIDDEN', 'The image slot was already dispatched.')
    invoked = true
    const controller = new AbortController(), cancel = () => controller.abort()
    options.signal.addEventListener('abort', cancel, { once: true })
    let timedOut = false, httpStatus: number | null = null
    const terminal: ImageTerminal = { status: 'failed', httpStatus: null, errorCode: 'NETWORK', generationId: null, returnedModelId: null, cost: { kind: 'unknown' } }
    const liveness = new ImageResponseLiveness({ clock: options.clock, onState: options.onTransport, onTimeout: () => { timedOut = true; controller.abort() } })
    try {
      if (options.signal.aborted) controller.abort()
      controller.signal.throwIfAborted()
      const settings = authority.settings
      const response = await (options.fetch ?? fetch)(authority.baseUrl + '/images', { method: 'POST', redirect: 'manual', signal: controller.signal,
        headers: { Authorization: `Bearer ${authority.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: authority.modelId, prompt: authority.prompt, n: 1, aspect_ratio: settings.aspectRatio,
          ...(settings.resolution ? { resolution: settings.resolution } : {}), ...(settings.format ? { output_format: settings.format } : {}), ...(settings.quality ? { quality: settings.quality } : {}), ...(authority.provider ? { provider: authority.provider } : {}) }) })
      httpStatus = response.status
      if (Number(response.headers.get('content-length')) > openRouterPolicy.imageResponseBytes) { await response.body?.cancel(); throw new ApplicationError('UNAVAILABLE', 'The illustration response exceeded its size limit.') }
      const reader = response.body?.getReader()
      if (!reader) throw new ApplicationError('NETWORK', 'The image response was empty.')
      const chunks: Uint8Array[] = []; let size = 0
      try {
        for (;;) {
          const chunk = await reader.read(); if (chunk.done) break
          if (!chunk.value.byteLength) continue
          size += chunk.value.byteLength; liveness.received(chunk.value.byteLength)
          if (size > openRouterPolicy.imageResponseBytes) throw new ApplicationError('UNAVAILABLE', 'The illustration response exceeded its size limit.')
          chunks.push(chunk.value)
        }
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
      // Clean EOF ends all network timers before parsing, accounting or decoding.
      liveness.end('completed')
      const payload = parseProviderJson(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)), true) as Record<string, unknown>
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new ApplicationError('UNAVAILABLE', 'The image response was invalid.')
      const usage = payload.usage as Record<string, unknown> | undefined
      try { if (usage?.cost !== undefined) terminal.cost = { kind: 'known', usd: parseUsdDecimal(usage.cost), source: 'response', recordedAt: new Date().toISOString() } } catch { /* Unrepresentable cost stays unknown. */ }
      try { if (payload.id !== undefined) terminal.generationId = parseOpenRouterGenerationId(payload.id) } catch { /* Local/request IDs do not authorize reconciliation. */ }
      try { if (payload.model !== undefined) terminal.returnedModelId = parseOpenRouterImageModel(payload.model) } catch { /* Unrecognized model remains unavailable. */ }
      if (!response.ok) throw new ApplicationError(category(response.status), 'OpenRouter rejected the image request.')
      if (payload.model !== undefined && payload.model !== authority.modelId) throw new ApplicationError('UNAVAILABLE', 'OpenRouter returned a different image model.')
      if (!Array.isArray(payload.data) || payload.data.length !== 1) throw new ApplicationError('UNAVAILABLE', 'OpenRouter returned an invalid image count.')
      const image = payload.data[0] as Record<string, unknown>, encoded = image?.b64_json
      if (typeof encoded !== 'string' || !encoded.length || encoded.length > Math.ceil(16 * 1024 * 1024 / 3) * 4 || encoded.length % 4 || /[^A-Za-z0-9+/=]/.test(encoded) || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new ApplicationError('UNAVAILABLE', 'OpenRouter returned invalid image bytes.')
      raster = Buffer.from(encoded, 'base64')
      if (Buffer.from(raster).toString('base64') !== encoded) throw new ApplicationError('UNAVAILABLE', 'OpenRouter returned invalid image bytes.')
      mediaType = image.media_type
      if (image.media_type !== undefined && !['image/png', 'image/jpeg', 'image/webp'].includes(image.media_type as string)) throw new ApplicationError('UNAVAILABLE', 'OpenRouter returned unsupported image media.')
      terminal.status = 'succeeded'; terminal.errorCode = null
    } catch (error) {
      failure = timedOut ? new ApplicationError('NETWORK', 'OpenRouter stopped sending image bytes.') : options.signal.aborted ? new ApplicationError('CANCELLED', 'Image generation cancelled.') : httpStatus !== null && (httpStatus < 200 || httpStatus >= 300) ? new ApplicationError(category(httpStatus), 'OpenRouter rejected the image request.') : error instanceof ApplicationError ? error : error instanceof SyntaxError ? new ApplicationError('UNAVAILABLE', 'OpenRouter returned an incomplete or invalid image response.') : new ApplicationError('NETWORK', 'OpenRouter image transport failed.')
      terminal.status = failure.code === 'CANCELLED' ? 'cancelled' : 'failed'; terminal.errorCode = failure.code
    } finally { terminal.httpStatus = httpStatus; liveness.end(failure?.code === 'CANCELLED' ? 'cancelled' : failure ? 'transport-error' : 'completed'); options.signal.removeEventListener('abort', cancel) }
    // Even local cancellation/rejection must retain any known billing before pixel work.
    await options.onTerminal(terminal); terminalPersisted = true
    return { api, provider: api, model: authority.modelId, output: [], stopReason: failure ? failure.code === 'CANCELLED' ? 'aborted' : 'error' : 'stop', timestamp: Date.now() }
  }
  const models = createModels({ authContext: { env: async () => undefined, fileExists: async () => false } })
  models.setProvider(createProvider({ id: api, auth: { apiKey: { name: 'Explicit application credential', resolve: async ({ credential }) => credential?.key ? { auth: { apiKey: credential.key }, source: 'explicit' } : undefined } }, models: [model], images: { [api]: { generateImages } } }))
  const result = await models.generateImages(model, { input: [{ type: 'text', text: authority.prompt }] }, { apiKey: authority.key, signal: options.signal, maxRetries: 0 })
  if (!terminalPersisted) throw new ApplicationError('STORAGE', 'Image accounting could not be saved. The request must not be replayed automatically.')
  if (failure) throw failure
  if (result.stopReason !== 'stop' || !raster) throw new ApplicationError('UNAVAILABLE', 'Image generation did not complete.')
  if (options.signal.aborted) throw new ApplicationError('CANCELLED', 'Image generation cancelled.')
  const decoded = await decodeImage(raster, authority)
  if (mediaType !== undefined && decoded.mime !== mediaType || authority.settings.format && decoded.mime !== 'image/' + authority.settings.format) throw new ApplicationError('UNAVAILABLE', 'OpenRouter returned different image media.')
  return decoded
}
