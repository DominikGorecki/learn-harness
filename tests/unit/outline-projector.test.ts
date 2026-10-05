import type { AgentEvent } from '@earendil-works/pi-agent-core'
import { describe, expect, it } from 'vitest'
import { OutlineProjector, projectOutlineDraft } from '../../src/main/generation/outline-projector'
import type { OutlineProjection } from '../../src/main/generation/outline-projector'
import { outlineActivity } from '../../src/main/generation/outline-activity'
import { AiCoordinator } from '../../src/core/ai/coordinator'
import { aiLimits, parseAiPreview, utf8Bytes } from '../../src/shared/ai/activity'
import { parseWorkerReply } from '../../src/main/generation/worker-protocol'
import { FakeMonotonicClock } from '../fixtures/monotonic-clock'

function event(value: unknown): AgentEvent { return value as AgentEvent }
function draft(arguments_: unknown, id = 'PRIVATE_CALL') {
  return event({ type: 'message_update', assistantMessageEvent: { type: 'toolcall_delta', contentIndex: 0,
    partial: { content: [{ type: 'toolCall', id, name: 'submit_outline', namespace: 'learning', arguments: arguments_ }] } } })
}
function setup(topicId?: string) {
  const clock = new FakeMonotonicClock(), signal = new AbortController(), frames: OutlineProjection[] = []
  const projector = new OutlineProjector({ topicId, clock, signal: signal.signal, onProgress: frame => { frames.push(frame) } })
  projector.event(event({ type: 'turn_start' }))
  return { clock, signal, frames, projector }
}
describe('safe outline streaming projection', () => {
  it('projects incomplete tool arguments, copies mutable Pi data, and replaces repair candidates', () => {
    const { projector, frames, clock } = setup()
    const partial = { title: 'First candidate', lessons: [{ id: 'one', title: 'A topic', modules: [{ task: 'Try it', baseline: 'PRIVATE_BASELINE' }] }], thinking: 'PRIVATE_THOUGHT', token: 'PRIVATE_TOKEN' }
    projector.event(draft(partial)); partial.title = 'Mutated after delivery'; clock.advance(100)
    expect(frames[0]?.preview).toMatchObject({ kind: 'outline', title: 'First candidate' })
    expect(JSON.stringify(frames)).not.toMatch(/PRIVATE_/)
    projector.event(draft({ title: 'Repaired candidate' }, 'PRIVATE_REPAIR')); clock.advance(100)
    expect(frames.at(-1)?.preview).toEqual({ kind: 'outline', title: 'Repaired candidate' })
    projector.event(event({ type: 'turn_start' })); projector.event(draft({ title: 'New turn' })); clock.advance(100)
    expect(frames.at(-1)).toMatchObject({ turn: 2, preview: { title: 'New turn' } }); projector.dispose(); expect(clock.timers.size).toBe(0)
  })
  it('shows only a selected stable topic, never guessed positions or unrelated fields', () => {
    const { projector, frames, clock } = setup('selected')
    projector.event(draft({ title: 'PRIVATE_PROJECT', lessons: [{ id: 'other', title: 'PRIVATE_OTHER' }, { title: 'PRIVATE_GUESS' }] })); clock.advance(100)
    expect(frames[0]?.preview).toEqual({ kind: 'topic', topicId: 'selected' })
    projector.event(draft({ lessons: [{ id: 'other', title: 'PRIVATE_OTHER' }, { id: 'selected', title: 'Selected topic' }] })); clock.advance(100)
    expect(frames.at(-1)?.preview).toEqual({ kind: 'topic', topicId: 'selected', lesson: { id: 'selected', title: 'Selected topic' } })
    expect(JSON.stringify(frames)).not.toMatch(/PRIVATE_/); projector.dispose()
  })
  it('records truncation of prose/arrays and accounts for escaped wire size without limiting final results', () => {
    expect(projectOutlineDraft({ title: 'x'.repeat(100_000) }).abbreviated).toBe(true)
    expect(projectOutlineDraft({ lessons: Array.from({ length: 41 }, () => ({})) }).abbreviated).toBe(true)
    expect(projectOutlineDraft({ lessons: [{ objectives: Array(13).fill('a'), modules: Array(13).fill({}) }] }).abbreviated).toBe(true)
    const { projector, frames, clock } = setup()
    projector.event(draft({ title: '\u0001'.repeat(100_000) })); clock.advance(100)
    expect(frames[0]?.abbreviated).toBe(true); expect(utf8Bytes(JSON.stringify(frames[0]))).toBeLessThan(aiLimits.frameBytes)
    expect(() => parseAiPreview(frames[0]!.preview)).not.toThrow()
    projector.event(draft({ title: 'Complete small repair' }, 'next')); clock.advance(100)
    expect(frames.at(-1)?.abbreviated).toBe(false); projector.dispose()
  })
  it('ignores private thoughts/tool payloads and completes reads only after successful execution', () => {
    const { projector, frames, clock, signal } = setup()
    projector.event(event({ type: 'message_update', assistantMessageEvent: { type: 'thinking_delta', partial: { content: [{ type: 'thinking', thinking: 'PRIVATE_THOUGHT' }] } } }))
    projector.event(event({ type: 'tool_execution_start', toolName: 'read_project_file', toolCallId: 'PRIVATE_CALL', args: { path: 'PRIVATE_PATH' } }))
    expect(frames.at(-1)?.activity).toEqual([{ id: 'tool-1', label: 'Reading project material', state: 'running' }])
    projector.event(event({ type: 'tool_execution_end', toolName: 'read_project_file', toolCallId: 'PRIVATE_CALL', isError: true, result: 'PRIVATE_READ' }))
    expect(frames.at(-1)?.activity).toEqual([{ id: 'tool-1', label: 'Checking and revising the request', state: 'failed' }])
    projector.event(event({ type: 'tool_execution_start', toolName: 'read_project_file', toolCallId: 'next' }))
    projector.event(event({ type: 'tool_execution_end', toolName: 'read_project_file', toolCallId: 'next', isError: false }))
    expect(frames.at(-1)?.activity?.[0]?.state).toBe('completed'); expect(JSON.stringify(frames)).not.toMatch(/PRIVATE_/)
    const count = frames.length; signal.abort(); projector.event(draft({ title: 'Late result' })); clock.advance(1000); expect(frames).toHaveLength(count); projector.dispose()
  })
  it('validates the private progress scope and excludes forged tool identifiers', () => {
    const profile = { profile: 'outline' as const, input: { model: { id: 'model', name: 'Model' }, brief: '', accessToken: 'PRIVATE', baseUrl: 'https://example.test', topicId: 'selected' } }
    const frame = { type: 'progress', sequence: 1, turn: 1, revision: 1, preview: { kind: 'topic', topicId: 'selected', lesson: { id: 'selected', title: 'Safe' } }, abbreviated: true, activity: [{ id: 'tool-1', label: 'Reading project material', state: 'completed' }] }
    expect(parseWorkerReply(frame, profile)).toEqual(frame)
    expect(() => parseWorkerReply({ ...frame, preview: { kind: 'outline', title: 'Other scope' } }, profile)).toThrow()
    expect(() => parseWorkerReply({ ...frame, activity: [{ id: 'PRIVATE_RAW_CALL', label: 'Raw', state: 'completed' }] }, profile)).toThrow()
  })
})
describe('main ordering and byte evidence', () => {
  it('preserves the current draft through transport reports and rejects stale or cancelled updates', async () => {
    const clock = new FakeMonotonicClock(), ai = new AiCoordinator({ now: () => clock.now(), createId: () => 'operation', schedule: (fn, delay) => clock.schedule(fn, delay), cancelScheduled: handle => clock.cancel(handle) })
    const { lease } = ai.claim({ kind: 'create-outline', projectId: 'project', model: { id: 'model', name: 'Model' }, heading: 'Create', requestSummary: 'Learn' })
    lease.setCancellation(async () => {})
    const activity = outlineActivity(lease, { projectId: 'project' })
    activity.onProgress({ type: 'progress', sequence: 1, turn: 1, revision: 1, preview: { kind: 'outline', title: 'Draft' } })
    clock.advance(1000)
    const state = { turn: 1, stage: 'receiving' as const, bytes: 100, chunks: 1, events: 1, lastByteAgeMs: 100, semanticAgeMs: 100, waiting: false, reason: null }
    activity.onTransport(state); expect(ai.get().active).toMatchObject({ preview: { title: 'Draft' }, lastByteAgeMs: 100 })
    clock.advance(1000); activity.onTransport({ ...state, lastByteAgeMs: 0 }); expect(ai.get().active?.lastByteAgeMs).toBe(1100)
    activity.onProgress({ type: 'progress', sequence: 2, turn: 1, revision: 1, preview: { kind: 'none' } }); expect(ai.get().active?.preview).toMatchObject({ title: 'Draft' })
    await ai.cancel({ operationId: lease.operationId }); activity.onTransport({ ...state, bytes: 200 }); activity.onProgress({ type: 'progress', sequence: 3, turn: 2, revision: 2, preview: { kind: 'text', text: 'Late' } })
    expect(ai.get().settled).toMatchObject({ outcome: 'cancelled', preview: { title: 'Draft' } }); await ai.dispose()
  })
})
