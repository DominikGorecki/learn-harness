import type { ApiResult, ErrorCode } from '../contracts'
import { ApplicationError } from '../contracts'
import { boundedText, identifier, strictRecord } from '../validation'

export const aiLimits = { previewBytes: 64 * 1024, frameBytes: 96 * 1024, activityEntries: 40, labelCharacters: 256, previewIntervalMs: 100 } as const
export const aiOperationKinds = ['create-outline', 'rewrite-outline', 'rewrite-topic', 'test-sol', 'test-luna'] as const
export type AiOperationKind = typeof aiOperationKinds[number]
export const aiPhases = ['preparing', 'waiting', 'receiving', 'examining', 'planning', 'validating', 'saving', 'cancelling'] as const
export type AiPhase = typeof aiPhases[number]
export const aiOutcomes = ['saved', 'verified', 'unsaved', 'needs-details', 'failed', 'cancelled'] as const
export type AiOutcome = typeof aiOutcomes[number]
export interface AiPreviewModule { title?: string; purpose?: string; method?: string; task?: string }
export interface AiPreviewLesson { id?: string; title?: string; question?: string; overview?: string; objectives?: string[]; modules?: AiPreviewModule[] }
export type AiPreview = { kind: 'none' } | { kind: 'text'; text: string } |
  { kind: 'outline'; title?: string; overview?: string; lessons?: AiPreviewLesson[] } |
  { kind: 'topic'; topicId: string; lesson?: AiPreviewLesson } |
  { kind: 'model-test-evidence'; hasReply: boolean; completed: boolean; modelMatched: boolean }
export interface AiActivityEntry { id: string; label: string; state: 'upcoming' | 'running' | 'completed' | 'failed' }
export interface AiOperationInput {
  kind: AiOperationKind; runId?: string; projectId?: string; topicId?: string;
  model: { id: string; name: string }; heading: string; requestSummary: string
}
export interface AiOperation extends AiOperationInput {
  /** sequence is local to operationId; compare snapshots across owners by revision. */
  operationId: string; sequence: number; phase: AiPhase; outcome: AiOutcome | null; errorCode: ErrorCode | null;
  elapsedMs: number; lastByteAgeMs: number | null; turn: number; previewRevision: number;
  preview: AiPreview; abbreviated: boolean; activity: AiActivityEntry[]; omittedActivityCount: number; canCancel: boolean
}
/** revision increases globally throughout this application session. */
export interface AiActivitySnapshot { revision: number; active: AiOperation | null; settled: AiOperation | null }
export interface CancelAiOperationRequest { operationId: string }
export interface AiApi {
  getAiActivity(): Promise<ApiResult<AiActivitySnapshot>>
  onAiActivityChanged(listener: (snapshot: AiActivitySnapshot) => void): () => void
  cancelAiOperation(request: CancelAiOperationRequest): Promise<ApiResult<AiActivitySnapshot>>
}
export const aiChannels = { get: 'ai:get-activity', changed: 'ai:activity-changed', cancel: 'ai:cancel-operation' } as const
export function parseCancelAiOperation(value: unknown): CancelAiOperationRequest {
  return { operationId: identifier(strictRecord(value, ['operationId']).operationId) }
}
function invalid(): never { throw new ApplicationError('INVALID_INPUT', 'Invalid AI activity frame.') }
function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (!choices.includes(value as T)) invalid()
  return value as T
}
function natural(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalid()
  return value
}
function flag(value: unknown): boolean { if (typeof value !== 'boolean') invalid(); return value }
function text(value: unknown, max = aiLimits.previewBytes): string {
  if (typeof value !== 'string' || value.length > max || value.includes('\0')) invalid()
  return value
}
function optionalTextFields(data: Record<string, unknown>, keys: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const key of keys) if (data[key] !== undefined) result[key] = text(data[key])
  return result
}
function list<T>(value: unknown, max: number, parse: (value: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > max) invalid()
  return value.map(parse)
}
function lesson(value: unknown): AiPreviewLesson {
  const data = strictRecord(value, ['id', 'title', 'question', 'overview', 'objectives', 'modules'])
  const result: AiPreviewLesson = optionalTextFields(data, ['title', 'question', 'overview'])
  if (data.id !== undefined) result.id = identifier(data.id)
  if (data.objectives !== undefined) result.objectives = list(data.objectives, 12, value => text(value))
  if (data.modules !== undefined) result.modules = list(data.modules, 12, value => {
    const module = strictRecord(value, ['title', 'purpose', 'method', 'task'])
    return optionalTextFields(module, ['title', 'purpose', 'method', 'task'])
  })
  return result
}
export function parseAiPreview(value: unknown): AiPreview {
  const discriminator = strictRecord(value, ['kind', 'text', 'title', 'overview', 'lessons', 'topicId', 'lesson', 'hasReply', 'completed', 'modelMatched']).kind
  let result: AiPreview
  switch (discriminator) {
    case 'none': strictRecord(value, ['kind']); result = { kind: 'none' }; break
    case 'text': result = { kind: 'text', text: text(strictRecord(value, ['kind', 'text']).text) }; break
    case 'outline': {
      const data = strictRecord(value, ['kind', 'title', 'overview', 'lessons'])
      result = { kind: 'outline', ...optionalTextFields(data, ['title', 'overview']) }
      if (data.lessons !== undefined) result.lessons = list(data.lessons, 40, lesson)
      break
    }
    case 'topic': {
      const data = strictRecord(value, ['kind', 'topicId', 'lesson'])
      result = { kind: 'topic', topicId: identifier(data.topicId) }
      if (data.lesson !== undefined) result.lesson = lesson(data.lesson)
      if (result.lesson !== undefined && result.lesson.id !== result.topicId) invalid()
      break
    }
    case 'model-test-evidence': {
      const data = strictRecord(value, ['kind', 'hasReply', 'completed', 'modelMatched'])
      result = { kind: 'model-test-evidence', hasReply: flag(data.hasReply), completed: flag(data.completed), modelMatched: flag(data.modelMatched) }; break
    }
    default: invalid()
  }
  if (previewTextBytes(result) > aiLimits.previewBytes) invalid()
  return result
}
/** UTF-8 count without Node globals, including replacement encoding of lone surrogates. */
export function utf8Bytes(value: string): number {
  let bytes = 0
  for (const point of value) { const code = point.codePointAt(0)!; bytes += code < 128 ? 1 : code < 2048 ? 2 : code < 65536 ? 3 : 4 }
  return bytes
}
export function previewTextBytes(value: AiPreview): number {
  const count = (value: unknown): number => typeof value === 'string' ? utf8Bytes(value) :
    Array.isArray(value) ? value.reduce((total, item) => total + count(item), 0) :
      value && typeof value === 'object' ? Object.entries(value).reduce((total, [key, item]) => total + (key === 'kind' ? 0 : count(item)), 0) : 0
  return count(value)
}
/** Trusted projection input only; parser below independently checks the bounded result. */
export function boundAiPreview(preview: AiPreview, budget: number = aiLimits.previewBytes): { preview: AiPreview; abbreviated: boolean } {
  let remaining = budget, abbreviated = false
  const copy = (value: unknown, key = ''): unknown => {
    if (typeof value === 'string') {
      if (key === 'kind' || key === 'id' || key === 'topicId') return value
      let result = ''
      for (const point of value) { const bytes = utf8Bytes(point); if (bytes > remaining) { abbreviated = true; break }; result += point; remaining -= bytes }
      return result
    }
    if (Array.isArray(value)) return value.map(item => copy(item))
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item, key)]))
    return value
  }
  // Reserve identifiers before prose so truncation never changes stable topic identity.
  const identifiers = (value: unknown): number => value && typeof value === 'object' ? Object.entries(value).reduce((sum, [key, item]) => sum +
    ((key === 'id' || key === 'topicId') && typeof item === 'string' ? utf8Bytes(item) : identifiers(item)), 0) : 0
  remaining = Math.max(0, budget - identifiers(preview))
  const bounded = copy(preview) as AiPreview
  return { preview: parseAiPreview(bounded), abbreviated }
}
export function parseAiOperationInput(value: unknown): AiOperationInput {
  const data = strictRecord(value, ['kind', 'runId', 'projectId', 'topicId', 'model', 'heading', 'requestSummary'])
  const model = strictRecord(data.model, ['id', 'name'])
  const result: AiOperationInput = { kind: choice(data.kind, aiOperationKinds), model: { id: boundedText(model.id, 'Model', 128), name: boundedText(model.name, 'Model', 256) },
    heading: boundedText(data.heading, 'Heading', 256), requestSummary: boundedText(data.requestSummary, 'Request summary', 512, true) }
  for (const key of ['runId', 'projectId', 'topicId'] as const) if (data[key] !== undefined) result[key] = identifier(data[key])
  const diagnostic = result.kind === 'test-sol' || result.kind === 'test-luna'
  if (diagnostic ? Boolean(result.runId || result.projectId || result.topicId) : !result.projectId) invalid()
  if (result.kind === 'rewrite-topic' ? !result.topicId : result.topicId !== undefined) invalid()
  if (diagnostic && result.model.id !== (result.kind === 'test-sol' ? 'gpt-6.1-sol' : 'gpt-6-luna')) invalid()
  return result
}
const errorCodes: ErrorCode[] = ['INVALID_INPUT', 'NOT_FOUND', 'FORBIDDEN', 'INTERNAL', 'AUTH_REQUIRED', 'PLAN_PERMISSION_REQUIRED', 'ACCESS_RESTRICTED', 'USAGE_LIMIT', 'NETWORK', 'CANCELLED', 'BUSY', 'UNAVAILABLE', 'STORAGE', 'CONFLICT']
export function parseAiActivitySnapshot(value: unknown): AiActivitySnapshot {
  const data = strictRecord(value, ['revision', 'active', 'settled'])
  const operation = (value: unknown): AiOperation | null => {
    if (value === null) return null
    const data = strictRecord(value, ['kind', 'runId', 'projectId', 'topicId', 'model', 'heading', 'requestSummary', 'operationId', 'sequence', 'phase', 'outcome', 'errorCode', 'elapsedMs', 'lastByteAgeMs', 'turn', 'previewRevision', 'preview', 'abbreviated', 'activity', 'omittedActivityCount', 'canCancel'])
    const input = parseAiOperationInput(Object.fromEntries(['kind', 'runId', 'projectId', 'topicId', 'model', 'heading', 'requestSummary'].filter(key => data[key] !== undefined).map(key => [key, data[key]])))
    const result: AiOperation = { ...input, operationId: identifier(data.operationId), sequence: natural(data.sequence), phase: choice(data.phase, aiPhases),
      outcome: data.outcome === null ? null : choice(data.outcome, aiOutcomes), errorCode: data.errorCode === null ? null : choice(data.errorCode, errorCodes),
      elapsedMs: natural(data.elapsedMs), lastByteAgeMs: data.lastByteAgeMs === null ? null : natural(data.lastByteAgeMs), turn: natural(data.turn), previewRevision: natural(data.previewRevision),
      preview: parseAiPreview(data.preview), abbreviated: flag(data.abbreviated), omittedActivityCount: natural(data.omittedActivityCount), canCancel: flag(data.canCancel),
      activity: list(data.activity, aiLimits.activityEntries, value => { const entry = strictRecord(value, ['id', 'label', 'state']); return { id: identifier(entry.id), label: text(entry.label, 256), state: choice(entry.state, ['upcoming', 'running', 'completed', 'failed']) } }) }
    if (input.kind === 'rewrite-topic' && result.preview.kind !== 'none' && (result.preview.kind !== 'topic' || result.preview.topicId !== input.topicId)) invalid()
    if ((input.kind === 'test-sol' || input.kind === 'test-luna') && !['none', 'model-test-evidence'].includes(result.preview.kind)) invalid()
    if (input.kind.startsWith('test-') && (result.phase === 'saving' || result.outcome !== null && ['saved', 'unsaved', 'needs-details'].includes(result.outcome))) invalid()
    if (!input.kind.startsWith('test-') && result.outcome === 'verified') invalid()
    if (result.canCancel && (result.outcome !== null || result.phase === 'saving' || result.phase === 'cancelling')) invalid()
    return result
  }
  const result = { revision: natural(data.revision), active: operation(data.active), settled: operation(data.settled) }
  if (result.active && result.active.outcome !== null || result.settled && result.settled.outcome === null) invalid()
  if (utf8Bytes(JSON.stringify(result)) > aiLimits.frameBytes) invalid()
  return result
}
