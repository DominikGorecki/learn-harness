import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { AiCoordinator } from '../../src/core/ai/coordinator'
import { TopicContentService } from '../../src/core/topic-content/service'
import type { TopicContentEngine, ChapterImageSession } from '../../src/core/topic-content/ports'
import { createTopicContentRepository } from '../../src/main/storage/topic-content-repository'
import { ApplicationError } from '../../src/shared/contracts'
import { collectMaterials } from '../../src/main/generation/material-snapshot'
import { contentDigest, topicJournalPath } from '../../src/main/storage/topic-content-files'
import { contentPlan, contentManifest, contentCheckpoint, topicContentProject, topicPng } from '../fixtures/topic-content'

const roots: string[] = []
const services: TopicContentService[] = []
afterEach(async () => { await Promise.all(services.splice(0).map(service => service.dispose())); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
async function setup(configuration: { images?: () => Promise<ChapterImageSession | null>; disposition?: (callId: string, state: 'published' | 'discarded') => Promise<void> } = {}) {
  const project = await topicContentProject(root => roots.push(root)), repository = createTopicContentRepository(project.workspace)
  let id = 0
  const ai = new AiCoordinator({ now: () => performance.now(), createId: () => `op-${++id}` })
  const engine: TopicContentEngine = { async execute(context, checkpoint, chapterId, _lease, accept) {
    await accept({ kind: 'turn' })
    const plan = checkpoint?.plan ?? { ...contentPlan(project.authority, true), chapterId }
    plan.images[0]!.skillVersion = 'educational-images-v1'
    if (!checkpoint) await accept({ kind: 'plan', plan })
    for (const section of plan.sections) if (!checkpoint?.sections.some(value => value.id === section.id)) await accept({ kind: 'section', section: { id: section.id, markdown: `Explain ${section.title}.`, examples: ['A concrete example.'], misconceptions: ['A common misconception.'] } })
    await accept({ kind: 'summary', introduction: 'Start with assumptions.', synthesis: 'Connect the objectives.', sourceNotes: ['Model knowledge; no sources read or external verification.'] })
    expect(context.writable).toBe(true)
    return { paused: false }
  } }
  const service = new TopicContentService({ ai, repository, engine, images: async () => null, ...configuration, createId: () => `content-${++id}`, now: () => new Date().toISOString() })
  services.push(service)
  return { ...project, repository, ai, engine, service, identity: { projectId: project.handle, topicId: 'beliefs' } }
}
describe('chapter admission, durable acceptance and recovery', () => {
  it('fails without a durable plan but pauses a validated partial plan at the activation budget', async () => {
    for (const planned of [false, true]) {
      const fixture = await setup(), { service, engine, identity, storage, authority, path } = fixture
      const published = await contentManifest(storage, authority); await storage.publish(authority, published)
      const old = await readFile(join(path, published.outputDirectory, 'chapter.md'))
      engine.execute = async (_context, _checkpoint, chapterId, _lease, accept) => {
        for (let turn = 0; turn < 48; turn++) {
          await accept({ kind: 'turn' })
          if (planned && turn === 0) { const plan = { ...contentPlan(authority, true), chapterId }; plan.images[0]!.skillVersion = 'educational-images-v1'; await accept({ kind: 'plan', plan }) }
        }
        return { paused: true }
      }
      await service.generate({ ...identity, mode: 'text-only', replace: true, expectedRevisionId: published.revisionId }); await service.waitForIdle()
      const state = await service.getState(identity)
      expect(fixture.ai.get().settled?.outcome).toBe(planned ? 'paused' : 'failed')
      if (planned) expect(state.progress).toMatchObject({ status: 'paused', baselineStatus: 'current', textModelId: 'offline-model' })
      else { expect(state.progress).toBeNull(); expect(state.errorCode).toBe('UNAVAILABLE'); expect(state.message).toContain('No resumable progress') }
      expect((await storage.read(authority)).manifest).toEqual(published); expect(await readFile(join(path, published.outputDirectory, 'chapter.md'))).toEqual(old)
    }
  }, 20_000)
  it('checks the progress source baseline independently from published prose before any continuation writes or provider preparation', async () => {
    let prepared = 0
    const fixture = await setup({ images: async () => { prepared++; return null } }), { storage, authority, path, identity, service } = fixture
    const published = await contentManifest(storage, authority); await storage.publish(authority, published)
    await writeFile(join(path, 'extra.md'), 'Earlier source')
    const checkpoint = await contentCheckpoint(storage, authority); checkpoint.baseline = await storage.captureBaseline(authority, ['extra.md'])
    await storage.saveCheckpoint(authority, checkpoint)
    await writeFile(join(path, 'extra.md'), 'Edited source')
    expect(await service.getState(identity)).toMatchObject({ stale: false, progress: { baselineStatus: 'stale' } })
    const saving = vi.spyOn(fixture.repository, 'saveCheckpoint')
    await expect(service.continue({ ...identity, chapterId: checkpoint.chapterId, runId: checkpoint.runId, checkpointRevision: 1 })).rejects.toMatchObject({ code: 'CONFLICT' })
    await service.waitForIdle(); expect(saving).not.toHaveBeenCalled(); expect(prepared).toBe(0)
    expect((await service.getContent(identity))?.identity.revisionId).toBe(published.revisionId)
  })
  it('retries only the acknowledged image slot and leaves other planned images for explicit Continue', async () => {
    const calls: string[] = []
    const prepared = await setup({ images: async () => ({ modelId: 'openai/gpt-image-2', settings: { n: 1, aspectRatio: '1:1' }, dispose() {}, async generate(_context, checkpoint, imageId, _lease, requested, accepted) {
      calls.push(imageId); const callId = `call-${imageId}`
      await requested(callId)
      await accepted({ imageId, versionId: 'version', path: `${checkpoint.outputDirectory}/images/${imageId}-version.png`, mime: 'image/png', width: 1, height: 1, bytes: topicPng.length, digest: contentDigest(topicPng), createdAt: new Date().toISOString(), modelId: 'openai/gpt-image-2', returnedModelId: null, callId, previousVersionId: null }, topicPng)
    } }) })
    const checkpoint = await contentCheckpoint(prepared.storage, prepared.authority)
    checkpoint.plan.images = ['selected', 'later-one', 'later-two'].map(id => ({ ...checkpoint.plan.images[0]!, id, purpose: id, skillVersion: 'educational-images-v1' }))
    checkpoint.images = checkpoint.plan.images.map((image, index) => ({ imageId: image.id, status: index ? 'planned' : 'unresolved', callId: index ? null : 'old-call', asset: null }))
    checkpoint.sections = checkpoint.plan.sections.map(section => ({ id: section.id, markdown: 'Accepted explanation.', examples: ['Concrete application.'], misconceptions: [] }))
    checkpoint.synthesis = 'Connect the objectives.'; checkpoint.sourceNotes = ['Model knowledge.']; await prepared.storage.saveCheckpoint(prepared.authority, checkpoint)
    await prepared.service.retryImage({ ...prepared.identity, chapterId: checkpoint.chapterId, runId: checkpoint.runId, checkpointRevision: checkpoint.checkpointRevision, imageId: 'selected', priorCallId: 'old-call', acknowledgeUncertainCharge: true }); await prepared.service.waitForIdle()
    expect(calls).toEqual(['selected'])
    const progress = (await prepared.service.getState(prepared.identity)).progress!
    expect(progress.imageSlots?.filter(slot => slot.status === 'planned').map(slot => slot.imageId)).toEqual(['later-one', 'later-two'])
    await prepared.service.continue({ ...prepared.identity, chapterId: progress.chapterId, runId: progress.runId, checkpointRevision: progress.checkpointRevision }); await prepared.service.waitForIdle()
    expect(calls).toEqual(['selected', 'later-one', 'later-two']); expect((await prepared.service.getState(prepared.identity)).published?.status).toBe('illustrated')
  })
  it('retains a failed initial completion checkpoint for storage-only retry before any image dispatch', async () => {
    let calls = 0
    const { service, repository, identity } = await setup({ images: async () => ({ modelId: 'openai/gpt-image-2', settings: { n: 1, aspectRatio: '1:1' }, dispose() {}, async generate() { calls++; throw new Error('No image dispatch expected') } }) })
    await service.generate({ ...identity, mode: 'text-only', replace: false, expectedRevisionId: null }); await service.waitForIdle()
    const published = (await service.getState(identity)).published!, save = repository.saveCheckpoint
    repository.saveCheckpoint = async () => { throw new ApplicationError('STORAGE', 'Initial completion checkpoint fault') }
    const state = await service.completeImages({ ...identity, chapterId: published.chapterId, revisionId: published.revisionId }); await service.waitForIdle()
    const progress = state.progress!
    expect(progress.status).toBe('unsaved'); expect(progress.pendingResultId).toBeTruthy(); expect(calls).toBe(0)
    repository.saveCheckpoint = save
    await service.retrySave({ ...identity, chapterId: progress.chapterId, runId: progress.runId, checkpointRevision: progress.checkpointRevision, pendingResultId: progress.pendingResultId! })
    expect(calls).toBe(0); expect((await service.getContent(identity))?.identity.revisionId).toBe(published.revisionId)
  })
  it('rejects unknown publication control bytes before authoring or image preflight while keeping trusted prose readable', async () => {
    let imageCalls = 0, engineCalls = 0
    const { service, engine, identity, path } = await setup({ images: async () => { imageCalls++; return null } })
    await service.generate({ ...identity, mode: 'text-only', replace: false, expectedRevisionId: null }); await service.waitForIdle()
    const published = (await service.getState(identity)).published!, execute = engine.execute
    engine.execute = async (...args) => { engineCalls++; return execute(...args) }
    await mkdir(join(path, '.edu/content-publications'), { recursive: true }); const control = join(path, topicJournalPath(identity.topicId))
    await writeFile(control, 'Unknown external publication bytes')
    await expect(service.generate({ ...identity, mode: 'illustrated', replace: true, expectedRevisionId: published.revisionId })).rejects.toMatchObject({ code: 'CONFLICT' }); await service.waitForIdle()
    await expect(service.completeImages({ ...identity, chapterId: published.chapterId, revisionId: published.revisionId })).rejects.toMatchObject({ code: 'CONFLICT' }); await service.waitForIdle()
    expect(engineCalls).toBe(0); expect(imageCalls).toBe(0)
    expect((await service.getContent(identity))?.identity.revisionId).toBe(published.revisionId)
    expect(await readFile(control, 'utf8')).toBe('Unknown external publication bytes')
  })
  it('keeps confirmed publication readable when an awaited ledger disposition fails and emits image previews', async () => {
    let dispositions = 0
    const previews: string[] = []
    const { service, ai, identity } = await setup({ disposition: async () => { dispositions++; throw new ApplicationError('STORAGE', 'Profile write failed') },
      images: async () => ({ modelId: 'openai/gpt-image-2', settings: { n: 1, aspectRatio: '1:1' }, dispose() {},
        async generate(_context, checkpoint, imageId, _lease, requested, accepted, progress) {
          progress('waiting'); await requested('call-fixture'); progress('receiving'); progress('validating')
          await vi.waitFor(() => expect(previews).toContain('validating'))
          await accepted({ imageId, versionId: 'version', path: `${checkpoint.outputDirectory}/images/${imageId}-version.png`, mime: 'image/png', width: 1, height: 1,
            bytes: topicPng.length, digest: contentDigest(topicPng), createdAt: new Date().toISOString(), modelId: 'openai/gpt-image-2', returnedModelId: null, callId: 'call-fixture', previousVersionId: null }, topicPng)
        } }) })
    ai.subscribe(state => { if (state.active?.preview.kind === 'image') previews.push(state.active.preview.state) })
    await service.generate({ ...identity, mode: 'illustrated', replace: false, expectedRevisionId: null }); await service.waitForIdle()
    const state = await service.getState(identity)
    expect(state.published?.status).toBe('illustrated'); expect(state.progress).toBeNull(); expect(state.message).toContain('billing is preserved')
    expect((await service.getContent(identity))?.status).toBe('illustrated'); expect(ai.get().settled?.outcome).toBe('saved'); expect(dispositions).toBe(1)
    expect(previews).toContain('validating') // The existing workbench coalesces rapid progress frames.
    await expect(service.generate({ ...identity, mode: 'illustrated', replace: false, expectedRevisionId: null })).rejects.toMatchObject({ code: 'CONFLICT' })
    await service.waitForIdle()
  })
  it('claims synchronously, publishes planned text-only chapters and reads offline without changing project bytes', async () => {
    const { service, ai, identity, path } = await setup(), before = await readFile(join(path, '.edu/project.json'))
    const request = service.generate({ ...identity, mode: 'text-only', replace: false, expectedRevisionId: null })
    expect(ai.get().active?.kind).toBe('generate-topic-content')
    expect(() => service.generate({ ...identity, mode: 'text-only', replace: false, expectedRevisionId: null })).toThrowError(/running/)
    await request; await service.waitForIdle()
    const page = await service.getContent(identity)
    expect(page?.status).toBe('text-only'); expect(page?.plan.images).toHaveLength(1)
    expect(page?.sections).toHaveLength(2); expect((await service.getState(identity)).progress).toBeNull()
    expect(await readFile(join(path, '.edu/project.json'))).toEqual(before)
    expect(ai.get().settled?.outcome).toBe('saved')
  })
  it('retires current and retained published runs after whole immutable replacement', async () => {
    const { service, identity } = await setup()
    await service.generate({ ...identity, mode: 'text-only', replace: false, expectedRevisionId: null }); await service.waitForIdle()
    const first = (await service.getState(identity)).published!
    await service.generate({ ...identity, mode: 'text-only', replace: true, expectedRevisionId: first.revisionId }); await service.waitForIdle()
    expect((await service.getState(identity)).progress).toBeNull()
    expect((await service.getState(identity)).published?.revisionId).not.toBe(first.revisionId)
  })
  it('retains a failed first checkpoint, rejects new inference and permits storage-only retry or exact discard', async () => {
    const { service, repository, identity, engine } = await setup()
    const save = repository.saveCheckpoint; let fail = true, executions = 0
    repository.saveCheckpoint = async (...args) => { if (fail) throw new ApplicationError('STORAGE', 'Fixture storage failure'); await save(...args) }
    const execute = engine.execute; engine.execute = async (...args) => { executions++; return execute(...args) }
    await service.generate({ ...identity, mode: 'text-only', replace: false, expectedRevisionId: null }); await service.waitForIdle()
    const pending = (await service.getState(identity)).progress!
    expect(pending.pendingResultId).toBeTruthy(); expect(pending.status).toBe('unsaved')
    expect(() => service.generate({ ...identity, mode: 'text-only', replace: false, expectedRevisionId: null })).toThrowError(/pending/)
    expect(() => service.continue({ ...identity, chapterId: pending.chapterId, runId: pending.runId, checkpointRevision: pending.checkpointRevision })).toThrowError(/pending/)
    fail = false
    await service.retrySave({ ...identity, chapterId: pending.chapterId, runId: pending.runId, checkpointRevision: pending.checkpointRevision, pendingResultId: pending.pendingResultId! })
    expect(executions).toBe(1)
    const saved = (await service.getState(identity)).progress!
    await service.discard({ ...identity, chapterId: saved.chapterId, runId: saved.runId, checkpointRevision: saved.checkpointRevision })
    expect((await service.getState(identity)).progress).toBeNull()
  })
  it('records delivered raw BOM source hashes and excludes proven generated paths while preserving learner content folders', async () => {
    const { path, service, repository, engine, identity } = await setup()
    const bytes = Buffer.from('\ufeffA source with a BOM.'); await writeFile(join(path, 'notes.md'), bytes)
    const snapshot = await collectMaterials(path, new AbortController().signal)
    expect(snapshot.text.get('notes.md')).toBe('A source with a BOM.'); expect(snapshot.digests?.get('notes.md')).toBe(contentDigest(bytes))
    const execute = engine.execute
    engine.execute = async (context, checkpoint, chapterId, lease, accept) => {
      await accept({ kind: 'sources', sources: [{ path: 'notes.md', digest: snapshot.digests!.get('notes.md')! }] })
      return execute(context, checkpoint, chapterId, lease, accept)
    }
    await service.generate({ ...identity, mode: 'text-only', replace: false, expectedRevisionId: null }); await service.waitForIdle()
    const context = await repository.resolve(identity.projectId, identity.topicId), manifest = (await repository.load(context))!
    expect(manifest.baseline.sources).toEqual([{ path: 'notes.md', digest: contentDigest(bytes) }])
    expect(await repository.excludedSources(context, [manifest.outputDirectory + '/chapter.md', 'manual/content/tutorial/section/intro.md'])).toEqual([manifest.outputDirectory + '/chapter.md'])
    await writeFile(join(path, 'notes.md'), 'Changed source')
    await expect(service.completeImages({ ...identity, chapterId: manifest.chapterId, revisionId: manifest.revisionId })).rejects.toMatchObject({ code: 'CONFLICT' })
    await service.waitForIdle()
    expect((await service.getContent(identity))?.identity.revisionId).toBe(manifest.revisionId)
  })
  it('pauses at the finite turn budget then resets only activation counters on explicit continuation', async () => {
    const { service, engine, identity, authority, ai } = await setup(), execute = engine.execute
    let first = true
    engine.execute = async (context, checkpoint, chapterId, lease, accept) => {
      if (!first) return execute(context, checkpoint, chapterId, lease, accept)
      first = false
      for (let turn = 0; turn < 48; turn++) await accept({ kind: 'turn' })
      const plan = { ...contentPlan(authority, true), chapterId }; plan.images[0]!.skillVersion = 'educational-images-v1'
      await accept({ kind: 'plan', plan }); return { paused: true }
    }
    await service.generate({ ...identity, mode: 'text-only', replace: false, expectedRevisionId: null }); await service.waitForIdle()
    const progress = (await service.getState(identity)).progress!
    expect(progress.status).toBe('paused'); expect(ai.get().settled?.outcome).toBe('paused')
    await service.continue({ ...identity, chapterId: progress.chapterId, runId: progress.runId, checkpointRevision: progress.checkpointRevision }); await service.waitForIdle()
    expect((await service.getState(identity)).progress).toBeNull()
    expect(ai.get().settled?.outcome).toBe('saved')
  })
  it('acknowledges a storage-failed Continue instead of leaving its admission promise pending', async () => {
    const { service, engine, repository, identity, authority } = await setup()
    engine.execute = async (_context, _checkpoint, chapterId, _lease, accept) => {
      await accept({ kind: 'turn' }); const plan = { ...contentPlan(authority, true), chapterId }; plan.images[0]!.skillVersion = 'educational-images-v1'
      await accept({ kind: 'plan', plan }); return { paused: true }
    }
    await service.generate({ ...identity, mode: 'text-only', replace: false, expectedRevisionId: null }); await service.waitForIdle()
    const progress = (await service.getState(identity)).progress!
    repository.saveCheckpoint = async () => { throw new ApplicationError('STORAGE', 'Checkpoint failure') }
    const result = await service.continue({ ...identity, chapterId: progress.chapterId, runId: progress.runId, checkpointRevision: progress.checkpointRevision })
    await service.waitForIdle(); expect(result.progress?.pendingResultId).toBeTruthy()
  })
  it('directly discards an exact unsaved first plan and rejects a different run identity', async () => {
    const { service, repository, identity } = await setup()
    repository.saveCheckpoint = async () => { throw new ApplicationError('STORAGE', 'First plan failure') }
    await service.generate({ ...identity, mode: 'text-only', replace: false, expectedRevisionId: null }); await service.waitForIdle()
    const progress = (await service.getState(identity)).progress!
    await expect(service.discard({ ...identity, chapterId: progress.chapterId, runId: 'wrong-run', checkpointRevision: progress.checkpointRevision })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect((await service.getState(identity)).progress?.pendingResultId).toBeTruthy()
    await service.discard({ ...identity, chapterId: progress.chapterId, runId: progress.runId, checkpointRevision: progress.checkpointRevision })
    expect((await service.getState(identity)).progress).toBeNull()
  })
  it('preserves accepted section bytes when cancellation races a failed checkpoint write', async () => {
    const { service, repository, engine, ai, identity } = await setup(), save = repository.saveCheckpoint
    let release!: () => void, reached!: () => void
    const gate = new Promise<void>(resolve => { release = resolve }), held = new Promise<void>(resolve => { reached = resolve })
    let fail = true
    repository.saveCheckpoint = async (context, checkpoint) => {
      if (fail && checkpoint.sections.length) { reached(); await gate; throw new ApplicationError('STORAGE', 'Held section write failed') }
      await save(context, checkpoint)
    }
    const execute = engine.execute; engine.execute = (...args) => execute(...args)
    await service.generate({ ...identity, mode: 'text-only', replace: false, expectedRevisionId: null }); await held
    const cancel = ai.cancel({ operationId: ai.get().active!.operationId }); release(); await cancel; await service.waitForIdle()
    const progress = (await service.getState(identity)).progress!
    expect(progress.completedSectionIds).toEqual(['section-0']); expect(progress.pendingResultId).toBeTruthy()
    fail = false
    await service.retrySave({ ...identity, chapterId: progress.chapterId, runId: progress.runId, checkpointRevision: progress.checkpointRevision, pendingResultId: progress.pendingResultId! })
    const context = await repository.resolve(identity.projectId, identity.topicId), checkpoint = await repository.loadCheckpoint(context, progress.runId)
    expect(checkpoint?.sections[0]?.markdown).toBe('Explain Section 1.')
  })
  it('excludes proven generated revision roots before they consume source quotas', async () => {
    const { service, repository, path, identity } = await setup()
    await service.generate({ ...identity, mode: 'text-only', replace: false, expectedRevisionId: null }); await service.waitForIdle()
    await writeFile(join(path, 'z-real-source.md'), 'An original source sorted after generated output.')
    const context = await repository.resolve(identity.projectId, identity.topicId), manifest = (await repository.load(context))!
    const snapshot = await collectMaterials(path, new AbortController().signal, { entries: 1000, files: 1, depth: 6, fileBytes: 256 * 1024, totalBytes: 256 * 1024 }, async path => (await repository.excludedSources(context, [path])).length > 0)
    expect(snapshot.text.get('z-real-source.md')).toBe('An original source sorted after generated output.')
    expect(snapshot.text.has(manifest.outputDirectory + '/chapter.md')).toBe(false)
  })
  it('holds global admission and shutdown until storage-only retry releases its durable write', async () => {
    const { service, repository, ai, identity } = await setup(), save = repository.saveCheckpoint
    repository.saveCheckpoint = async () => { throw new ApplicationError('STORAGE', 'Storage fault') }
    await service.generate({ ...identity, mode: 'text-only', replace: false, expectedRevisionId: null }); await service.waitForIdle()
    const pending = (await service.getState(identity)).progress!
    let release!: () => void, entered!: () => void
    const held = new Promise<void>(resolve => { release = resolve }), writing = new Promise<void>(resolve => { entered = resolve })
    repository.saveCheckpoint = async (...args) => { entered(); await held; await save(...args) }
    const retry = service.retrySave({ ...identity, chapterId: pending.chapterId, runId: pending.runId, checkpointRevision: pending.checkpointRevision, pendingResultId: pending.pendingResultId! })
    await writing
    expect(() => ai.claim({ kind: 'test-sol', model: { id: 'gpt-6.1-sol', name: 'Sol' }, heading: 'Test Sol', requestSummary: 'Test' })).toThrowError(/settling/)
    expect(ai.get().active).toBeNull()
    let idle = false, stopped = false
    const waiting = service.waitForIdle().then(() => { idle = true }), shutdown = ai.dispose().then(() => { stopped = true })
    await Promise.resolve(); expect(idle).toBe(false); expect(stopped).toBe(false)
    release(); await retry; await waiting; await shutdown
    expect(idle).toBe(true); expect(stopped).toBe(true)
  })
})
