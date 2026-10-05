import { AiCoordinator } from '../../src/core/ai/coordinator'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GenerationService } from '../../src/core/generation/service'
import { WorkspaceService } from '../../src/core/workspace/service'
import { createProjectStorage } from '../../src/main/storage/project-storage'
import { createProjectRegistry } from '../../src/main/storage/project-registry'
import { ApplicationError } from '../../src/shared/contracts'
import { parseRunRequest, parseStartOutline, parseRewriteOutline } from '../../src/shared/generation'
import type { OutlineEngineResult } from '../../src/shared/generation'
import { learningOutline } from '../fixtures/learning-outline'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done }); return { promise, resolve } }
async function setup(generate: ConstructorParameters<typeof GenerationService>[0]['generate'] = async () => ({ kind: 'outline', document: learningOutline() })) {
  const root = await mkdtemp(join(tmpdir(), 'edu-generation-')); roots.push(root)
  const path = join(root, 'project'); await mkdir(path)
  const storage = createProjectStorage()
  let id = 0
  const workspace = new WorkspaceService({ storage, registry: createProjectRegistry(join(root, 'profile')), models: () => [{ id: 'model-one', name: 'One' }], createId: () => `id-${++id}`, now: () => new Date().toISOString() })
  await workspace.initialize()
  const projectId = (await workspace.open(path)).activeProject!.id
  const ai = new AiCoordinator({ now: () => performance.now(), createId: () => `ai-${++id}` })
  const beforeStart = vi.fn(), onAccountFailure = vi.fn(), generator = vi.fn(generate)
  const service = new GenerationService({ workspace, ai, createId: () => `run-${++id}`, now: () => new Date().toISOString(), beforeStart, onAccountFailure, generate: generator })
  const request = { projectId, brief: 'Bayesian reasoning', modelId: 'model-one', replace: false }
  return { root, path, workspace, service, storage, request, generator, ai, beforeStart, onAccountFailure }
}
describe('generation ownership and durable outcomes', () => {
  it('rewrites the authoritative outline with the selected model while preserving the learning brief', async () => {
    const { service, request, workspace, generator, path } = await setup()
    service.start(request); await service.waitForIdle()
    expect(generator.mock.calls[0]![0].currentOutline).toBeNull()
    const original = workspace.get().activeProject!.outline!
    const revised = learningOutline(); revised.lessons.reverse(); revised.startingLessonId = revised.lessons[0]!.id
    generator.mockResolvedValueOnce({ kind: 'outline', document: revised })
    service.rewrite({ projectId: request.projectId, modelId: request.modelId, changes: 'Move 01 after 02' })
    await service.waitForIdle()
    expect(generator.mock.calls[1]![0]).toEqual({ model: { id: request.modelId, name: 'One' }, path,
      brief: request.brief, currentOutline: original, changes: 'Move 01 after 02' })
    expect(service.get().runs[0]?.status).toBe('saved')
    const stored = JSON.parse(await readFile(join(path, '.edu/project.json'), 'utf8'))
    expect(stored).toMatchObject({ brief: request.brief, outline: { brief: request.brief, document: revised } })
    // Regeneration also supplies the current JSON, rather than losing project orientation.
    service.start({ ...request, replace: true }); await service.waitForIdle()
    expect(generator.mock.calls[2]![0].currentOutline?.document).toEqual(revised)
  })
  it('requires a saved outline and rejects forged or blank rewrite requests', async () => {
    const { service, request, generator } = await setup()
    for (const changes of ['', '  ', 'x'.repeat(32_001), null]) {
      expect(() => parseRewriteOutline({ projectId: request.projectId, modelId: request.modelId, changes })).toThrow()
    }
    expect(() => parseRewriteOutline({ projectId: request.projectId, modelId: request.modelId, changes: 'Reorder', currentOutline: learningOutline() })).toThrow()
    service.rewrite({ projectId: request.projectId, modelId: request.modelId, changes: 'Reorder' }); await service.waitForIdle()
    expect(service.get().runs[0]?.errorCode).toBe('UNAVAILABLE')
    expect(generator).not.toHaveBeenCalled()
  })
  it('preserves the saved outline and brief on rewrite failure or cancellation, and retries saves without inference', async () => {
    const { service, request, workspace, generator, storage } = await setup()
    service.start(request); await service.waitForIdle()
    const original = workspace.get().activeProject!.outline
    const rewrite = { projectId: request.projectId, modelId: request.modelId, changes: 'Add practical examples' }
    generator.mockRejectedValueOnce(new ApplicationError('NETWORK', 'Try again.'))
    service.rewrite(rewrite); await service.waitForIdle()
    expect(workspace.get().activeProject).toMatchObject({ outline: original, brief: request.brief })
    const started = deferred<void>(), pending = deferred<OutlineEngineResult>()
    generator.mockImplementationOnce(async () => { started.resolve(); return pending.promise })
    const state = service.rewrite(rewrite); await started.promise
    const cancelled = service.cancel({ projectId: request.projectId, runId: state.activeRunId! })
    pending.resolve({ kind: 'outline', document: learningOutline() }); await cancelled
    expect(service.get().runs[0]?.status).toBe('cancelled')
    expect(workspace.get().activeProject).toMatchObject({ outline: original, brief: request.brief })
    const save = storage.save.bind(storage)
    const spy = vi.spyOn(storage, 'save').mockImplementation(async (...args) => {
      if (args[1].outline?.generatedAt !== original?.generatedAt) throw new ApplicationError('STORAGE', 'Full disk.')
      return save(...args)
    })
    service.rewrite(rewrite); await service.waitForIdle()
    const run = service.get().runs[0]!
    expect(run.status).toBe('unsaved')
    expect(() => service.rewrite(rewrite)).toThrow(/Save your generated outline/)
    spy.mockRestore()
    await service.retrySave({ projectId: request.projectId, runId: run.id })
    expect(service.get().runs[0]?.status).toBe('saved')
    expect(generator).toHaveBeenCalledTimes(4)
  })
  it('saves the complete result with the originating model, brief and time', async () => {
    const { service, request, workspace, ai } = await setup()
    expect(service.start(request).activeRunId).toBeTruthy()
    await service.waitForIdle()
    expect(service.get()).toMatchObject({ activeRunId: null, runs: [{ status: 'saved', projectId: request.projectId, result: { model: { id: request.modelId }, brief: request.brief } }] })
    expect(workspace.get().activeProject?.outline?.document).toEqual(learningOutline())
    expect(ai.get()).toMatchObject({ active: null, settled: { outcome: 'saved' } })
  })
  it('rejects duplicate starts and conflicting settings, but supports navigation to another project', async () => {
    const pending = deferred<OutlineEngineResult>(), started = deferred<void>()
    const { service, request, workspace, root } = await setup(async () => { started.resolve(); return pending.promise })
    service.start(request)
    expect(() => service.start(request)).toThrow(/already/)
    await started.promise
    await expect(workspace.setModel(request.projectId, 'model-one')).rejects.toMatchObject({ code: 'BUSY' })
    await expect(workspace.saveBrief(request.projectId, 'replacement')).rejects.toMatchObject({ code: 'BUSY' })
    const otherPath = join(root, 'other'); await mkdir(otherPath)
    const other = (await workspace.open(otherPath)).activeProject!.id
    pending.resolve({ kind: 'outline', document: learningOutline() })
    await service.waitForIdle()
    expect(workspace.get().activeProject?.id).toBe(other)
    expect((await workspace.select(request.projectId)).activeProject?.outline?.document.title).toBe('Bayesian reasoning')
  })
  it('cancels a pending run and cannot accept a late completed result', async () => {
    const pending = deferred<OutlineEngineResult>(), started = deferred<void>()
    const { service, request, workspace } = await setup(async () => { started.resolve(); return pending.promise })
    const state = service.start(request); await started.promise
    const cancelled = service.cancel({ projectId: request.projectId, runId: state.activeRunId! })
    pending.resolve({ kind: 'outline', document: learningOutline() })
    await service.waitForIdle()
    await cancelled
    expect(service.get().runs[0]?.status).toBe('cancelled')
    expect(workspace.get().activeProject?.outline).toBeNull()
    await expect(workspace.saveBrief(request.projectId, 'Still editable')).resolves.toBeDefined()
  })
  it('retains an unsaved result and retries storage without consuming inference again', async () => {
    const { service, storage, generator, request, workspace } = await setup()
    const save = storage.save.bind(storage)
    let fail = true
    vi.spyOn(storage, 'save').mockImplementation(async (...args) => {
      if (fail && args[1].outline) throw new ApplicationError('STORAGE', 'The disk is full.')
      return save(...args)
    })
    service.start(request); await service.waitForIdle()
    const run = service.get().runs[0]!
    expect(run).toMatchObject({ status: 'unsaved', result: { document: learningOutline() } })
    expect(workspace.get().activeProject?.outline).toBeNull()
    fail = false
    await service.retrySave({ projectId: request.projectId, runId: run.id })
    expect(service.get().runs[0]?.status).toBe('saved')
    expect(generator).toHaveBeenCalledTimes(1)
  })
  it('preserves an external metadata edit even after navigation refreshes the workspace cache', async () => {
    const pending = deferred<OutlineEngineResult>(), started = deferred<void>()
    const { service, request, workspace, path, generator } = await setup(async () => { started.resolve(); return pending.promise })
    service.start(request); await started.promise
    const file = join(path, '.edu/project.json')
    const external = JSON.stringify({ ...JSON.parse(await readFile(file, 'utf8')), brief: 'An external change', selectedModel: { id: 'external-model', name: 'Externally selected model' } })
    await writeFile(file, external)
    await workspace.select(request.projectId)
    pending.resolve({ kind: 'outline', document: learningOutline() }); await service.waitForIdle()
    expect(service.get().runs[0]).toMatchObject({ status: 'unsaved', errorCode: 'CONFLICT' })
    expect(await readFile(file, 'utf8')).toBe(external)
    await service.retrySave({ projectId: request.projectId, runId: service.get().runs[0]!.id, replaceChanged: true })
    expect(service.get().runs[0]?.status).toBe('saved')
    expect(workspace.get().activeProject?.selectedModel?.id).toBe('external-model')
    expect(workspace.get().activeProject?.outline?.model.id).toBe('model-one')
    expect(generator).toHaveBeenCalledTimes(1)
  })
  it('requires explicit replacement and keeps a previous outline on provider failure', async () => {
    const { service, request, generator, workspace, onAccountFailure } = await setup()
    service.start(request); await service.waitForIdle()
    const original = workspace.get().activeProject!.outline
    service.start(request); await service.waitForIdle()
    expect(service.get().runs[0]?.errorCode).toBe('CONFLICT')
    expect(generator).toHaveBeenCalledTimes(1)
    generator.mockRejectedValueOnce(new ApplicationError('USAGE_LIMIT', 'Your included usage is unavailable.'))
    service.start({ ...request, replace: true }); await service.waitForIdle()
    expect(workspace.get().activeProject?.outline).toEqual(original)
    expect(onAccountFailure).toHaveBeenCalledTimes(1)
  })
  it('returns clarification and independently rejects malformed worker results', async () => {
    const { service, generator, request, workspace, ai } = await setup(async () => ({ kind: 'needs-details', question: 'Which subject?', reason: 'The subject is unclear.' }))
    service.start(request); await service.waitForIdle()
    expect(service.get().runs[0]).toMatchObject({ status: 'needs-details', question: 'Which subject?' })
    expect(ai.get().settled?.activity).toContainEqual({ id: 'domain-validation', label: 'Checking lessons and publication scope', state: 'completed' })
    const invalid = learningOutline(); invalid.lessons = []
    generator.mockResolvedValueOnce({ kind: 'outline', document: invalid })
    service.start(request); await service.waitForIdle()
    expect(service.get().runs[0]?.status).toBe('failed')
    expect(ai.get().settled?.activity).toContainEqual({ id: 'domain-validation', label: 'Checking lessons and publication scope', state: 'failed' })
    expect(workspace.get().activeProject?.outline).toBeNull()
    const unread = learningOutline(); unread.lessons[0]!.sources = ['not-read.md']
    generator.mockResolvedValueOnce({ kind: 'outline', document: unread })
    service.start(request); await service.waitForIdle()
    expect(ai.get().settled).toMatchObject({ outcome: 'failed', errorCode: 'INVALID_INPUT' })
    expect(ai.get().settled?.activity).toContainEqual({ id: 'domain-validation', label: 'Checking lessons and publication scope', state: 'failed' })
  })
  it('rejects forged capabilities, empty input and stale operation handles', async () => {
    expect(() => parseStartOutline({ projectId: 'a', modelId: 'b', brief: 'Learn', replace: false, path: '/other' })).toThrow()
    expect(() => parseRunRequest({ projectId: 'a', runId: '../other' })).toThrow()
    const { service, request } = await setup()
    service.start({ ...request, brief: '' }); await service.waitForIdle()
    expect(service.get().runs[0]?.errorCode).toBe('INVALID_INPUT')
    await expect(service.cancel({ projectId: request.projectId, runId: 'stale' })).rejects.toThrow(/no longer/)
  })
  it('finishes a started atomic save instead of falsely claiming it was cancelled', async () => {
    const { service, storage, request } = await setup()
    const writing = deferred<void>(), release = deferred<void>(), save = storage.save.bind(storage)
    vi.spyOn(storage, 'save').mockImplementation(async (...args) => {
      if (args[1].outline) { writing.resolve(); await release.promise }
      return save(...args)
    })
    service.start(request); await writing.promise
    await expect(service.cancel({ projectId: request.projectId, runId: service.get().runs[0]!.id })).rejects.toMatchObject({ code: 'BUSY' })
    release.resolve(); await service.waitForIdle()
    expect(service.get().runs[0]?.status).toBe('saved')
  })
})


describe('global generation lifecycle races', () => {
  it('cancels synchronously notified starts before preparing or launching inference', async () => {
    const { service, workspace, request, generator, ai } = await setup()
    const prepare = vi.spyOn(workspace, 'prepareOutline')
    let cancellation: Promise<unknown> | undefined
    service.subscribe(snapshot => {
      if (snapshot.activeRunId && !cancellation) cancellation = ai.cancel({ operationId: ai.get().active!.operationId })
    })
    service.start(request); await service.waitForIdle(); await cancellation
    expect(prepare).not.toHaveBeenCalled(); expect(generator).not.toHaveBeenCalled()
    expect(service.get()).toMatchObject({ activeRunId: null, runs: [{ status: 'cancelled' }] })
    expect(ai.get().active).toBeNull()
  })
  it('prevents publication when a validating listener cancels, and releases domain locks before settlement', async () => {
    const { service, workspace, request, ai, storage } = await setup()
    let cancellation: Promise<unknown> | undefined
    service.subscribe(snapshot => {
      if (snapshot.runs[0]?.status === 'validating' && !cancellation) cancellation = ai.cancel({ operationId: ai.get().active!.operationId })
    })
    const save = vi.spyOn(storage, 'save')
    service.start(request); await service.waitForIdle(); await cancellation
    expect(service.get().runs[0]?.status).toBe('cancelled')
    expect(ai.get().settled?.activity).toContainEqual({ id: 'domain-validation', label: 'Checking lessons and publication scope', state: 'failed' })
    expect(ai.get().settled?.activity.some(entry => entry.state === 'running')).toBe(false)
    expect(save.mock.calls.some(call => call[1].outline)).toBe(false)
    expect(workspace.get().activeProject?.outline).toBeNull()
    await expect(workspace.saveBrief(request.projectId, 'Editable after cancellation')).resolves.toBeDefined()
    expect(ai.get().active).toBeNull()
  })
  it('makes saving non-cancellable before notification and isolates all observer failures', async () => {
    const { service, workspace, request, ai } = await setup()
    let cancellation: Promise<unknown> | undefined
    service.subscribe(snapshot => {
      if (snapshot.runs[0]?.status === 'saving' && !cancellation) cancellation = ai.cancel({ operationId: ai.get().active!.operationId }).catch(error => error.code)
      throw new Error('Observer failure')
    })
    service.subscribe(async () => { throw new Error('Async observer failure') })
    workspace.subscribe(() => { throw new Error('Workspace observer failure') })
    workspace.subscribe(async () => { throw new Error('Async workspace observer failure') })
    service.start(request); await service.waitForIdle()
    expect(await cancellation).toBe('BUSY')
    expect(service.get().runs[0]?.status).toBe('saved')
    expect(workspace.get().activeProject?.outline?.document).toEqual(learningOutline())
    expect(ai.get().settled).toMatchObject({ outcome: 'saved', activity: expect.arrayContaining([{ id: 'domain-validation', label: 'Checking lessons and publication scope', state: 'completed' }, { id: 'domain-save', label: 'Saving your outline', state: 'completed' }]) })
  })
  it('preserves unsaved result/context under global and transitional diagnostic contention', async () => {
    const { service, storage, generator, request, ai, beforeStart } = await setup()
    const save = storage.save.bind(storage)
    vi.spyOn(storage, 'save')
    // Fail only publication, after preparation has produced its durable baseline.
    vi.mocked(storage.save).mockImplementation(async (...args) => { if (args[1].outline) throw new ApplicationError('STORAGE', 'Disk full'); return save(...args) })
    service.start(request); await service.waitForIdle()
    const prior = service.get()
    const { lease } = ai.claim({ kind: 'test-sol', model: { id: 'gpt-6.1-sol', name: 'Sol' }, heading: 'Test', requestSummary: '' })
    expect(() => service.start({ ...request, replace: true })).toThrow(/Another AI/)
    expect(service.get()).toEqual(prior); lease.settle('failed')
    beforeStart.mockImplementation(() => { throw new ApplicationError('BUSY', 'Legacy diagnostic owns connection') })
    expect(() => service.start({ ...request, replace: true })).toThrow(/Legacy/)
    expect(service.get()).toEqual(prior)
    vi.mocked(storage.save).mockImplementation(save)
    await service.retrySave({ projectId: request.projectId, runId: prior.runs[0]!.id })
    expect(service.get().runs[0]?.status).toBe('saved'); expect(generator).toHaveBeenCalledOnce()
  })
  it('drains actual storage retry after disposal and rejects any further admission', async () => {
    const { service, storage, generator, request } = await setup()
    const save = storage.save.bind(storage)
    vi.spyOn(storage, 'save').mockImplementation(async (...args) => { if (args[1].outline) throw new ApplicationError('STORAGE', 'Disk full'); return save(...args) })
    service.start(request); await service.waitForIdle()
    const runId = service.get().runs[0]!.id, writing = deferred<void>(), release = deferred<void>()
    vi.mocked(storage.save).mockImplementation(async (...args) => { writing.resolve(); await release.promise; return save(...args) })
    const retry = service.retrySave({ projectId: request.projectId, runId }); await writing.promise
    service.dispose(); const idle = vi.fn(); void service.waitForIdle().then(idle)
    await Promise.resolve(); expect(idle).not.toHaveBeenCalled()
    expect(() => service.start({ ...request, replace: true })).toThrow(/stopped/)
    await expect(service.retrySave({ projectId: request.projectId, runId })).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    release.resolve(); await retry; await service.waitForIdle()
    expect(service.get().runs[0]?.status).toBe('saved'); expect(generator).toHaveBeenCalledOnce()
  })
})
