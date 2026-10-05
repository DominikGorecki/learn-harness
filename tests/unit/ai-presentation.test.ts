import { describe, expect, it, vi } from 'vitest'
import { aiAdmissionUnavailable, AiStartGate, modelTestAdmission, newerActivity, presentationOutcome, projectNavigationState, recoveryPreview } from '../../src/renderer/src/features/ai/activity-state'
import type { AccountSnapshot } from '../../src/shared/account'
import { parseOutline } from '../../src/shared/outline'
import { AiCoordinator } from '../../src/core/ai/coordinator'
import type { AiActivitySnapshot, AiOperation } from '../../src/shared/ai/activity'
import { previewTextBytes } from '../../src/shared/ai/activity'
import type { OutlineRun } from '../../src/shared/generation'
import { learningOutline } from '../fixtures/learning-outline'

const operation = (sequence = 1): AiOperation => ({ operationId: `op-${sequence}`, sequence, kind: 'create-outline', projectId: 'project', runId: 'run',
  heading: 'Creating an outline', requestSummary: 'Learn', model: { id: 'model', name: 'Model' }, phase: 'waiting', outcome: null, errorCode: null,
  elapsedMs: 0, lastByteAgeMs: null, turn: 1, previewRevision: 1, preview: { kind: 'none' }, abbreviated: false, activity: [], omittedActivityCount: 0, canCancel: true })
const frame = (revision = 1, sequence = 1): AiActivitySnapshot => ({ revision, active: operation(sequence), settled: null })
function run(): OutlineRun { return { id: 'run', projectId: 'project', brief: 'Learn', modelId: 'model', status: 'unsaved', message: 'Not saved', errorCode: 'STORAGE', question: null, coverage: null,
  result: { generatedAt: '2026-10-05T12:00:00Z', model: { id: 'model', name: 'Model' }, brief: 'Learn', inferredBrief: null, document: learningOutline(), coverage: { files: [], limitations: [] } } } }
describe('AI presentation ownership', () => {
  it('accepts a real next lease even when its operation sequence restarts below the terminal sequence', async () => {
    let id = 0
    const coordinator = new AiCoordinator({ now: () => 0, createId: () => `owner-${++id}` })
    const first = coordinator.claim({ kind: 'test-sol', model: { id: 'gpt-6.1-sol', name: 'Sol' }, heading: 'Testing Sol', requestSummary: '' }).lease
    first.phase('waiting'); first.phase('receiving'); first.phase('validating'); first.settle('verified')
    const terminal = coordinator.get()
    const gate = new AiStartGate(), changed = vi.fn()
    await gate.run(async () => {
      coordinator.claim({ kind: 'test-luna', model: { id: 'gpt-6-luna', name: 'Luna' }, heading: 'Testing Luna', requestSummary: '' }).lease.setCancellation(async () => {})
      return 'accepted'
    }, async () => { gate.observe(coordinator.get()) }, () => false, terminal.revision, changed)
    const next = coordinator.get()
    expect(next.active!.sequence).toBeLessThan(terminal.settled!.sequence)
    expect(newerActivity(terminal, next)).toEqual(next)
    expect(changed.mock.calls).toEqual([[true], [false]])
    await coordinator.cancel({ operationId: next.active!.operationId })
    await coordinator.dispose()
  })
  it('ignores stale initial queries, older revisions and late previous-owner frames', () => {
    const current = frame(5, 2)
    expect(newerActivity(current, frame(1))).toBe(current)
    expect(newerActivity(current, { ...frame(6, 1), active: { ...operation(1), operationId: current.active!.operationId } })).toBe(current)
    expect(newerActivity(current, frame(5, 2))).toBe(current)
    expect(newerActivity(current, frame(6, 2)).revision).toBe(6)
    expect(newerActivity(current, frame(6, 1)).active?.operationId).toBe('op-1') // New owners restart their per-operation sequence.
  })
  it('returns acceptance before a delayed query but blocks every competing start until owner confirmation', async () => {
    const gate = new AiStartGate(), changed = vi.fn(), other = vi.fn(async () => 'other')
    let resolve!: () => void
    const query = new Promise<void>(done => { resolve = done })
    expect(await gate.run(async () => 'accepted', () => query, () => false, -1, changed)).toBe('accepted')
    expect(changed.mock.calls).toEqual([[true]])
    expect(await gate.run(other, async () => {}, () => false, -1, changed)).toBeNull()
    expect(other).not.toHaveBeenCalled()
    gate.observe(frame())
    expect(changed.mock.calls).toEqual([[true], [false]])
    resolve(); await query
    expect(await gate.run(other, async () => {}, () => true, 1, changed)).toBeNull()
  })
  it('holds a synchronous subscription until admission resolves and releases rejected starts promptly', async () => {
    const gate = new AiStartGate(), changed = vi.fn()
    let resolve!: (value: string) => void
    const response = new Promise<string>(done => { resolve = done })
    const result = gate.run(() => response, async () => {}, () => false, -1, changed)
    gate.observe(frame()); expect(changed.mock.calls).toEqual([[true]])
    resolve('accepted'); await result; expect(changed.mock.calls.at(-1)).toEqual([false])
    expect(await gate.run(async () => null, async () => {}, () => false, 1, changed)).toBeNull()
    expect(changed.mock.calls.slice(-2)).toEqual([[true], [false]])
  })
  it('requires initial sync and keeps accepted ownership guarded through an older query or failed resync', async () => {
    const gate = new AiStartGate(), changed = vi.fn(), action = vi.fn(async () => 'accepted')
    let latest: AiActivitySnapshot | null = null
    expect(await gate.run(action, async () => {}, () => aiAdmissionUnavailable(latest), -1, changed)).toBeNull()
    expect(action).not.toHaveBeenCalled()
    latest = { revision: 4, active: null, settled: { ...operation(2), outcome: 'saved', canCancel: false } }
    expect(await gate.run(action, async () => { await Promise.reject(new Error('query unavailable')).catch(() => {}) }, () => aiAdmissionUnavailable(latest), 4, changed)).toBe('accepted')
    gate.observe(latest)
    expect(changed.mock.calls).toEqual([[true]])
    expect(await gate.run(action, async () => {}, () => false, 4, changed)).toBeNull()
    gate.observe(frame(5, 3))
    expect(changed.mock.calls.at(-1)).toEqual([false])
  })
  it('recognizes an already-verified diagnostic no-op without waiting for a fictional new owner', async () => {
    const verified: AccountSnapshot = { status: 'connected', name: null, email: null, message: null, persistence: 'local', models: [], modelsStatus: 'ready', canReopenBrowser: false,
      modelTestStatus: 'verified', modelTestMessage: 'Verified', modelTestTarget: 'gpt-6.1-sol', verifiedModelIds: ['gpt-6.1-sol'] }
    const gate = new AiStartGate(), changed = vi.fn(), query = vi.fn(async () => {})
    expect(await gate.run(async () => modelTestAdmission(verified), query, () => false, 2, changed)).toBeNull()
    expect(query).not.toHaveBeenCalled()
    expect(changed.mock.calls).toEqual([[true], [false]])
    expect(modelTestAdmission({ ...verified, modelTestStatus: 'testing' })).not.toBeNull()
  })
  it('guards pending navigation and uses AI ownership before delayed generation state', () => {
    expect(projectNavigationState(null, null, true)).toMatchObject({ busy: true, canProceed: false })
    expect(projectNavigationState(operation(), null, false)).toMatchObject({ busy: true, canProceed: true })
    expect(projectNavigationState({ ...operation(), phase: 'saving', canCancel: false }, null, false)).toMatchObject({ saving: true, canProceed: false })
    expect(projectNavigationState(null, { ...run(), status: 'saving' }, false)).toMatchObject({ saving: true, canProceed: false })
    expect(projectNavigationState({ ...operation(), projectId: undefined, runId: undefined, kind: 'test-sol' }, null, false)).toMatchObject({ busy: false, canProceed: true })
  })
  it('uses matching domain retry progress and success instead of a historical unsaved terminal', () => {
    const op = { ...operation(), outcome: 'unsaved' as const }
    expect(presentationOutcome(op, { ...run(), status: 'saving' })).toBe('saving')
    expect(presentationOutcome(op, { ...run(), status: 'saved' })).toBe('saved')
    expect(presentationOutcome(op, { ...run(), id: 'other', status: 'saved' })).toBe('unsaved')
  })
  it('bounds recovery display while preserving the full accepted result and topic locality', () => {
    const recovery = run()
    recovery.result!.document.lessons = Array.from({ length: 20 }, (_, index) => ({ ...structuredClone(recovery.result!.document.lessons[index % 2]!), id: `lesson-${index}`, title: `Accepted lesson ${index}`, overview: 'Accepted context. '.repeat(250) }))
    recovery.result!.document.startingLessonId = 'lesson-0'
    recovery.result!.document = parseOutline(recovery.result!.document)
    const before = structuredClone(recovery.result)
    const projected = recoveryPreview(recovery)
    expect(projected.abbreviated).toBe(true)
    expect(previewTextBytes(projected.preview)).toBeLessThanOrEqual(64 * 1024)
    expect(recovery.result).toEqual(before)
    expect(JSON.stringify(projected.preview)).not.toContain('startingLessonId')
    recovery.topicId = 'lesson-2'
    const topic = recoveryPreview(recovery)
    expect(topic.preview).toMatchObject({ kind: 'topic', topicId: 'lesson-2', lesson: { id: 'lesson-2' } })
    expect(JSON.stringify(topic.preview)).not.toContain('lesson-3')
  })
})
