import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AiCoordinator } from '../../src/core/ai/coordinator'
import type { AiLease } from '../../src/core/ai/coordinator'
import type { AiOperationInput, AiOutcome } from '../../src/shared/ai/activity'

const educational: AiOperationInput = { kind: 'create-outline', projectId: 'project', runId: 'run', model: { id: 'model', name: 'Model' }, heading: 'Creating an outline', requestSummary: 'History' }
const diagnostic: AiOperationInput = { kind: 'test-sol', model: { id: 'gpt-6.1-sol', name: 'Sol' }, heading: 'Testing Sol', requestSummary: '' }
function deferred() { let resolve!: () => void; const promise = new Promise<void>(finish => { resolve = finish }); return { promise, resolve } }
function setup() { let id = 0; return new AiCoordinator({ now: () => Date.now(), createId: () => `operation-${++id}` }) }
function progress(lease: AiLease, revision: number, text = 'Draft') { return { operationId: lease.operationId, projectId: 'project', turn: 1, revision, preview: { kind: 'text' as const, text } } }

describe('global AI ownership', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0) })
  afterEach(() => vi.useRealTimers())
  it('claims before delayed authorization and never executes a competing producer', async () => {
    const coordinator = setup(), authorization = deferred(), started = vi.fn()
    const first = coordinator.claim(educational)
    const work = authorization.promise.then(started)
    expect(() => coordinator.claim(diagnostic)).toThrowError(expect.objectContaining({ code: 'BUSY' }))
    expect(() => coordinator.claim({ ...educational, projectId: 'other' })).toThrowError(expect.objectContaining({ code: 'BUSY' }))
    expect(started).not.toHaveBeenCalled()
    authorization.resolve(); await work
    expect(started).toHaveBeenCalledOnce()
    expect(coordinator.isOwner(first.lease)).toBe(true)
  })
  it('reuses only the same fixed diagnostic and rejects the other target', () => {
    const coordinator = setup(), first = coordinator.claim(diagnostic)
    expect(coordinator.claim(diagnostic)).toEqual({ lease: first.lease, reused: true })
    expect(() => coordinator.claim({ ...diagnostic, kind: 'test-luna', model: { id: 'gpt-6-luna', name: 'Luna' } })).toThrowError(expect.objectContaining({ code: 'BUSY' }))
    expect(coordinator.get().revision).toBe(1)
  })
  it.each(['saved', 'unsaved', 'needs-details', 'failed', 'cancelled'] as AiOutcome[])('releases exactly once for %s and retains a terminal presentation', async outcome => {
    const coordinator = setup(), { lease } = coordinator.claim(educational)
    if (outcome === 'saved') lease.phase('saving')
    expect(lease.settle(outcome)).toBe(true)
    expect(await lease.settled).toBe(outcome)
    expect(lease.settle('failed')).toBe(false)
    expect(lease.progress(progress(lease, 1))).toBe(false)
    expect(lease.phase('receiving')).toBe(false)
    expect(coordinator.get().active).toBeNull()
    expect(coordinator.get().settled?.outcome).toBe(outcome)
    const next = coordinator.claim(diagnostic)
    expect(coordinator.get().settled).toBeNull()
    expect(next.lease.settle('verified')).toBe(true)
  })
  it('requires a saving transition for saved outcome and protects publication', async () => {
    const coordinator = setup(), { lease } = coordinator.claim(educational), cleanup = vi.fn(async () => {})
    lease.setCancellation(cleanup)
    expect(() => lease.settle('saved')).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    lease.phase('validating'); lease.phase('saving')
    expect(lease.phase('receiving')).toBe(false)
    await expect(coordinator.cancel({ operationId: lease.operationId })).rejects.toMatchObject({ code: 'BUSY' })
    expect(cleanup).not.toHaveBeenCalled()
    expect(lease.signal.aborted).toBe(false)
    const disposed = coordinator.dispose()
    expect(coordinator.isOwner(lease)).toBe(true)
    lease.settle('saved'); await disposed
  })
  it('aborts immediately but waits for worker cleanup before release; concurrent cancel cleans up once', async () => {
    const coordinator = setup(), { lease } = coordinator.claim(educational), exited = deferred()
    const cleanup = vi.fn(() => exited.promise)
    lease.setCancellation(cleanup); lease.progress(progress(lease, 1))
    const cancellation = coordinator.cancel({ operationId: lease.operationId })
    const duplicate = coordinator.cancel({ operationId: lease.operationId })
    expect(lease.signal.aborted).toBe(true)
    expect(coordinator.get().active?.phase).toBe('cancelling')
    expect(lease.phase('saving')).toBe(false)
    expect(lease.progress(progress(lease, 2))).toBe(false)
    expect(lease.settle('failed')).toBe(false)
    expect(() => coordinator.claim(diagnostic)).toThrowError(expect.objectContaining({ code: 'BUSY' }))
    await Promise.resolve(); expect(cleanup).toHaveBeenCalledOnce()
    exited.resolve(); await Promise.all([cancellation, duplicate])
    expect(await lease.settled).toBe('cancelled')
    expect(coordinator.get().active).toBeNull()
    expect(coordinator.claim(diagnostic).reused).toBe(false)
    await expect(coordinator.cancel({ operationId: lease.operationId })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('does not release on a failed cleanup; owner settlement can finish recovery', async () => {
    const coordinator = setup(), { lease } = coordinator.claim(educational)
    lease.setCancellation(async () => { throw new Error('cleanup unavailable') })
    await expect(coordinator.cancel({ operationId: lease.operationId })).rejects.toMatchObject({ code: 'INTERNAL' })
    expect(coordinator.isOwner(lease)).toBe(true)
    const failedCancellation = coordinator.get()
    expect(lease.progress(progress(lease, 99, 'Late worker output'))).toBe(false)
    expect(lease.phase('receiving')).toBe(false)
    expect(lease.phase('saving')).toBe(false)
    expect(coordinator.get()).toEqual(failedCancellation)
    expect(() => lease.settle('saved')).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    lease.settle('failed', 'INTERNAL')
    expect(coordinator.get().settled?.errorCode).toBe('INTERNAL')
  })
  it('memoizes cancellation before dispatching reentrant abort listeners', async () => {
    const coordinator = setup(), { lease } = coordinator.claim(educational), cleanup = vi.fn(async () => {})
    lease.setCancellation(cleanup)
    let reentrant: Promise<unknown> | undefined
    lease.signal.addEventListener('abort', () => { reentrant = coordinator.cancel({ operationId: lease.operationId }) })
    await coordinator.cancel({ operationId: lease.operationId }); await reentrant
    expect(cleanup).toHaveBeenCalledOnce()
    expect(await lease.settled).toBe('cancelled')
  })
  it('teardown awaits cancellation, clears schedules and prevents new admission', async () => {
    const coordinator = setup(), { lease } = coordinator.claim(educational), cleanup = vi.fn(async () => {})
    lease.setCancellation(cleanup); lease.progress(progress(lease, 1))
    const listener = vi.fn(); coordinator.subscribe(listener)
    await coordinator.dispose(); await vi.runAllTimersAsync()
    expect(cleanup).toHaveBeenCalledOnce(); expect(listener).not.toHaveBeenCalled()
    expect(() => coordinator.claim(diagnostic)).toThrowError(expect.objectContaining({ code: 'UNAVAILABLE' }))
  })
  it('rejects older/duplicate revisions, wrong correlation and previous leases', async () => {
    const coordinator = setup(), { lease } = coordinator.claim(educational)
    expect(lease.progress(progress(lease, 2))).toBe(true)
    expect(lease.progress(progress(lease, 2))).toBe(false)
    expect(lease.progress(progress(lease, 1))).toBe(false)
    expect(lease.progress({ ...progress(lease, 3), projectId: 'other' })).toBe(false)
    expect(lease.progress({ ...progress(lease, 3), operationId: 'other' })).toBe(false)
    expect(lease.progress({ ...progress(lease, 3), turn: 0 })).toBe(false)
    expect(lease.progress({ ...progress(lease, 0), turn: 2 })).toBe(true)
    lease.settle('failed'); coordinator.claim(educational)
    expect(lease.progress({ ...progress(lease, 10), turn: 3 })).toBe(false)
    await vi.runAllTimersAsync()
    expect(coordinator.get().active?.preview.kind).toBe('none')
  })
  it('copies and deeply freezes snapshots, exposes measured byte age and elapsed time', () => {
    const coordinator = setup(), { lease } = coordinator.claim(educational), update = progress(lease, 1)
    vi.advanceTimersByTime(20)
    lease.progress({ ...update, lastByteAt: 20 })
    update.preview.text = 'Mutated SDK object'
    vi.advanceTimersByTime(10)
    const snapshot = coordinator.get()
    expect(snapshot.active?.preview).toEqual({ kind: 'text', text: 'Draft' })
    expect(snapshot.active?.elapsedMs).toBe(30); expect(snapshot.active?.lastByteAgeMs).toBe(10)
    expect(Object.isFrozen(snapshot.active?.preview)).toBe(true)
    expect(() => { snapshot.active!.heading = 'Mutated consumer' }).toThrow()
  })
  it('coalesces latest previews to ten per second and bypasses batching for phases/terminal events', async () => {
    const coordinator = setup(), received: { revision: number; phase?: string; text?: string }[] = []
    coordinator.subscribe(snapshot => received.push({ revision: snapshot.revision, phase: snapshot.active?.phase ?? snapshot.settled?.outcome ?? undefined,
      text: snapshot.active?.preview.kind === 'text' ? snapshot.active.preview.text : undefined }))
    const { lease } = coordinator.claim(educational)
    await vi.advanceTimersByTimeAsync(0)
    for (let revision = 0; revision < 1000; revision++) {
      lease.progress(progress(lease, revision, `${revision}`))
      await vi.advanceTimersByTimeAsync(1)
    }
    await vi.advanceTimersByTimeAsync(1) // asynchronous subscriber dispatch follows the 1000 ms projection boundary
    expect(received.filter(item => item.text !== undefined)).toHaveLength(10)
    expect(received.at(-1)?.text).toBe('999')
    lease.phase('validating'); await vi.advanceTimersByTimeAsync(0)
    expect(received.at(-1)?.phase).toBe('validating')
    lease.progress(progress(lease, 1001)); lease.settle('failed')
    await vi.advanceTimersByTimeAsync(250)
    expect(received.at(-1)?.phase).toBe('failed')
    expect(received.map(item => item.revision)).toEqual([...received.map(item => item.revision)].sort((a, b) => a - b))
  })
  it('isolates throwing and unresolved async subscribers from producers, and honors unsubscribe', async () => {
    const coordinator = setup(), blocked = deferred(), slow = vi.fn(() => blocked.promise), throwing = vi.fn(() => { throw new Error('UI failed') })
    coordinator.subscribe(slow); const unsubscribe = coordinator.subscribe(throwing)
    const { lease } = coordinator.claim(educational)
    expect(slow).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(0)
    expect(slow).toHaveBeenCalledOnce(); expect(throwing).toHaveBeenCalledOnce()
    unsubscribe(); lease.progress(progress(lease, 1)); lease.settle('failed')
    await vi.advanceTimersByTimeAsync(100)
    expect(coordinator.get().settled?.outcome).toBe('failed')
    expect(throwing).toHaveBeenCalledOnce(); blocked.resolve()
  })
  it('rejects cross-kind lifecycle settlement and cancellation after saving begins', () => {
    const educationalCoordinator = setup(), educationalLease = educationalCoordinator.claim(educational).lease
    expect(() => educationalLease.settle('verified')).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    educationalLease.phase('saving')
    expect(() => educationalLease.settle('cancelled')).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    const coordinator = setup(), { lease } = coordinator.claim(diagnostic)
    expect(() => lease.phase('saving')).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => lease.settle('saved')).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => lease.settle('unsaved')).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => lease.settle('needs-details')).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(lease.settle('verified')).toBe(true)
  })
})
