import { ApplicationError } from './contracts'
import type { ApiResult, ErrorCode } from './contracts'
import { boundedText, identifier, strictRecord, timestamp } from './validation'

export const openRouterImageModels = [
  { id: 'openai/gpt-image-2', name: 'GPT Image 2' },
  { id: 'bytedance-seed/seedream-5-0-pro', name: 'Seedream 5 Pro' },
  { id: 'google/gemini-3.1-flash-image', name: 'Nano Banana 2' }
] as const
export type OpenRouterImageModelId = typeof openRouterImageModels[number]['id']
export const openRouterPolicy = {
  baseUrl: 'https://openrouter.ai/api/v1', defaultImageModel: 'openai/gpt-image-2' as OpenRouterImageModelId,
  metadataCacheMs: 24 * 60 * 60 * 1000, metadataTimeoutMs: 30_000, metadataBytes: 2 * 1024 * 1024,
  ledgerFrameBytes: 64 * 1024, ledgerIntentBytes: 60 * 1024, historyPageSize: 50, maximumHistoryPageSize: 100,
  imageInitialWaitMs: 300_000, imageIdleMs: 60_000, imageResponseBytes: 32 * 1024 * 1024,
  promptCharacters: 16_000, keyCharacters: 1024, maximumPriceLines: 16, maximumEndpoints: 64,
  decimalFractionDigits: 18, decimalIntegerDigits: 20
} as const
export type UsdDecimal = string
export type ImageAspectRatio = '1:1' | '3:2' | '2:3' | '16:9' | '9:16'
export interface ImageGenerationSettings { n: 1; aspectRatio: ImageAspectRatio; resolution?: '512' | '1K' | '2K' | '4K'; format?: 'png' | 'jpeg' | 'webp'; quality?: 'low' | 'medium' | 'high' | 'auto' }
export interface PriceLine { billable: string; unit: 'image' | 'megapixel' | 'token'; usd: UsdDecimal; quantity: number | null; variant: string | null }
export interface ImageEndpointCapabilities {
  aspectRatios: ImageAspectRatio[]; resolutions: NonNullable<ImageGenerationSettings['resolution']>[];
  qualities: NonNullable<ImageGenerationSettings['quality']>[]; formats: NonNullable<ImageGenerationSettings['format']>[]; supportsOneImage: boolean
}
export interface ImageEndpointPricing {
  id: string; settings: ImageGenerationSettings; lines: PriceLine[]
  providerTag?: string | null; capabilities?: ImageEndpointCapabilities; pricingComplete?: boolean
}
export interface OpenRouterModelMetadata {
  modelId: OpenRouterImageModelId; availability: 'available' | 'unavailable' | 'unknown'; reason: string | null;
  checkedAt: string; endpoints: ImageEndpointPricing[]
}
export type ImageCostEstimate = { kind: 'unknown'; reason: string } |
  { kind: 'fixed' | 'range'; minimumUsd: UsdDecimal; maximumUsd: UsdDecimal; approximate: boolean;
    imageCount: number; modelId: OpenRouterImageModelId; checkedAt: string; basis: string; stale: boolean }
export type ReportedCallCost = { kind: 'unknown' } | { kind: 'known'; usd: UsdDecimal; source: 'response' | 'generation-metadata' | 'non-inference-contract'; recordedAt: string }
export interface OpenRouterKeyUsage { checkedAt: string; usageUsd: UsdDecimal | null; limitUsd: UsdDecimal | null; remainingUsd: UsdDecimal | null; dailyUsd?: UsdDecimal | null; weeklyUsd?: UsdDecimal | null; monthlyUsd?: UsdDecimal | null }
export interface OpenRouterSpend { todayUsd: UsdDecimal; monthUsd: UsdDecimal; allTimeUsd: UsdDecimal; unresolvedCount: number }
export interface OpenRouterSettings {
  revision: number; connection: 'absent' | 'connected' | 'invalid' | 'restricted' | 'limited' | 'offline' | 'storage-error';
  protection: 'protected' | 'local' | null; imageModelId: OpenRouterImageModelId; models: OpenRouterModelMetadata[];
  keyUsage: OpenRouterKeyUsage | null; spend: OpenRouterSpend; metadataStale: boolean; errorCode: ErrorCode | null
}
export type OpenRouterEndpoint = 'images' | 'image-models' | 'image-model-endpoints' | 'key' | 'generation'
export type OpenRouterCallPurpose = 'chapter-image' | 'image-replacement' | 'model-discovery' | 'endpoint-discovery' | 'key-validation' | 'key-usage' | 'cost-reconciliation'
export type OpenRouterCallStatus = 'intended' | 'succeeded' | 'failed' | 'cancelled' | 'interrupted'
export interface OpenRouterCallContext { projectId: string; topicId: string; projectName: string; topicTitle: string }
/** Profile-owned operational state. Contains no prompts, secrets, raw payloads or URLs. */
export interface OpenRouterCallIntent {
  schemaVersion: 1; id: string; startedAt: string; connectionEpoch: string; endpoint: OpenRouterEndpoint;
  purpose: OpenRouterCallPurpose; operationId: string | null; runId: string | null;
  context: OpenRouterCallContext | null; modelId: OpenRouterImageModelId | null; estimate: ImageCostEstimate
  pricing?: { settings: ImageGenerationSettings; endpoints: ImageEndpointPricing[] }
}
export interface OpenRouterCallTransition {
  schemaVersion: 1; callId: string; sequence: number; recordedAt: string; status: OpenRouterCallStatus;
  httpStatus: number | null; errorCode: ErrorCode | null; generationId: string | null;
  returnedModelId: OpenRouterImageModelId | null; cost: ReportedCallCost;
  disposition: 'none' | 'checkpointed' | 'published' | 'discarded' | 'save-failed'
}
export interface OpenRouterCall { intent: OpenRouterCallIntent; latest: OpenRouterCallTransition | null }
export interface ListOpenRouterCallsRequest {
  cursor?: string; limit: number; from?: string; to?: string; purpose?: OpenRouterCallPurpose;
  modelId?: OpenRouterImageModelId; status?: OpenRouterCallStatus
}
export interface OpenRouterCallPage { calls: OpenRouterCall[]; nextCursor: string | null }
export interface OpenRouterApi {
  getOpenRouterSettings(): Promise<ApiResult<OpenRouterSettings>>
  saveOpenRouterKey(request: { key: string }): Promise<ApiResult<OpenRouterSettings>>
  removeOpenRouterKey(): Promise<ApiResult<OpenRouterSettings>>
  setOpenRouterImageModel(request: { modelId: OpenRouterImageModelId }): Promise<ApiResult<OpenRouterSettings>>
  refreshOpenRouterMetadata(): Promise<ApiResult<OpenRouterSettings>>
  listOpenRouterCalls(request: ListOpenRouterCallsRequest): Promise<ApiResult<OpenRouterCallPage>>
  getOpenRouterCall(request: { callId: string }): Promise<ApiResult<OpenRouterCall>>
  reconcileOpenRouterCall(request: { callId: string }): Promise<ApiResult<OpenRouterCall>>
  getTopicImageConfiguration(request: { imageCount: number; settings?: ImageGenerationSettings }): Promise<ApiResult<TopicImageConfiguration>>
  onOpenRouterChanged(listener: (settings: OpenRouterSettings) => void): () => void
}
export interface TopicImageConfiguration { modelId: OpenRouterImageModelId; settings: ImageGenerationSettings | null; estimate: ImageCostEstimate; available: boolean }
export function parseTopicImageConfigurationRequest(value: unknown): { imageCount: number; settings?: ImageGenerationSettings } {
  const data = strictRecord(value, ['imageCount', 'settings'])
  return { imageCount: natural(data.imageCount, 6, 1), ...(data.settings !== undefined ? { settings: parseImageGenerationSettings(data.settings) } : {}) }
}
export const openRouterChannels = { settings: 'openrouter:settings', saveKey: 'openrouter:save-key', removeKey: 'openrouter:remove-key', model: 'openrouter:model', refresh: 'openrouter:refresh', list: 'openrouter:list-calls', call: 'openrouter:get-call', reconcile: 'openrouter:reconcile-call', quote: 'openrouter:image-configuration', changed: 'openrouter:changed' } as const
function invalid(): never { throw new ApplicationError('INVALID_INPUT', 'Invalid OpenRouter data.') }
function choice<T extends string>(value: unknown, choices: readonly T[]): T { if (!choices.includes(value as T)) invalid(); return value as T }
function natural(value: unknown, max = Number.MAX_SAFE_INTEGER, min = 0): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) invalid(); return value }
function flag(value: unknown): boolean { if (typeof value !== 'boolean') invalid(); return value }
function list<T>(value: unknown, max: number, parse: (value: unknown) => T): T[] { if (!Array.isArray(value) || value.length > max) invalid(); return value.map(parse) }
const errorCodes: ErrorCode[] = ['INVALID_INPUT', 'NOT_FOUND', 'FORBIDDEN', 'INTERNAL', 'AUTH_REQUIRED', 'PLAN_PERMISSION_REQUIRED', 'ACCESS_RESTRICTED', 'USAGE_LIMIT', 'NETWORK', 'CANCELLED', 'BUSY', 'UNAVAILABLE', 'STORAGE', 'CONFLICT']
const purposes: OpenRouterCallPurpose[] = ['chapter-image', 'image-replacement', 'model-discovery', 'endpoint-discovery', 'key-validation', 'key-usage', 'cost-reconciliation']
const statuses: OpenRouterCallStatus[] = ['intended', 'succeeded', 'failed', 'cancelled', 'interrupted']
export function parseUsdDecimal(value: unknown): UsdDecimal {
  if (typeof value !== 'string' || !new RegExp(`^(0|[1-9][0-9]{0,${openRouterPolicy.decimalIntegerDigits - 1}})(\\.[0-9]{1,${openRouterPolicy.decimalFractionDigits}})?$`).test(value)) invalid()
  return value
}
export function parseOpenRouterImageModel(value: unknown): OpenRouterImageModelId { return choice(value, openRouterImageModels.map(model => model.id)) }
export function parseImageGenerationSettings(value: unknown): ImageGenerationSettings {
  const data = strictRecord(value, ['n', 'aspectRatio', 'resolution', 'format', 'quality'])
  if (data.n !== 1) invalid()
  const result: ImageGenerationSettings = { n: 1, aspectRatio: choice(data.aspectRatio, ['1:1', '3:2', '2:3', '16:9', '9:16']) }
  if (data.resolution !== undefined) result.resolution = choice(data.resolution, ['512', '1K', '2K', '4K'] as const)
  if (data.format !== undefined) result.format = choice(data.format, ['png', 'jpeg', 'webp'] as const)
  if (data.quality !== undefined) result.quality = choice(data.quality, ['low', 'medium', 'high', 'auto'] as const)
  return result
}
export function parseImageCostEstimate(value: unknown): ImageCostEstimate {
  const data = strictRecord(value, ['kind', 'reason', 'minimumUsd', 'maximumUsd', 'approximate', 'imageCount', 'modelId', 'checkedAt', 'basis', 'stale'])
  if (data.kind === 'unknown') { strictRecord(value, ['kind', 'reason']); return { kind: 'unknown', reason: boundedText(data.reason, 'Estimate reason', 512) } }
  strictRecord(value, ['kind', 'minimumUsd', 'maximumUsd', 'approximate', 'imageCount', 'modelId', 'checkedAt', 'basis', 'stale'])
  const minimumUsd = parseUsdDecimal(data.minimumUsd), maximumUsd = parseUsdDecimal(data.maximumUsd)
  const units = (amount: string) => BigInt(amount.split('.')[0]!) * 10n ** 18n + BigInt((amount.split('.')[1] ?? '').padEnd(18, '0'))
  if (units(minimumUsd) > units(maximumUsd) || data.kind === 'fixed' && units(minimumUsd) !== units(maximumUsd)) invalid()
  return { kind: choice(data.kind, ['fixed', 'range']), minimumUsd, maximumUsd, approximate: flag(data.approximate), imageCount: natural(data.imageCount, 6, 1),
    modelId: parseOpenRouterImageModel(data.modelId), checkedAt: timestamp(data.checkedAt), basis: boundedText(data.basis, 'Estimate basis', 1000), stale: flag(data.stale) }
}
export function parseReportedCallCost(value: unknown): ReportedCallCost {
  const data = strictRecord(value, ['kind', 'usd', 'source', 'recordedAt'])
  if (data.kind === 'unknown') { strictRecord(value, ['kind']); return { kind: 'unknown' } }
  if (data.kind !== 'known') invalid()
  return { kind: 'known', usd: parseUsdDecimal(data.usd), source: choice(data.source, ['response', 'generation-metadata', 'non-inference-contract']), recordedAt: timestamp(data.recordedAt) }
}
export function parseOpenRouterModelMetadata(value: unknown): OpenRouterModelMetadata {
  const data = strictRecord(value, ['modelId', 'availability', 'reason', 'checkedAt', 'endpoints'])
  const endpoints = list(data.endpoints, openRouterPolicy.maximumEndpoints, value => {
    const endpoint = strictRecord(value, ['id', 'settings', 'lines', 'providerTag', 'capabilities', 'pricingComplete'])
    const result: ImageEndpointPricing = { id: identifier(endpoint.id), settings: parseImageGenerationSettings(endpoint.settings), lines: list(endpoint.lines, openRouterPolicy.maximumPriceLines, value => {
      const line = strictRecord(value, ['billable', 'unit', 'usd', 'quantity', 'variant'])
      const billable = boundedText(line.billable, 'Billable class', 64)
      if (!/^[a-z][a-z_]*$/.test(billable)) invalid()
      return { billable, unit: choice(line.unit, ['image', 'megapixel', 'token']), usd: parseUsdDecimal(line.usd), quantity: line.quantity === null ? null : natural(line.quantity, Number.MAX_SAFE_INTEGER, 0), variant: line.variant === null ? null : boundedText(line.variant, 'Price variant', 128) }
    }) }
    if (endpoint.providerTag !== undefined) {
      if (endpoint.providerTag !== null && (typeof endpoint.providerTag !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(endpoint.providerTag))) invalid()
      result.providerTag = endpoint.providerTag as string | null
    }
    if (endpoint.capabilities !== undefined) {
      const capabilities = strictRecord(endpoint.capabilities, ['aspectRatios', 'resolutions', 'qualities', 'formats', 'supportsOneImage'])
      result.capabilities = { aspectRatios: list(capabilities.aspectRatios, 5, value => choice(value, ['1:1', '3:2', '2:3', '16:9', '9:16'] as const)), resolutions: list(capabilities.resolutions, 4, value => choice(value, ['512', '1K', '2K', '4K'] as const)), qualities: list(capabilities.qualities, 4, value => choice(value, ['low', 'medium', 'high', 'auto'] as const)), formats: list(capabilities.formats, 3, value => choice(value, ['png', 'jpeg', 'webp'] as const)), supportsOneImage: flag(capabilities.supportsOneImage) }
    }
    if (endpoint.pricingComplete !== undefined) result.pricingComplete = flag(endpoint.pricingComplete)
    return result
  })
  if (new Set(endpoints.map(item => item.id)).size !== endpoints.length) invalid()
  return { modelId: parseOpenRouterImageModel(data.modelId), availability: choice(data.availability, ['available', 'unavailable', 'unknown']),
    reason: data.reason === null ? null : boundedText(data.reason, 'Availability', 512), checkedAt: timestamp(data.checkedAt), endpoints }
}
export function parseOpenRouterSettings(value: unknown): OpenRouterSettings {
  const data = strictRecord(value, ['revision', 'connection', 'protection', 'imageModelId', 'models', 'keyUsage', 'spend', 'metadataStale', 'errorCode'])
  const spend = strictRecord(data.spend, ['todayUsd', 'monthUsd', 'allTimeUsd', 'unresolvedCount'])
  const usage = data.keyUsage === null ? null : strictRecord(data.keyUsage, ['checkedAt', 'usageUsd', 'limitUsd', 'remainingUsd', 'dailyUsd', 'weeklyUsd', 'monthlyUsd'])
  const models = list(data.models, 3, parseOpenRouterModelMetadata)
  if (new Set(models.map(item => item.modelId)).size !== models.length) invalid()
  return { revision: natural(data.revision), connection: choice(data.connection, ['absent', 'connected', 'invalid', 'restricted', 'limited', 'offline', 'storage-error']),
    protection: data.protection === null ? null : choice(data.protection, ['protected', 'local'] as const), imageModelId: parseOpenRouterImageModel(data.imageModelId), models,
    keyUsage: usage && { checkedAt: timestamp(usage.checkedAt), usageUsd: usage.usageUsd === null ? null : parseUsdDecimal(usage.usageUsd), limitUsd: usage.limitUsd === null ? null : parseUsdDecimal(usage.limitUsd), remainingUsd: usage.remainingUsd === null ? null : parseUsdDecimal(usage.remainingUsd), ...Object.fromEntries(['dailyUsd', 'weeklyUsd', 'monthlyUsd'].filter(key => usage[key] !== undefined).map(key => [key, usage[key] === null ? null : parseUsdDecimal(usage[key])])) },
    spend: { todayUsd: parseUsdDecimal(spend.todayUsd), monthUsd: parseUsdDecimal(spend.monthUsd), allTimeUsd: parseUsdDecimal(spend.allTimeUsd), unresolvedCount: natural(spend.unresolvedCount) },
    metadataStale: flag(data.metadataStale), errorCode: data.errorCode === null ? null : choice(data.errorCode, errorCodes) }
}
export function parseOpenRouterCallIntent(value: unknown): OpenRouterCallIntent {
  const data = strictRecord(value, ['schemaVersion', 'id', 'startedAt', 'connectionEpoch', 'endpoint', 'purpose', 'operationId', 'runId', 'context', 'modelId', 'estimate', 'pricing'])
  if (data.schemaVersion !== 1) invalid()
  const context = data.context === null ? null : strictRecord(data.context, ['projectId', 'topicId', 'projectName', 'topicTitle'])
  const result: OpenRouterCallIntent = { schemaVersion: 1, id: identifier(data.id), startedAt: timestamp(data.startedAt), connectionEpoch: identifier(data.connectionEpoch),
    endpoint: choice(data.endpoint, ['images', 'image-models', 'image-model-endpoints', 'key', 'generation']), purpose: choice(data.purpose, purposes),
    operationId: data.operationId === null ? null : identifier(data.operationId), runId: data.runId === null ? null : identifier(data.runId),
    context: context && { projectId: identifier(context.projectId), topicId: identifier(context.topicId), projectName: boundedText(context.projectName, 'Project name', 240), topicTitle: boundedText(context.topicTitle, 'Topic title', 240) },
    modelId: data.modelId === null ? null : parseOpenRouterImageModel(data.modelId), estimate: parseImageCostEstimate(data.estimate) }
  const endpointForPurpose: Record<OpenRouterCallPurpose, OpenRouterEndpoint> = { 'chapter-image': 'images', 'image-replacement': 'images', 'model-discovery': 'image-models', 'endpoint-discovery': 'image-model-endpoints', 'key-validation': 'key', 'key-usage': 'key', 'cost-reconciliation': 'generation' }
  if (result.endpoint !== endpointForPurpose[result.purpose] || result.endpoint === 'images' && (!result.modelId || !result.operationId || !result.context) || result.purpose === 'chapter-image' && !result.runId || result.endpoint === 'image-model-endpoints' && !result.modelId) invalid()
  if (result.estimate.kind !== 'unknown' && result.estimate.modelId !== result.modelId) invalid()
  if (data.pricing !== undefined) {
    if (result.endpoint !== 'images' || !result.modelId) invalid()
    const pricing = strictRecord(data.pricing, ['settings', 'endpoints'])
    result.pricing = { settings: parseImageGenerationSettings(pricing.settings), endpoints: parseOpenRouterModelMetadata({ modelId: result.modelId, availability: 'available', reason: null, checkedAt: result.startedAt, endpoints: pricing.endpoints }).endpoints }
  }
  // Reserve space for the maximum safe terminal record and enclosing history page.
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > openRouterPolicy.ledgerIntentBytes) invalid()
  return result
}
export function parseOpenRouterCallTransition(value: unknown): OpenRouterCallTransition {
  const data = strictRecord(value, ['schemaVersion', 'callId', 'sequence', 'recordedAt', 'status', 'httpStatus', 'errorCode', 'generationId', 'returnedModelId', 'cost', 'disposition'])
  if (data.schemaVersion !== 1) invalid()
  return { schemaVersion: 1, callId: identifier(data.callId), sequence: natural(data.sequence, Number.MAX_SAFE_INTEGER, 1), recordedAt: timestamp(data.recordedAt), status: choice(data.status, statuses),
    httpStatus: data.httpStatus === null ? null : natural(data.httpStatus, 599, 100), errorCode: data.errorCode === null ? null : choice(data.errorCode, errorCodes),
    generationId: data.generationId === null ? null : parseOpenRouterGenerationId(data.generationId), returnedModelId: data.returnedModelId === null ? null : parseOpenRouterImageModel(data.returnedModelId),
    cost: parseReportedCallCost(data.cost), disposition: choice(data.disposition, ['none', 'checkpointed', 'published', 'discarded', 'save-failed']) }
}
export function parseOpenRouterGenerationId(value: unknown): string {
  if (typeof value !== 'string' || value.length > 128 || !/^gen-[a-zA-Z0-9-]+$/.test(value)) invalid()
  return value
}
export function parseOpenRouterCall(value: unknown): OpenRouterCall {
  const data = strictRecord(value, ['intent', 'latest'])
  const result = { intent: parseOpenRouterCallIntent(data.intent), latest: data.latest === null ? null : parseOpenRouterCallTransition(data.latest) }
  if (result.latest && (result.latest.callId !== result.intent.id || Date.parse(result.latest.recordedAt) < Date.parse(result.intent.startedAt))) invalid()
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > openRouterPolicy.ledgerFrameBytes) invalid()
  return result
}
export function parseOpenRouterCallPage(value: unknown): OpenRouterCallPage {
  const data = strictRecord(value, ['calls', 'nextCursor'])
  const result = { calls: list(data.calls, openRouterPolicy.maximumHistoryPageSize, parseOpenRouterCall), nextCursor: data.nextCursor === null ? null : identifier(data.nextCursor) }
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > openRouterPolicy.ledgerFrameBytes) invalid()
  return result
}
export function parseSaveOpenRouterKey(value: unknown): { key: string } {
  const key = boundedText(strictRecord(value, ['key']).key, 'OpenRouter key', openRouterPolicy.keyCharacters)
  if (/\s/.test(key)) invalid()
  return { key }
}
export function parseSetOpenRouterImageModel(value: unknown): { modelId: OpenRouterImageModelId } { return { modelId: parseOpenRouterImageModel(strictRecord(value, ['modelId']).modelId) } }
export function parseGetOpenRouterCall(value: unknown): { callId: string } { return { callId: identifier(strictRecord(value, ['callId']).callId) } }
export function parseListOpenRouterCalls(value: unknown): ListOpenRouterCallsRequest {
  const data = strictRecord(value, ['cursor', 'limit', 'from', 'to', 'purpose', 'modelId', 'status'])
  const result: ListOpenRouterCallsRequest = { limit: data.limit === undefined ? openRouterPolicy.historyPageSize : natural(data.limit, openRouterPolicy.maximumHistoryPageSize, 1) }
  if (data.cursor !== undefined) result.cursor = identifier(data.cursor)
  if (data.from !== undefined) result.from = timestamp(data.from)
  if (data.to !== undefined) result.to = timestamp(data.to)
  if (result.from && result.to && Date.parse(result.from) > Date.parse(result.to)) invalid()
  if (data.purpose !== undefined) result.purpose = choice(data.purpose, purposes)
  if (data.modelId !== undefined) result.modelId = parseOpenRouterImageModel(data.modelId)
  if (data.status !== undefined) result.status = choice(data.status, statuses)
  return result
}
