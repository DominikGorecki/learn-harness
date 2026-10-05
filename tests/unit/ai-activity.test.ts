import { describe, expect, it } from 'vitest'
import { AiCoordinator } from '../../src/core/ai/coordinator'
import { aiLimits, boundAiPreview, parseAiActivitySnapshot, parseAiPreview, parseCancelAiOperation, previewTextBytes, utf8Bytes } from '../../src/shared/ai/activity'
import { parseOutline } from '../../src/shared/outline'

function setup(topic = false) {
  const coordinator = new AiCoordinator({ now: () => 0, createId: () => 'operation' })
  const { lease } = coordinator.claim({ kind: topic ? 'rewrite-topic' : 'create-outline', projectId: 'project', ...(topic ? { topicId: 'topic' } : {}),
    model: { id: 'model', name: 'Model' }, heading: 'Creating an outline', requestSummary: '' })
  return { coordinator, lease }
}
describe('bounded provisional AI activity contracts', () => {
  it('accepts incomplete display fields without weakening accepted-outline parsing', () => {
    const preview = { kind: 'outline', title: 'Early draft', lessons: [{ title: 'First idea', modules: [{ task: 'Compare examples' }] }] }
    expect(parseAiPreview(preview)).toEqual(preview)
    expect(() => parseOutline(preview)).toThrow()
    expect(parseAiPreview({ kind: 'topic', topicId: 'topic' })).toEqual({ kind: 'topic', topicId: 'topic' })
    for (const value of [{ ...preview, rawArguments: 'secret' }, { kind: 'text', text: 1 }, { kind: 'model-test-evidence', hasReply: true, completed: false, modelMatched: false, reply: 'private' }]) expect(() => parseAiPreview(value)).toThrow()
  })
  it('counts and truncates UTF-8 at code point boundaries including non-BMP text', () => {
    expect(utf8Bytes('aé漢😀\ud800')).toBe(13)
    const bounded = boundAiPreview({ kind: 'text', text: '😀'.repeat(40_000) })
    expect(bounded.abbreviated).toBe(true)
    expect(previewTextBytes(bounded.preview)).toBe(aiLimits.previewBytes)
    expect(() => parseAiPreview({ kind: 'text', text: '😀'.repeat(40_000) })).toThrow()
  })
  it('enforces actual serialized frame bytes including JSON escapes and metadata', () => {
    const { coordinator, lease } = setup()
    expect(lease.progress({ operationId: lease.operationId, projectId: 'project', turn: 1, revision: 1,
      preview: { kind: 'text', text: '\u0001'.repeat(65_536) } })).toBe(true)
    const snapshot = coordinator.get()
    expect(snapshot.active?.abbreviated).toBe(true)
    expect(utf8Bytes(JSON.stringify(snapshot))).toBeLessThanOrEqual(aiLimits.frameBytes)
    expect(parseAiActivitySnapshot(snapshot)).toEqual(snapshot)
    const forged = { ...snapshot, active: { ...snapshot.active, preview: { kind: 'text', text: '\u0001'.repeat(65_536) } } }
    expect(() => parseAiActivitySnapshot(forged)).toThrow()
  })
  it('retains only forty bounded actual entries with cumulative omitted count', () => {
    const { coordinator, lease } = setup()
    for (let revision = 0; revision < 80; revision++) lease.progress({ operationId: lease.operationId, projectId: 'project', turn: 1, revision,
      preview: { kind: 'none' }, activity: [{ id: `step-${revision}`, label: 'L'.repeat(1000), state: 'running' }] })
    const operation = coordinator.get().active!
    expect(operation.activity).toHaveLength(40); expect(operation.omittedActivityCount).toBe(40)
    expect(operation.activity[0]!.id).toBe('step-40'); expect(operation.activity[0]!.label).toHaveLength(256)
    lease.progress({ operationId: lease.operationId, projectId: 'project', turn: 1, revision: 81, preview: { kind: 'none' },
      activity: [{ id: 'step-79', label: 'Read succeeded', state: 'completed' }] })
    expect(coordinator.get().active!.omittedActivityCount).toBe(40)
  })
  it('rejects cross-topic previews and does not expose arbitrary text in diagnostic state', () => {
    const { coordinator, lease } = setup(true)
    const base = { operationId: lease.operationId, projectId: 'project', topicId: 'topic', turn: 1, revision: 1 }
    for (const preview of [{ kind: 'topic' as const, topicId: 'other' }, { kind: 'topic' as const, topicId: 'topic', lesson: { id: 'other' } }, { kind: 'topic' as const, topicId: 'topic', lesson: { title: 'Unidentified candidate' } }, { kind: 'outline' as const }]) {
      expect(() => lease.progress({ ...base, preview })).toThrow()
      expect(coordinator.get().active?.preview).toEqual({ kind: 'none' })
    }
    const diagnostic = new AiCoordinator({ now: () => 0, createId: () => 'diagnostic' })
    const test = diagnostic.claim({ kind: 'test-sol', model: { id: 'gpt-6.1-sol', name: 'Sol' }, heading: 'Testing Sol', requestSummary: '' }).lease
    expect(() => test.progress({ operationId: test.operationId, turn: 1, revision: 1, preview: { kind: 'text', text: 'secret reply' } })).toThrow()
    expect(test.progress({ operationId: test.operationId, turn: 1, revision: 1, preview: { kind: 'model-test-evidence', hasReply: true, completed: false, modelMatched: false } })).toBe(true)
  })
  it('strictly parses cancellation, rejects privileged fields and invalid activity counters', () => {
    expect(parseCancelAiOperation({ operationId: 'operation' })).toEqual({ operationId: 'operation' })
    for (const input of [undefined, {}, { operationId: 'a/b' }, { operationId: 'operation', timeout: 0 }, { operationId: 'operation', projectId: 'project' }]) expect(() => parseCancelAiOperation(input)).toThrow()
    const { coordinator } = setup(), snapshot = coordinator.get()
    for (const patch of [{ sequence: -1 }, { turn: Infinity }, { canCancel: 'yes' }, { accessToken: 'secret' }]) expect(() => parseAiActivitySnapshot({ ...snapshot, active: { ...snapshot.active, ...patch } })).toThrow()
  })
})
