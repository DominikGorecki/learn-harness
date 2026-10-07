import type { OutlineEngineInput } from './pi-outline-engine'
import type { OutlineEngineResult, EnginePhase } from '../../shared/generation'
import { ApplicationError } from '../../shared/contracts'
import type { ErrorCode } from '../../shared/contracts'
import { strictRecord, boundedText } from '../../shared/validation'
import { parseOutline, parseCoverage } from '../../shared/outline'
import { parseSavedOutline } from '../../shared/workspace'
import { maximumProjectEditCharacters, parseProjectFileEdits, projectFilePath } from '../../shared/project-files'
import { aiLimits, parseAiPreview } from '../../shared/ai/activity'
import type { AiPreview, AiActivityEntry } from '../../shared/ai/activity'
import type { PiProtocolEvidence } from './pi-protocol-evidence'
import { protocolCodes, protocolStatuses, safeReturnedModel } from './pi-protocol-evidence'
import type { TransportState } from './pi-stream-liveness'
import { identifier } from '../../shared/validation'
import { parseDecodedImage, parseImageAuthorization, parseImageTerminal } from './image-worker-contract'
import type { DecodedImage, ImageAuthorization, ImageTerminal } from './image-worker-contract'

export type EngineDiagnosticEvent = 'engine.materials' | 'engine.request' | 'engine.response' | 'engine.terminal' | 'engine.tool' | 'engine.turn' | 'engine.transport'
export type WorkerDiagnosticEvent = EngineDiagnosticEvent | 'console.output' | 'process.unhandled'
export const workerPhases = ['preparing', 'waiting', 'receiving', 'examining', 'planning', 'validating', 'finished'] as const
export type WorkerPhase = typeof workerPhases[number]
export const workerErrorCodes: ErrorCode[] = ['INVALID_INPUT', 'NOT_FOUND', 'FORBIDDEN', 'INTERNAL', 'AUTH_REQUIRED', 'PLAN_PERMISSION_REQUIRED',
  'ACCESS_RESTRICTED', 'USAGE_LIMIT', 'NETWORK', 'CANCELLED', 'BUSY', 'UNAVAILABLE', 'STORAGE', 'CONFLICT']
export interface ModelAccessWorkerInput { target: 'gpt-6.1-sol' | 'gpt-6-luna'; accessToken: string; baseUrl: string }
export type WorkerProfile = { profile: 'outline'; input: OutlineEngineInput } | { profile: 'model-access'; input: ModelAccessWorkerInput } | { profile: 'fixed-image'; input: { imageSlotId: string } }
export type WorkerRequest = ({ type: 'start' } & WorkerProfile) | { type: 'cancel' } |
  { type: 'image-authorized'; requestId: string; authority: ImageAuthorization | null } |
  { type: 'image-terminal-ack' | 'image-asset-ack'; requestId: string; callId: string; accepted: boolean }
export type WorkerReply = { type: 'health'; sequence: number; phase: WorkerPhase } |
  { type: 'phase'; sequence: number; phase: EnginePhase } |
  { type: 'transport'; sequence: number; state: TransportState } |
  { type: 'model-evidence'; sequence: number; evidence: PiProtocolEvidence } |
  { type: 'progress'; sequence: number; turn: number; revision: number; preview: AiPreview; abbreviated?: boolean; activity?: AiActivityEntry[] } |
  { type: 'result'; sequence: number; profile: 'outline'; result: OutlineEngineResult } |
  { type: 'result'; sequence: number; profile: 'model-access'; result: PiProtocolEvidence } |
  { type: 'image-intent'; sequence: number; requestId: string; imageSlotId: string } |
  { type: 'image-terminal'; sequence: number; requestId: string; callId: string; terminal: ImageTerminal } |
  { type: 'image-asset'; sequence: number; requestId: string; image: DecodedImage } |
  { type: 'result'; sequence: number; profile: 'fixed-image'; result: { kind: 'image'; callId: string; imageSlotId: string } } |
  { type: 'error'; sequence: number; code: ErrorCode } |
  { type: 'diagnostic'; sequence: number; event: WorkerDiagnosticEvent; data: unknown }

// Accepted outline shape maxima, coverage and accumulated file/baseline budgets bound
// the private result. JSON escaping may cost six bytes per UTF-16 unit. This is not a preview.
const moduleCharacters = 100 + 240 + 3000 + 64 + 5000
const lessonCharacters = 100 + 240 + 2000 + 5000 + 12 * 2000 + 20 * 2000 + 100 * 2048 + 12 * moduleCharacters
const outlineCharacters = 240 + 10_000 + 5000 + 1000 + 20 * 2000 + 30 * 2000 + 40 * (240 + 3000) + 100 + 40 * lessonCharacters
const coverageCharacters = 1000 * (2048 + 2000 + 64) + 40 * 2000
export const maximumWorkerResultBytes = 6 * (outlineCharacters + coverageCharacters + maximumProjectEditCharacters + 100 * 2048) + 1024 * 1024
export function workerFrameBytes(value: unknown): number {
  try { return Buffer.byteLength(JSON.stringify(value)) } catch { throw new ApplicationError('INTERNAL', 'The AI process sent an invalid message.') }
}
function invalid(): never { throw new ApplicationError('INTERNAL', 'The AI process sent an invalid message.') }
function natural(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalid(); return value }
function choice<T extends string>(value: unknown, choices: readonly T[]): T { if (!choices.includes(value as T)) invalid(); return value as T }
function nullableChoice(value: unknown, choices: readonly string[]): string | null { return value === null ? null : choice(value, [...choices, 'unrecognized']) }
function flag(value: unknown): boolean { if (typeof value !== 'boolean') invalid(); return value }
function age(value: unknown): number | null { return value === null ? null : natural(value) }
export function parseWorkerRequest(value: unknown): WorkerRequest {
  if (workerFrameBytes(value) > maximumWorkerResultBytes) invalid()
  const data = strictRecord(value, ['type', 'profile', 'input', 'requestId', 'authority', 'callId', 'accepted'])
  if (data.type === 'cancel') { strictRecord(value, ['type']); return { type: 'cancel' } }
  if (data.type === 'image-authorized') {
    strictRecord(value, ['type', 'requestId', 'authority'])
    return { type: 'image-authorized', requestId: identifier(data.requestId), authority: data.authority === null ? null : parseImageAuthorization(data.authority) }
  }
  if (data.type === 'image-terminal-ack' || data.type === 'image-asset-ack') {
    strictRecord(value, ['type', 'requestId', 'callId', 'accepted'])
    return { type: data.type, requestId: identifier(data.requestId), callId: identifier(data.callId), accepted: flag(data.accepted) }
  }
  if (data.type !== 'start') invalid()
  strictRecord(value, ['type', 'profile', 'input'])
  if (data.profile === 'fixed-image') {
    const input = strictRecord(data.input, ['imageSlotId'])
    return { type: 'start', profile: 'fixed-image', input: { imageSlotId: identifier(input.imageSlotId) } }
  }
  if (data.profile === 'model-access') {
    const input = strictRecord(data.input, ['target', 'accessToken', 'baseUrl'])
    return { type: 'start', profile: 'model-access', input: { target: choice(input.target, ['gpt-6.1-sol', 'gpt-6-luna']),
      accessToken: boundedText(input.accessToken, 'Authorization', 32_000), baseUrl: boundedText(input.baseUrl, 'Destination', 2048) } }
  }
  if (data.profile !== 'outline') invalid()
  const input = strictRecord(data.input, ['model', 'accessToken', 'baseUrl', 'brief', 'path', 'currentOutline', 'changes', 'topicId', 'topicWriteRoot'])
  const model = strictRecord(input.model, ['id', 'name'])
  const parsed: OutlineEngineInput = { model: { id: boundedText(model.id, 'Model', 128), name: boundedText(model.name, 'Model name', 240) },
    accessToken: boundedText(input.accessToken, 'Authorization', 32_000), baseUrl: boundedText(input.baseUrl, 'Destination', 2048), brief: boundedText(input.brief, 'Learning details', 32_000, true) }
  if (input.path !== undefined) parsed.path = boundedText(input.path, 'Project location', 32_000)
  if (input.currentOutline !== undefined) parsed.currentOutline = input.currentOutline === null ? null : parseSavedOutline(input.currentOutline)
  if (input.changes !== undefined) parsed.changes = boundedText(input.changes, 'Changes', 32_000)
  if (input.topicId !== undefined) parsed.topicId = boundedText(input.topicId, 'Topic', 100)
  if (input.topicWriteRoot !== undefined) parsed.topicWriteRoot = projectFilePath(input.topicWriteRoot, false)
  return { type: 'start', profile: 'outline', input: parsed }
}
export function parseProtocolEvidence(value: unknown, requireComplete = false): PiProtocolEvidence {
  const data = strictRecord(value, ['httpStatus', 'contentType', 'bytes', 'events', 'textDeltaEvents', 'completedEvents', 'hasStreamedText', 'hasFinalText',
    'terminalEvent', 'returnedModel', 'responseStatus', 'providerCode', 'incompleteReason', 'cleanEof'])
  if (data.returnedModel !== null && safeReturnedModel(data.returnedModel) !== data.returnedModel) invalid()
  const result: PiProtocolEvidence = { httpStatus: natural(data.httpStatus), contentType: choice(data.contentType, ['sse', 'json', 'other', 'missing']),
    bytes: natural(data.bytes), events: natural(data.events), textDeltaEvents: natural(data.textDeltaEvents), completedEvents: natural(data.completedEvents),
    hasStreamedText: flag(data.hasStreamedText), hasFinalText: flag(data.hasFinalText), cleanEof: flag(data.cleanEof),
    terminalEvent: data.terminalEvent === null ? null : choice(data.terminalEvent, ['response.completed', 'response.incomplete', 'response.failed', 'error'] as const),
    returnedModel: data.returnedModel as string | null, responseStatus: nullableChoice(data.responseStatus, protocolStatuses),
    providerCode: nullableChoice(data.providerCode, protocolCodes), incompleteReason: nullableChoice(data.incompleteReason, ['max_output_tokens', 'content_filter']) }
  if (requireComplete && (result.bytes > 256 * 1024 || !result.cleanEof || result.terminalEvent !== 'response.completed' || result.responseStatus !== 'completed' || !result.completedEvents)) invalid()
  return result
}
function parseTransport(value: unknown): TransportState {
  const data = strictRecord(value, ['turn', 'stage', 'bytes', 'chunks', 'events', 'lastByteAgeMs', 'semanticAgeMs', 'waiting', 'reason'])
  return { turn: natural(data.turn), stage: choice(data.stage, ['waiting', 'receiving', 'ended']), bytes: natural(data.bytes), chunks: natural(data.chunks), events: natural(data.events),
    lastByteAgeMs: age(data.lastByteAgeMs), semanticAgeMs: age(data.semanticAgeMs), waiting: flag(data.waiting),
    reason: data.reason === null ? null : choice(data.reason, ['completed', 'cancelled', 'network-idle', 'transport-error', 'invalid-event', 'request-limit', 'response-limit', 'provider-error', 'incomplete', 'missing-completion'] as const) }
}
export function parseWorkerReply(value: unknown, profile: WorkerProfile): WorkerReply {
  const type = value && typeof value === 'object' ? (value as Record<string, unknown>).type : null
  // Typed raster frames have their own binary bound. Never JSON-stringify these bytes.
  if (type === 'image-asset') {
    if (profile.profile !== 'fixed-image') invalid()
    const data = strictRecord(value, ['type', 'sequence', 'requestId', 'image'])
    return { type: 'image-asset', sequence: natural(data.sequence), requestId: identifier(data.requestId), image: parseDecodedImage(data.image) }
  }
  if (workerFrameBytes(value) > (type === 'result' && profile.profile === 'outline' ? maximumWorkerResultBytes : aiLimits.frameBytes)) invalid()
  const data = strictRecord(value, ['type', 'sequence', 'phase', 'state', 'evidence', 'turn', 'revision', 'preview', 'abbreviated', 'activity', 'profile', 'result', 'code', 'event', 'data', 'requestId', 'imageSlotId', 'callId', 'terminal'])
  const sequence = natural(data.sequence)
  switch (data.type) {
    case 'image-intent':
      strictRecord(value, ['type', 'sequence', 'requestId', 'imageSlotId']); if (profile.profile !== 'fixed-image' || data.imageSlotId !== profile.input.imageSlotId) invalid()
      return { type: 'image-intent', sequence, requestId: identifier(data.requestId), imageSlotId: identifier(data.imageSlotId) }
    case 'image-terminal':
      strictRecord(value, ['type', 'sequence', 'requestId', 'callId', 'terminal']); if (profile.profile !== 'fixed-image') invalid()
      return { type: 'image-terminal', sequence, requestId: identifier(data.requestId), callId: identifier(data.callId), terminal: parseImageTerminal(data.terminal) }
    case 'health': strictRecord(value, ['type', 'sequence', 'phase']); return { type: 'health', sequence, phase: choice(data.phase, workerPhases) }
    case 'phase': strictRecord(value, ['type', 'sequence', 'phase']); return { type: 'phase', sequence, phase: choice(data.phase, ['examining', 'planning', 'validating']) }
    case 'transport': strictRecord(value, ['type', 'sequence', 'state']); return { type: 'transport', sequence, state: parseTransport(data.state) }
    case 'model-evidence': {
      strictRecord(value, ['type', 'sequence', 'evidence']); if (profile.profile !== 'model-access') invalid()
      return { type: 'model-evidence', sequence, evidence: parseProtocolEvidence(data.evidence) }
    }
    case 'progress': {
      strictRecord(value, ['type', 'sequence', 'turn', 'revision', 'preview', 'abbreviated', 'activity'])
      const preview = parseAiPreview(data.preview)
      if (profile.profile === 'fixed-image' || (profile.profile === 'outline' ? profile.input.topicId ? preview.kind !== 'none' && (preview.kind !== 'topic' || preview.topicId !== profile.input.topicId) : !['none', 'text', 'outline'].includes(preview.kind) : !['none', 'model-test-evidence'].includes(preview.kind))) invalid()
      let activity: AiActivityEntry[] | undefined
      if (data.activity !== undefined) {
        if (profile.profile !== 'outline' || !Array.isArray(data.activity) || data.activity.length > aiLimits.activityEntries) invalid()
        activity = data.activity.map(value => {
          const entry = strictRecord(value, ['id', 'label', 'state'])
          const id = boundedText(entry.id, 'Activity', 100)
          if (!/^tool-[1-9][0-9]*$/.test(id)) invalid()
          return { id, label: boundedText(entry.label, 'Activity', aiLimits.labelCharacters), state: choice(entry.state, ['running', 'completed', 'failed']) }
        })
      }
      return { type: 'progress', sequence, turn: natural(data.turn), revision: natural(data.revision), preview,
        ...(data.abbreviated !== undefined ? { abbreviated: flag(data.abbreviated) } : {}), ...(activity ? { activity } : {}) }
    }
    case 'error': strictRecord(value, ['type', 'sequence', 'code']); return { type: 'error', sequence, code: choice(data.code, workerErrorCodes) }
    case 'diagnostic': strictRecord(value, ['type', 'sequence', 'event', 'data']); return { type: 'diagnostic', sequence,
      event: choice(data.event, ['engine.materials', 'engine.request', 'engine.response', 'engine.terminal', 'engine.tool', 'engine.turn', 'engine.transport', 'console.output', 'process.unhandled']), data: data.data }
    case 'result': {
      strictRecord(value, ['type', 'sequence', 'profile', 'result'])
      if (data.profile !== profile.profile) invalid()
      if (profile.profile === 'fixed-image') {
        const result = strictRecord(data.result, ['kind', 'callId', 'imageSlotId'])
        if (result.kind !== 'image' || result.imageSlotId !== profile.input.imageSlotId) invalid()
        return { type: 'result', sequence, profile: 'fixed-image', result: { kind: 'image', callId: identifier(result.callId), imageSlotId: identifier(result.imageSlotId) } }
      }
      if (profile.profile === 'model-access') return { type: 'result', sequence, profile: 'model-access', result: parseProtocolEvidence(data.result, true) }
      const result = strictRecord(data.result, ['kind', 'document', 'question', 'reason', 'coverage', 'projectEdits'])
      let parsed: OutlineEngineResult
      if (result.kind === 'outline') { strictRecord(data.result, ['kind', 'document', 'coverage', 'projectEdits']); parsed = { kind: 'outline', document: parseOutline(result.document) } }
      else if (result.kind === 'needs-details') { strictRecord(data.result, ['kind', 'question', 'reason', 'coverage', 'projectEdits']); parsed = { kind: 'needs-details', question: boundedText(result.question, 'Question', 2000), reason: boundedText(result.reason, 'Reason', 2000) } }
      else invalid()
      if (result.coverage !== undefined) parsed.coverage = parseCoverage(result.coverage)
      if (result.projectEdits !== undefined) parsed.projectEdits = parseProjectFileEdits(result.projectEdits, profile.input.topicWriteRoot)
      if (parsed.kind === 'needs-details' && parsed.projectEdits?.length) invalid()
      return { type: 'result', sequence, profile: 'outline', result: parsed }
    }
    default: invalid()
  }
}
