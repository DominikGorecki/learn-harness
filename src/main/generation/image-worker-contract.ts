import { ApplicationError } from '../../shared/contracts'
import { boundedText, identifier, strictRecord } from '../../shared/validation'
import { openRouterPolicy, parseImageGenerationSettings, parseOpenRouterImageModel, parseOpenRouterCallTransition } from '../../shared/openrouter'
import type { ImageGenerationSettings, OpenRouterImageModelId, OpenRouterCallTransition } from '../../shared/openrouter'
import { inspectRaster } from '../security/topic-media'
import { contentDigest } from '../storage/topic-content-files'

/** Private utility authority. Never enters a renderer DTO or diagnostic. */
export interface ImageAuthorization {
  callId: string; imageSlotId: string; key: string; connectionEpoch: string; modelId: OpenRouterImageModelId;
  baseUrl: string; prompt: string; settings: ImageGenerationSettings;
  provider: { only: string[]; allow_fallbacks: false } | null
}
export type ImageTerminal = Omit<OpenRouterCallTransition, 'schemaVersion' | 'callId' | 'sequence' | 'recordedAt' | 'disposition'>
export interface DecodedImage {
  kind: 'image'; callId: string; imageSlotId: string; bytes: Uint8Array;
  mime: 'image/png' | 'image/jpeg' | 'image/webp'; width: number; height: number; digest: string
}
export function parseImageAuthorization(value: unknown): ImageAuthorization {
  const data = strictRecord(value, ['callId', 'imageSlotId', 'key', 'connectionEpoch', 'modelId', 'baseUrl', 'prompt', 'settings', 'provider'])
  const baseUrl = boundedText(data.baseUrl, 'Destination', 2048), url = new URL(baseUrl)
  // Fixture authority remains private to main. Production authorization uses the fixed URL.
  if (baseUrl !== openRouterPolicy.baseUrl && !(url.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(url.hostname) && url.port && url.pathname === '/api/v1' && !url.search && !url.hash && !url.username && !url.password)) throw new ApplicationError('FORBIDDEN', 'Invalid image destination.')
  let provider: ImageAuthorization['provider'] = null
  if (data.provider !== null) {
    const route = strictRecord(data.provider, ['only', 'allow_fallbacks'])
    if (!Array.isArray(route.only) || route.only.length !== 1 || route.allow_fallbacks !== false || typeof route.only[0] !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(route.only[0])) throw new ApplicationError('INVALID_INPUT', 'Invalid image route.')
    provider = { only: [route.only[0]], allow_fallbacks: false }
  }
  return { callId: identifier(data.callId), imageSlotId: identifier(data.imageSlotId), key: boundedText(data.key, 'Credential', openRouterPolicy.keyCharacters), connectionEpoch: identifier(data.connectionEpoch), modelId: parseOpenRouterImageModel(data.modelId), baseUrl, prompt: boundedText(data.prompt, 'Illustration instructions', openRouterPolicy.promptCharacters), settings: parseImageGenerationSettings(data.settings), provider }
}
export function parseImageTerminal(value: unknown): ImageTerminal {
  const data = strictRecord(value, ['status', 'httpStatus', 'errorCode', 'generationId', 'returnedModelId', 'cost'])
  const parsed = parseOpenRouterCallTransition({ ...data, schemaVersion: 1, callId: 'private-image', sequence: 1, recordedAt: new Date().toISOString(), disposition: 'none' })
  if (parsed.status === 'intended' || parsed.status === 'interrupted' || parsed.cost.kind === 'known' && parsed.cost.source !== 'response') throw new ApplicationError('INVALID_INPUT', 'Invalid image terminal.')
  return { status: parsed.status, httpStatus: parsed.httpStatus, errorCode: parsed.errorCode, generationId: parsed.generationId, returnedModelId: parsed.returnedModelId, cost: parsed.cost }
}
/** Check the typed buffer BEFORE any JSON serialization. Main only inspects the container. */
export function parseDecodedImage(value: unknown): DecodedImage {
  const data = strictRecord(value, ['kind', 'callId', 'imageSlotId', 'bytes', 'mime', 'width', 'height', 'digest'])
  if (data.kind !== 'image' || !(data.bytes instanceof Uint8Array)) throw new ApplicationError('INTERNAL', 'Invalid illustration frame.')
  const actual = inspectRaster(data.bytes)
  if (data.mime !== actual.mime || data.width !== actual.width || data.height !== actual.height || data.digest !== contentDigest(data.bytes)) throw new ApplicationError('INTERNAL', 'Invalid illustration evidence.')
  return { kind: 'image', callId: identifier(data.callId), imageSlotId: identifier(data.imageSlotId), bytes: data.bytes, ...actual, digest: data.digest as string }
}
