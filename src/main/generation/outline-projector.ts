import type { AgentEvent } from '@earendil-works/pi-agent-core'
import type { AiActivityEntry, AiPreview, AiPreviewLesson, AiPreviewModule } from '../../shared/ai/activity'
import { aiLimits, boundAiPreview, utf8Bytes } from '../../shared/ai/activity'
import type { MonotonicClock } from './pi-stream-liveness'
import { systemClock } from './pi-stream-liveness'
import { observe } from './observe'

export interface OutlineProjection { turn: number; revision: number; preview: AiPreview; abbreviated: boolean; activity?: AiActivityEntry[] }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function fields(value: unknown, names: string[]): Record<string, string> {
  const source = record(value), result: Record<string, string> = {}
  for (const name of names) if (typeof source[name] === 'string') result[name] = (source[name] as string).replaceAll('\0', '')
  return result
}
function lesson(value: unknown): AiPreviewLesson {
  const source = record(value), result: AiPreviewLesson = fields(value, ['title', 'question', 'overview'])
  if (typeof source.id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(source.id)) result.id = source.id
  if (Array.isArray(source.objectives)) result.objectives = source.objectives.filter((value): value is string => typeof value === 'string').slice(0, 12).map(value => value.replaceAll('\0', ''))
  if (Array.isArray(source.modules)) result.modules = source.modules.slice(0, 12).map(value => fields(value, ['title', 'purpose', 'method', 'task']) as AiPreviewModule)
  return result
}
/** Display-only tolerant projection: final outline parsing/publication never uses this value. */
export function projectOutlinePreview(value: unknown, topicId?: string): AiPreview { return projectOutlineDraft(value, topicId).preview }
export function projectOutlineDraft(value: unknown, topicId?: string): { preview: AiPreview; abbreviated: boolean } {
  const source = record(value)
  if (topicId) {
    const selected = Array.isArray(source.lessons) ? source.lessons.find(value => record(value).id === topicId) : undefined
    const bounded = boundAiPreview({ kind: 'topic', topicId, ...(selected ? { lesson: lesson(selected) } : {}) })
    return { ...bounded, abbreviated: bounded.abbreviated || arraysTruncated(selected) }
  }
  const bounded = boundAiPreview({ kind: 'outline', ...fields(source, ['title', 'overview']),
    ...(Array.isArray(source.lessons) ? { lessons: source.lessons.slice(0, 40).map(lesson) } : {}) })
  return { ...bounded, abbreviated: bounded.abbreviated || Array.isArray(source.lessons) && (source.lessons.length > 40 || source.lessons.slice(0, 40).some(arraysTruncated)) }
}
function arraysTruncated(value: unknown): boolean {
  const source = record(value)
  return Array.isArray(source.objectives) && source.objectives.length > 12 || Array.isArray(source.modules) && source.modules.length > 12
}
const labels: Record<string, string> = { list_materials: 'Inspecting available learning material', list_project_files: 'Inspecting project material',
  read_material: 'Reading learning material', read_project_file: 'Reading project material', write_project_file: 'Preparing topic material',
  submit_outline: 'Checking the draft outline', request_learning_details: 'Checking learning direction' }

/** Pi objects are mutable. Copy only safe fields synchronously; enqueue no transcript or raw tool data. */
export class OutlineProjector {
  private turn = 0
  private revision = 0
  private preview: AiPreview = { kind: 'none' }
  private abbreviated = false
  private candidate: string | null = null
  private structured = false
  private timer: unknown | null = null
  private disposed = false
  private toolNumber = 0
  private calls = new Map<string, string>()
  private readonly clock: MonotonicClock
  constructor(private readonly options: { topicId?: string; signal: AbortSignal; onProgress(frame: OutlineProjection): void; clock?: MonotonicClock }) {
    this.clock = options.clock ?? systemClock
  }
  event(event: AgentEvent): void {
    if (this.disposed || this.options.signal.aborted) return
    if (event.type === 'turn_start') {
      this.turn++; this.revision = 0; this.candidate = null; this.structured = false
      this.preview = this.options.topicId ? { kind: 'topic', topicId: this.options.topicId } : { kind: 'none' }
      this.abbreviated = false; this.queue(); return
    }
    if (event.type === 'message_update') {
      const update = event.assistantMessageEvent
      if (['thinking_start', 'thinking_delta', 'thinking_end'].includes(update.type)) return
      const content = record('partial' in update ? update.partial : event.message).content
      if (['toolcall_start', 'toolcall_delta', 'toolcall_end'].includes(update.type) && Array.isArray(content)) {
        const index = 'contentIndex' in update ? update.contentIndex : -1
        const tool = record(content[index])
        if (tool.type !== 'toolCall' || tool.name !== 'submit_outline' || tool.namespace !== undefined && tool.namespace !== 'learning') return
        const identity = `${this.turn}:${String(tool.id)}`
        if (identity !== this.candidate) { this.candidate = identity; this.structured = true; this.abbreviated = false }
        const draft = projectOutlineDraft(tool.arguments, this.options.topicId)
        this.setPreview(draft.preview, draft.abbreviated); this.queue()
      } else if (!this.structured && !this.options.topicId && ['text_delta', 'text_end'].includes(update.type) && Array.isArray(content)) {
        const prose = content.filter(value => record(value).type === 'text').map(value => typeof record(value).text === 'string' ? record(value).text as string : '').join('\n')
        this.setPreview({ kind: 'text', text: prose.replaceAll('\0', '') }); this.queue()
      }
      return
    }
    if (event.type === 'tool_execution_start') {
      const label = labels[event.toolName]
      if (!label) return
      const id = `tool-${++this.toolNumber}`; this.calls.set(event.toolCallId, id)
      this.flush([{ id, label, state: 'running' }])
    } else if (event.type === 'tool_execution_end') {
      const id = this.calls.get(event.toolCallId), label = labels[event.toolName]
      this.calls.delete(event.toolCallId)
      if (id && label) this.flush([{ id, label: event.isError ? 'Checking and revising the request' : label, state: event.isError ? 'failed' : 'completed' }])
    }
  }
  private setPreview(value: AiPreview, abbreviated = false): void {
    const bounded = boundAiPreview(value)
    this.preview = bounded.preview; this.abbreviated = bounded.abbreviated || abbreviated
  }
  private queue(): void {
    if (this.timer === null) this.timer = this.clock.schedule(() => { this.timer = null; this.flush() }, aiLimits.previewIntervalMs)
  }
  private flush(activity?: AiActivityEntry[]): void {
    if (this.disposed || this.options.signal.aborted) return
    if (this.timer !== null) this.clock.cancel(this.timer)
    this.timer = null
    const frame: OutlineProjection = { turn: this.turn, revision: ++this.revision, preview: this.preview, abbreviated: this.abbreviated, ...(activity ? { activity } : {}) }
    let budget = aiLimits.previewBytes
    while (utf8Bytes(JSON.stringify(frame)) > aiLimits.frameBytes - 1024 && budget > 0) {
      budget = Math.floor(budget / 2); frame.preview = boundAiPreview(frame.preview, budget).preview; frame.abbreviated = true
    }
    // A copy at the boundary detaches nested fields from later candidate/event updates.
    observe(() => this.options.onProgress(structuredClone(frame)))
  }
  finish(): void { this.flush(); this.dispose() }
  dispose(): void { this.disposed = true; if (this.timer !== null) this.clock.cancel(this.timer); this.timer = null; this.calls.clear() }
}
