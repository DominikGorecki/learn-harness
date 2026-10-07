import { createHash } from 'node:crypto'
import { ApplicationError } from '../../shared/contracts'
import { openRouterImageModels, openRouterPolicy, parseImageGenerationSettings, parseOpenRouterModelMetadata } from '../../shared/openrouter'
import type { ImageCostEstimate, ImageEndpointCapabilities, ImageEndpointPricing, ImageGenerationSettings, OpenRouterImageModelId, OpenRouterModelMetadata, PriceLine } from '../../shared/openrouter'
import { decimalLiteral, addMoney, moneyUnits, multiplyMoney } from './money'
import { ledgerPriceVariant } from './safe-projection'

const object = (value: unknown): Record<string, unknown> => { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApplicationError('UNAVAILABLE', 'Provider metadata is unsupported.'); return value as Record<string, unknown> }
function values(parameters: Record<string, unknown>, key: string, allowed: readonly string[]): string[] {
  const raw = parameters[key]; if (raw === undefined) return []
  const descriptor = object(raw)
  if (descriptor.type !== 'enum' || !Array.isArray(descriptor.values)) return []
  const advertised = descriptor.values
  return allowed.filter(value => advertised.includes(value))
}
function oneImage(parameters: Record<string, unknown>): boolean {
  if (!parameters.n) return false
  const value = object(parameters.n)
  return value.type === 'range' && typeof value.min === 'number' && typeof value.max === 'number' && value.min <= 1 && value.max >= 1 || value.type === 'enum' && Array.isArray(value.values) && value.values.includes(1)
}
export function catalogIds(value: unknown): Set<string> {
  const data = object(value).data; if (!Array.isArray(data)) throw new ApplicationError('UNAVAILABLE', 'Image catalog is unavailable.')
  return new Set(data.filter(item => item && typeof item === 'object' && Array.isArray(item.architecture?.output_modalities) && item.architecture.output_modalities.includes('image')).map(item => item.id))
}
export function projectEndpoints(modelId: OpenRouterImageModelId, value: unknown, checkedAt: string): OpenRouterModelMetadata {
  const raw = object(value)
  if (raw.id !== modelId || !Array.isArray(raw.endpoints) || raw.endpoints.length > openRouterPolicy.maximumEndpoints) throw new ApplicationError('UNAVAILABLE', 'Selected-model endpoint evidence is unavailable.')
  const endpoints: ImageEndpointPricing[] = raw.endpoints.map((value, index) => {
    const entry = object(value), parameters = object(entry.supported_parameters)
    const capabilities: ImageEndpointCapabilities = { aspectRatios: values(parameters, 'aspect_ratio', ['1:1', '3:2', '2:3', '16:9', '9:16']) as ImageEndpointCapabilities['aspectRatios'], resolutions: values(parameters, 'resolution', ['512', '1K', '2K', '4K']) as ImageEndpointCapabilities['resolutions'], qualities: values(parameters, 'quality', ['low', 'medium', 'high', 'auto']) as ImageEndpointCapabilities['qualities'], formats: values(parameters, 'output_format', ['png', 'jpeg', 'webp']) as ImageEndpointCapabilities['formats'], supportsOneImage: oneImage(parameters) }
    const settings: ImageGenerationSettings = { n: 1, aspectRatio: capabilities.aspectRatios.includes('1:1') ? '1:1' : capabilities.aspectRatios[0] ?? '1:1' }
    if (capabilities.resolutions.includes('1K')) settings.resolution = '1K'
    else if (capabilities.resolutions.includes('512')) settings.resolution = '512'
    if (capabilities.qualities.includes('low')) settings.quality = 'low'
    if (capabilities.formats.includes('png')) settings.format = 'png'
    const tag = typeof entry.provider_tag === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(entry.provider_tag) ? entry.provider_tag : null
    const id = 'endpoint-' + createHash('sha256').update(JSON.stringify([tag, entry.provider_slug ?? null, index])).digest('hex').slice(0, 24)
    const lines: PriceLine[] = []
    let pricingComplete = Array.isArray(entry.pricing) && entry.pricing.length > 0 && entry.pricing.length <= openRouterPolicy.maximumPriceLines
    if (Array.isArray(entry.pricing) && entry.pricing.length <= openRouterPolicy.maximumPriceLines) for (const value of entry.pricing) {
      const line = object(value)
      if (typeof line.billable !== 'string' || !/^[a-z][a-z_]{0,63}$/.test(line.billable) || !['image', 'megapixel', 'token'].includes(String(line.unit))) { pricingComplete = false; continue }
      const variant = ledgerPriceVariant(line.variant)
      if (variant === 'unsupported') pricingComplete = false
      try { lines.push({ billable: line.billable, unit: line.unit as PriceLine['unit'], usd: decimalLiteral(String(line.cost_usd)), quantity: line.billable === 'output_image' && line.unit === 'image' ? 1 : ['input_image', 'input_reference'].includes(line.billable) && line.unit === 'image' ? 0 : null, variant }) } catch { pricingComplete = false }
    }
    return { id, providerTag: tag, capabilities, settings, lines, pricingComplete }
  })
  return parseOpenRouterModelMetadata({ modelId, availability: endpoints.some(endpoint => endpoint.capabilities?.supportsOneImage && endpoint.capabilities.aspectRatios.length) ? 'available' : 'unavailable', reason: endpoints.length ? null : 'No supported image endpoint is advertised.', checkedAt, endpoints })
}
export function compatible(endpoint: ImageEndpointPricing, settings: ImageGenerationSettings): boolean {
  const caps = endpoint.capabilities
  if (!caps?.supportsOneImage || !caps.aspectRatios.includes(settings.aspectRatio) || settings.resolution && !caps.resolutions.includes(settings.resolution) || settings.quality && !caps.qualities.includes(settings.quality) || settings.format && !caps.formats.includes(settings.format)) return false
  // 4K square is knowably over the 16 megapixel limit; reject conservative maximum too.
  if (settings.resolution === '4K') return false
  if (caps.resolutions.length && settings.resolution === undefined || caps.qualities.length && settings.quality === undefined) return false
  return true
}
export interface AuthorizedImageRoute { settings: ImageGenerationSettings; provider: { only: string[]; allow_fallbacks: false } | null; endpoints: ImageEndpointPricing[]; estimate: ImageCostEstimate }
export function selectImageRoute(metadata: OpenRouterModelMetadata, input: ImageGenerationSettings, count: number, stale: boolean): AuthorizedImageRoute {
  const settings = parseImageGenerationSettings(input)
  if (!Number.isSafeInteger(count) || count < 1 || count > 6 || metadata.availability !== 'available') throw new ApplicationError('UNAVAILABLE', 'The selected image model has no validated compatible endpoint.')
  const matched = metadata.endpoints.filter(endpoint => compatible(endpoint, settings)), pinned = matched.find(endpoint => endpoint.providerTag && metadata.endpoints.filter(other => other.providerTag === endpoint.providerTag).every(other => compatible(other, settings)))
  let endpoints: ImageEndpointPricing[], provider: AuthorizedImageRoute['provider']
  if (pinned) { endpoints = matched.filter(endpoint => endpoint.providerTag === pinned.providerTag); provider = { only: [pinned.providerTag!], allow_fallbacks: false } }
  else if (metadata.endpoints.length && metadata.endpoints.every(endpoint => compatible(endpoint, settings))) { endpoints = metadata.endpoints; provider = null }
  else throw new ApplicationError('UNAVAILABLE', 'Provider routing cannot guarantee these image settings.')
  const prices: string[] = []
  for (const endpoint of endpoints) {
    // Variant labels alone do not prove which request setting incurs a tier. Preserve them, show unknown.
    if (!endpoint.pricingComplete || !endpoint.lines.length || endpoint.lines.some(line => line.variant !== null || line.quantity === null)) break
    const selected = endpoint.lines
    if (selected.filter(line => line.billable === 'output_image' && line.unit === 'image').length !== 1 || selected.some(line => !['input_image', 'input_reference', 'output_image'].includes(line.billable) || line.quantity === null)) break
    prices.push(multiplyMoney(addMoney(selected.map(line => multiplyMoney(line.usd, line.quantity!))), count))
  }
  let estimate: ImageCostEstimate = { kind: 'unknown', reason: 'Compatible endpoint pricing has unsupported variants or unknown quantities.' }
  if (prices.length === endpoints.length) {
    const sorted = prices.sort((a, b) => moneyUnits(a) < moneyUnits(b) ? -1 : moneyUnits(a) > moneyUnits(b) ? 1 : 0), minimumUsd = sorted[0]!, maximumUsd = sorted.at(-1)!
    estimate = { kind: minimumUsd === maximumUsd ? 'fixed' : 'range', minimumUsd, maximumUsd, approximate: true, imageCount: count, modelId: metadata.modelId, checkedAt: metadata.checkedAt, basis: `Compatible dedicated endpoint output_image/image pricing; no input references; settings ${JSON.stringify(settings)}.`, stale }
  }
  return { settings, provider, endpoints, estimate }
}
export const unavailableModels = (checkedAt: string): OpenRouterModelMetadata[] => openRouterImageModels.map(model => ({ modelId: model.id, availability: 'unknown', reason: 'Image metadata has not been checked.', checkedAt, endpoints: [] }))
