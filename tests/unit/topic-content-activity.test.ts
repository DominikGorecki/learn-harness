import { describe, expect, it } from 'vitest'
import { AiCoordinator } from '../../src/core/ai/coordinator'
import { aiLimits, boundAiPreview, parseAiActivitySnapshot, parseAiOperationInput, utf8Bytes } from '../../src/shared/ai/activity'
import type { AiOperationInput } from '../../src/shared/ai/activity'
function setup(image = false) {
  const coordinator = new AiCoordinator({ now: () => 0, createId: () => 'operation' })
  const input: AiOperationInput = { kind: image ? 'regenerate-topic-image' : 'generate-topic-content', projectId: 'handle', topicId: 'topic', chapterId: 'chapter', ...(image ? { imageId: 'image' } : {}), model: { id: image ? 'openai/gpt-image-2' : 'gpt-6.1-sol', name: 'Model' }, heading: 'Topic content', requestSummary: '' }
  return { coordinator, input, lease: coordinator.claim(input).lease }
}
describe('chapter and image activity foundation', () => {
  it('admits new producers through the existing lease and rejects competitors', () => {
    const { coordinator, input, lease } = setup()
    expect(() => coordinator.claim({ ...input, kind: 'rewrite-topic', chapterId: undefined })).toThrow()
    expect(lease.settle('paused')).toBe(true)
    expect(coordinator.get().active).toBeNull()
    expect(coordinator.get().settled?.outcome).toBe('paused')
  })
  it('keeps topic/chapter/image identity stable during bounded projections', () => {
    const { coordinator, lease } = setup()
    const progress = { operationId: lease.operationId, projectId: 'handle', topicId: 'topic', turn: 1, revision: 1 }
    expect(lease.progress({ ...progress, preview: { kind: 'chapter', topicId: 'topic', chapterId: 'chapter', sections: [{ id: 'section', text: '😀'.repeat(40_000) }] } })).toBe(true)
    expect(utf8Bytes(JSON.stringify(coordinator.get()))).toBeLessThanOrEqual(aiLimits.frameBytes)
    for (const preview of [{ kind: 'chapter' as const, topicId: 'other', chapterId: 'chapter' }, { kind: 'chapter' as const, topicId: 'topic', chapterId: 'other' }, { kind: 'text' as const, text: 'unscoped' }]) expect(() => lease.progress({ ...progress, revision: 2, preview })).toThrow()
    expect(boundAiPreview({ kind: 'image', topicId: 'topic', chapterId: 'chapter', imageId: 'image', state: 'validating', modelName: 'Long model label' }, 40).preview).toMatchObject({ imageId: 'image', state: 'validating' })
  })
  it('settles incomplete only during publication and preserves cleanup cancellation', async () => {
    const { coordinator, lease } = setup()
    expect(() => lease.settle('incomplete')).toThrow()
    lease.phase('saving')
    expect(() => lease.settle('paused')).toThrow()
    expect(() => lease.settle('candidate')).toThrow()
    expect(lease.settle('incomplete')).toBe(true)
    expect(parseAiActivitySnapshot(coordinator.get()).settled?.outcome).toBe('incomplete')
    const cancelled = setup()
    let exited = false
    cancelled.lease.setCancellation(async () => { exited = true })
    await cancelled.coordinator.cancel({ operationId: cancelled.lease.operationId })
    expect(exited).toBe(true)
    expect(cancelled.coordinator.get().settled?.outcome).toBe('cancelled')
  })
  it('keeps image replacement distinct from publication and rejects mismatched slots', () => {
    const { coordinator, input, lease } = setup(true)
    expect(() => parseAiOperationInput({ ...input, model: { id: 'unapproved', name: 'Model' } })).toThrow()
    expect(() => lease.progress({ operationId: lease.operationId, projectId: 'handle', topicId: 'topic', turn: 1, revision: 1, preview: { kind: 'image', topicId: 'topic', chapterId: 'chapter', imageId: 'other', state: 'candidate' } })).toThrow()
    expect(() => lease.settle('paused')).toThrow()
    lease.phase('saving')
    expect(() => lease.settle('saved')).toThrow()
    expect(() => lease.settle('candidate')).toThrow()
    lease.phase('saving')
    expect(lease.settle('failed')).toBe(true)
    const candidate = setup(true)
    expect(candidate.lease.settle('candidate')).toBe(true)
    expect(candidate.coordinator.get().active).toBeNull()
    expect(coordinator.get().settled?.outcome).toBe('failed')
  })
})
