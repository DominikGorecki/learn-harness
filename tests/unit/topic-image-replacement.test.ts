import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { AiCoordinator } from '../../src/core/ai/coordinator'
import { TopicContentService } from '../../src/core/topic-content/service'
import { createTopicContentStorage } from '../../src/main/storage/topic-content'
import type { TopicStorageFault } from '../../src/main/storage/topic-content'
import { createTopicContentRepository } from '../../src/main/storage/topic-content-repository'
import { ApplicationError } from '../../src/shared/contracts'
import { parseChapterManifest } from '../../src/shared/topic-content'
import { contentDigest, topicCandidatePath, topicJournalPath } from '../../src/main/storage/topic-content-files'
import { contentManifest, topicContentProject, topicPng } from '../fixtures/topic-content'

const roots: string[] = [], services: TopicContentService[] = []
afterEach(async () => { await Promise.all(services.splice(0).map(service => service.dispose())); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
async function setup(fault?: (point: TopicStorageFault) => void) {
  const project = await topicContentProject(root => roots.push(root))
  await writeFile(join(project.path, 'source.md'), 'Original delivered source')
  const original = await contentManifest(project.storage, project.authority, 'original', true)
  original.plan.images.push({ ...original.plan.images[0]!, id: 'second', purpose: 'A distinct explanatory purpose', sectionId: 'section-1' })
  const second = { ...original.images[0]!.asset!, imageId: 'second', path: `${original.outputDirectory}/images/second-original.png`, callId: 'second-original' }
  await project.storage.stageAsset(project.authority, original.plan, original.revisionId, second, topicPng)
  original.images.push({ imageId: 'second', status: 'complete', callId: second.callId, asset: second })
  original.baseline = await project.storage.captureBaseline(project.authority, ['source.md'])
  await project.storage.publish(project.authority, original)
  const repository = createTopicContentRepository(project.workspace, createTopicContentStorage({ projectStorage: project.projectStorage, fault })), identity = { projectId: project.handle, topicId: 'beliefs' }
  let id = 0, calls = 0, preparations = 0
  const ai = new AiCoordinator({ now: () => performance.now(), createId: () => `operation-${++id}` })
  const dispositions: { callId: string; state: string }[] = []
  const options: ConstructorParameters<typeof TopicContentService>[0] = { ai, repository, engine: { async execute() { throw new Error('Text inference must never run') } }, images: async () => null,
    replacementImages: { model: () => 'openai/gpt-image-2', prepare: async () => { preparations++; return { modelId: 'openai/gpt-image-2', settings: { n: 1, aspectRatio: '1:1' }, dispose() {},
      async generate(_context, attempt, lease, requested, accepted) {
        lease.signal.throwIfAborted(); await requested(`replacement-call-${++calls}`)
        await accepted({ imageId: attempt.imageId, versionId: 'replacement-version', path: `${attempt.outputDirectory}/images/${attempt.imageId}-replacement-version.png`, mime: 'image/png', width: 1, height: 1,
          bytes: topicPng.length, digest: contentDigest(topicPng), createdAt: new Date().toISOString(), modelId: 'openai/gpt-image-2', returnedModelId: null, callId: `replacement-call-${calls}`, previousVersionId: attempt.expectedImageVersionId }, topicPng)
      } } } }, disposition: async (callId, state) => { dispositions.push({ callId, state }) }, createId: () => `candidate-${++id}`, now: () => new Date().toISOString() }
  const service = new TopicContentService(options)
  services.push(service)
  const request = { ...identity, chapterId: original.chapterId, revisionId: original.revisionId, imageId: 'illustration', expectedImageVersionId: 'original', prompt: 'Show an accessible corrected prior diagram' }
  const candidateRequest = async () => { const state = await service.getState(identity), replacement = state.replacement!; return { ...identity, chapterId: replacement.chapterId, revisionId: replacement.revisionId, imageId: replacement.imageId, expectedImageVersionId: replacement.expectedImageVersionId, candidateId: replacement.candidateId } }
  return { ...project, original, service, repository, ai, identity, request, candidateRequest, dispositions, calls: () => calls, preparations: () => preparations, restart() { const next = new TopicContentService(options); services.push(next); return next } }
}
describe('individual image candidates', () => {
  it('scopes retained candidates to their portable topic without adopting or blocking another topic', async () => {
    const fixture = await setup()
    const authority = await fixture.storage.prepare(await fixture.workspace.readTopicContent(fixture.handle, 'evidence'))
    const foreign = await contentManifest(fixture.storage, authority, 'foreign-original', true)
    await fixture.storage.publish(authority, foreign)
    await fixture.service.replacement!.generate(fixture.request); await fixture.service.waitForIdle()
    const first = (await fixture.service.getState(fixture.identity)).candidate!
    const marker = join(fixture.path, topicCandidatePath(first.candidateId)), bytes = await readFile(marker)
    const identity = { projectId: fixture.handle, topicId: 'evidence' }
    const state = await fixture.service.getState(identity)
    expect(state.replacement).toBeUndefined(); expect(state.candidate).toBeNull(); expect(state.errorCode).toBeNull()
    await fixture.service.replacement!.generate({ ...identity, chapterId: foreign.chapterId, revisionId: foreign.revisionId, imageId: 'illustration', expectedImageVersionId: 'foreign-original', prompt: 'Explain the second topic using a distinct illustration.' })
    await fixture.service.waitForIdle()
    const second = (await fixture.service.getState(identity)).candidate!
    expect(second.topicId).toBe('evidence'); expect(second.candidateId).not.toBe(first.candidateId)
    expect(await readFile(marker)).toEqual(bytes); expect((await fixture.service.getState(fixture.identity)).candidate?.candidateId).toBe(first.candidateId)
    await fixture.service.replacement!.discard({ ...identity, chapterId: second.chapterId, revisionId: second.expectedRevisionId, imageId: second.imageId, expectedImageVersionId: second.expectedImageVersionId, candidateId: second.candidateId })
    expect(await readFile(marker)).toEqual(bytes); expect(fixture.calls()).toBe(2)
    const path = join(fixture.path, '.edu/project.json'), project = JSON.parse(await readFile(path, 'utf8'))
    project.revision++; project.outline.document.lessons = project.outline.document.lessons.filter((topic: { id: string }) => topic.id !== 'beliefs'); project.outline.document.startingLessonId = 'evidence'
    await writeFile(path, JSON.stringify(project))
    const remaining = await fixture.service.getState(identity)
    expect(remaining.errorCode).toBeNull(); expect(remaining.replacement).toBeUndefined()
    await fixture.service.replacement!.generate({ ...identity, chapterId: foreign.chapterId, revisionId: foreign.revisionId, imageId: 'illustration', expectedImageVersionId: 'foreign-original', prompt: 'A third explicit image for the surviving topic.' }); await fixture.service.waitForIdle()
    expect((await fixture.service.getState(identity)).candidate?.topicId).toBe('evidence'); expect(fixture.calls()).toBe(3); expect(await readFile(marker)).toEqual(bytes)
  }, 20_000)
  it('clears proven review controls even when independent disposition persistence fails', async () => {
    const fixture = await setup()
    await fixture.service.replacement!.generate(fixture.request); await fixture.service.waitForIdle()
    fixture.dispositions.push = () => { throw new ApplicationError('STORAGE', 'Fixture accounting write failure') }
    const state = await fixture.service.replacement!.discard(await fixture.candidateRequest())
    expect(state.replacement).toBeUndefined(); expect(state.candidate).toBeNull(); expect(state.message).toContain('accounting')
    expect((await fixture.service.getContent(fixture.identity))?.identity.revisionId).toBe('original'); expect(fixture.calls()).toBe(1)
  })

  it('keeps current prose and both original assets until Use, then changes only the target and preserves independent lineage', async () => {
    const fixture = await setup(), sourceBytes = await readFile(join(fixture.path, '.edu/project.json'))
    await fixture.service.replacement!.generate(fixture.request); await fixture.service.waitForIdle()
    const state = await fixture.service.getState(fixture.identity)
    expect(state.candidate?.settings).toEqual({ n: 1, aspectRatio: '1:1' }); expect(fixture.calls()).toBe(1)
    expect((await fixture.service.getContent(fixture.identity))?.images).toEqual(fixture.original.images)
    expect(fixture.ai.get().settled?.outcome).toBe('candidate')
    const accepted = await fixture.service.replacement!.accept({ ...await fixture.candidateRequest(), caption: 'Corrected native caption', alt: 'Corrected diagram description' })
    expect(accepted.candidate).toBeNull(); expect(accepted.replacement).toBeUndefined()
    const current = await fixture.repository.load(await fixture.repository.resolve(fixture.handle, 'beliefs'))
    expect(current!.document).toEqual(fixture.original.document); expect(current!.images[1]).toEqual(fixture.original.images[1])
    expect(current!.images[0]!.asset!.previousVersionId).toBe('original'); expect(current!.previousRevisionIds).toEqual(['original'])
    expect(current!.plan.images[0]).toMatchObject({ prompt: fixture.request.prompt, caption: 'Corrected native caption', alt: 'Corrected diagram description' })
    expect(await readFile(join(fixture.path, '.edu/project.json'))).toEqual(sourceBytes)
    expect(await readFile(join(fixture.path, fixture.original.images[0]!.asset!.path))).toEqual(topicPng)
    expect(fixture.dispositions).toEqual([{ callId: 'replacement-call-1', state: 'published' }]); expect(fixture.calls()).toBe(1)
  })
  it('retains accepted bytes on candidate storage failure and denies replay until storage-only retry', async () => {
    const fixture = await setup(), save = fixture.repository.saveCandidate
    fixture.repository.saveCandidate = async () => { throw new ApplicationError('STORAGE', 'Fixture candidate write failure') }
    await fixture.service.replacement!.generate(fixture.request); await fixture.service.waitForIdle()
    const state = await fixture.service.getState(fixture.identity), replacement = state.replacement!
    expect(replacement.status).toBe('unsaved'); expect(state.candidate).toBeNull()
    expect(() => fixture.service.replacement!.generate(fixture.request)).toThrow('Retry save')
    fixture.repository.saveCandidate = save
    await fixture.service.replacement!.retrySave({ ...await fixture.candidateRequest(), pendingResultId: replacement.pendingResultId! })
    expect((await fixture.service.getState(fixture.identity)).candidate).toBeTruthy(); expect(fixture.calls()).toBe(1)
    await fixture.service.replacement!.discard(await fixture.candidateRequest()); expect(fixture.calls()).toBe(1)
  })
  it('archives candidate namespaces before Keep, rejects changed marker bytes, and never treats copied mirrors as ownership', async () => {
    const fixture = await setup()
    await fixture.service.replacement!.generate(fixture.request); await fixture.service.waitForIdle()
    const state = await fixture.service.getState(fixture.identity), candidate = state.candidate!, request = await fixture.candidateRequest()
    const marker = join(fixture.path, topicCandidatePath(candidate.candidateId)), original = await readFile(marker, 'utf8')
    await writeFile(marker, original.replace(candidate.prompt, 'External edited prompt'))
    await expect(fixture.service.replacement!.accept({ ...request, caption: 'Corrected', alt: 'Corrected' })).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(fixture.service.replacement!.discard(request)).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(await readFile(marker, 'utf8')).toContain('External edited prompt')
    await writeFile(marker, original)
    await fixture.service.replacement!.discard(request)
    const context = await fixture.repository.resolve(fixture.handle, 'beliefs'), generated = candidate.asset.path.replace(/images\/.*$/, 'chapter.md')
    expect(await fixture.repository.excludedSources(context, [generated])).toEqual([generated])
    await mkdir(join(fixture.path, 'copied/.edu'), { recursive: true })
    await writeFile(join(fixture.path, 'copied/.edu/topic.json'), await readFile(join(fixture.path, fixture.authority.folderName, '.edu/topic.json')))
    expect(await fixture.repository.excludedSources(context, [generated.replace(fixture.authority.folderName, 'copied')])).toEqual([])
    await rm(join(fixture.path, 'copied'), { recursive: true })
    expect((await fixture.service.getState(fixture.identity)).replacement).toBeUndefined(); expect(fixture.calls()).toBe(1)
  })
  it('restores requested attempts as interrupted with no replay and permits exact explicit Keep', async () => {
    const fixture = await setup(), save = fixture.repository.saveCandidate
    fixture.repository.stageAsset = async () => { throw new ApplicationError('NETWORK', 'Provider fixture lost pixels') }
    await fixture.service.replacement!.generate(fixture.request); await fixture.service.waitForIdle()
    fixture.repository.saveCandidate = save
    expect((await fixture.service.getState(fixture.identity)).replacement?.status).toBe('interrupted')
    const request = await fixture.candidateRequest()
    await expect(fixture.service.replacement!.discard({ ...request, candidateId: 'wrong-candidate' })).rejects.toMatchObject({ code: 'CONFLICT' })
    await fixture.service.replacement!.discard(request); expect(fixture.calls()).toBe(1)
  })
  it('retains published truth when accounting fails after marker commit', async () => {
    const fixture = await setup()
    await fixture.service.replacement!.generate(fixture.request); await fixture.service.waitForIdle()
    fixture.dispositions.push = () => { throw new ApplicationError('STORAGE', 'Accounting fixture fault') }
    const state = await fixture.service.replacement!.accept({ ...await fixture.candidateRequest(), caption: 'Corrected caption', alt: 'Corrected alt' })
    expect(state.published?.revisionId).not.toBe('original'); expect(state.candidate).toBeNull(); expect(state.message).toContain('published')
    expect((await fixture.service.getContent(fixture.identity))?.plan.images[0]!.caption).toBe('Corrected caption')
  })
  it('restores confirmed Use with a committed journal and retires controls through storage-only cleanup', async () => {
    let crash = false
    const fixture = await setup(point => { if (crash && point === 'after-marker') throw new ApplicationError('STORAGE', 'Fixture process lost after marker') })
    await fixture.service.replacement!.generate(fixture.request); await fixture.service.waitForIdle()
    const request = await fixture.candidateRequest(); crash = true
    await expect(fixture.service.replacement!.accept({ ...request, caption: 'Saved caption', alt: 'Saved alt' })).rejects.toMatchObject({ code: 'STORAGE' })
    await fixture.service.dispose(); const restarted = fixture.restart()
    const restored = await restarted.getState(fixture.identity)
    expect(restored.replacement?.status).toBe('published'); expect(restored.candidate).toBeNull(); expect(restored.replacement?.pendingResultId).toBeTruthy()
    expect((await restarted.getContent(fixture.identity))?.plan.images[0]!.caption).toBe('Saved caption')
    crash = false
    await restarted.replacement!.retrySave({ ...request, pendingResultId: restored.replacement!.pendingResultId! })
    expect((await restarted.getState(fixture.identity)).replacement).toBeUndefined(); expect(fixture.calls()).toBe(1)
    expect(fixture.dispositions.at(-1)).toEqual({ callId: 'replacement-call-1', state: 'published' })
  })
  it('rejects stale sources and read-only authority before provider discovery, and exposes orphan cleanup without hiding prose', async () => {
    const fixture = await setup()
    await writeFile(join(fixture.path, 'source.md'), 'Changed external source')
    await expect(fixture.service.replacement!.generate(fixture.request)).rejects.toMatchObject({ code: 'CONFLICT' })
    await fixture.service.waitForIdle(); expect(fixture.preparations()).toBe(0)
    await writeFile(join(fixture.path, 'source.md'), 'Original delivered source')
    const resolve = fixture.repository.resolve
    fixture.repository.resolve = async (...args) => { const context = await resolve(...args); context.writable = false; return context }
    await expect(fixture.service.replacement!.generate(fixture.request)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await fixture.service.waitForIdle(); expect(fixture.preparations()).toBe(0)
    fixture.repository.resolve = resolve
    await fixture.service.replacement!.generate(fixture.request); await fixture.service.waitForIdle()
    const request = await fixture.candidateRequest()
    const replacement = await contentManifest(fixture.storage, fixture.authority, 'external-new')
    await fixture.storage.publish(fixture.authority, replacement)
    const state = await fixture.service.getState(fixture.identity)
    expect(state.published?.revisionId).toBe('external-new'); expect(state.candidate).toBeNull(); expect(state.replacement).toBeTruthy()
    await expect(fixture.service.replacement!.accept({ ...request, caption: 'Caption', alt: 'Alt' })).rejects.toMatchObject({ code: 'CONFLICT' })
    await fixture.service.replacement!.discard(request)
    expect((await fixture.service.getContent(fixture.identity))?.identity.revisionId).toBe('external-new'); expect(fixture.calls()).toBe(1)
  })

  it('archives partial Use output before control removal and resumes explicit discard after that crash window', async () => {
    let fail = false
    const fixture = await setup(point => { if (fail && point === 'after-tree') throw new ApplicationError('STORAGE', 'Fixture partial publication') })
    await fixture.service.replacement!.generate(fixture.request); await fixture.service.waitForIdle()
    const request = await fixture.candidateRequest(), attempt = await fixture.repository.loadReplacementAttempt(await fixture.repository.resolve(fixture.handle, 'beliefs'), request.candidateId)
    fail = true
    await expect(fixture.service.replacement!.accept({ ...request, caption: 'Retained caption', alt: 'Retained alt' })).rejects.toMatchObject({ code: 'STORAGE' })
    const chapter = join(fixture.path, attempt!.outputDirectory, 'chapter.md'), bytes = await readFile(chapter)
    const discard = fixture.repository.discardPublication
    fixture.repository.discardPublication = async () => { throw new ApplicationError('STORAGE', 'Fixture crash after archive') }
    await expect(fixture.service.replacement!.discard(request)).rejects.toMatchObject({ code: 'STORAGE' })
    const archives = await readdir(join(fixture.path, '.edu/content-image-abandoned'))
    expect(archives).toEqual([`${attempt!.candidateId}-${attempt!.sequence}.json`])
    expect(await readFile(join(fixture.path, topicCandidatePath(attempt!.candidateId)))).toBeTruthy()
    fixture.repository.discardPublication = discard; await fixture.service.dispose()
    const restarted = fixture.restart()
    await restarted.replacement!.discard(request)
    const context = await fixture.repository.resolve(fixture.handle, 'beliefs')
    expect(await fixture.repository.excludedSources(context, [`${attempt!.outputDirectory}/chapter.md`])).toEqual([`${attempt!.outputDirectory}/chapter.md`])
    expect(await readFile(chapter)).toEqual(bytes); expect(await readFile(join(fixture.path, topicJournalPath('beliefs'))).catch(() => null)).toBeNull()
    expect((await restarted.getContent(fixture.identity))?.identity.revisionId).toBe('original'); expect(fixture.calls()).toBe(1)
  }, 15_000)
  it('claims global storage admission before async Use and waits for its held durable write', async () => {
    const fixture = await setup()
    await fixture.service.replacement!.generate(fixture.request); await fixture.service.waitForIdle()
    const publish = fixture.repository.publish; let release!: () => void
    const barrier = new Promise<void>(resolve => { release = resolve })
    const entered = vi.fn()
    fixture.repository.publish = async (...args) => { entered(); await barrier; return publish(...args) }
    const task = fixture.service.replacement!.accept({ ...await fixture.candidateRequest(), caption: 'Caption', alt: 'Alt' })
    await vi.waitFor(() => expect(entered).toHaveBeenCalled())
    expect(() => fixture.ai.claim({ kind: 'test-sol', model: { id: 'gpt-6.1-sol', name: 'Sol' }, heading: 'Test', requestSummary: '' })).toThrow('storage')
    let idle = false; const waiting = fixture.service.waitForIdle().then(() => { idle = true })
    await new Promise(resolve => setTimeout(resolve, 10)); expect(idle).toBe(false)
    release(); await task; await waiting; expect(fixture.calls()).toBe(1)
  })
  it('validates edited prompt, retained attempt lineage and future raster envelope before provider preparation', async () => {
    const fixture = await setup(), current = { ...fixture.original }
    current.plan = { ...current.plan, images: [{ ...current.plan.images[0]!, prompt: 'P'.repeat(16000) }, current.plan.images[1]!] }
    current.images = current.images.map((image, index) => index ? image : { ...image, previousAttempts: Array.from({ length: 100 }, (_, index) => ({ callId: `previous-${index}-${'x'.repeat(80)}`, status: 'unresolved' as const, uncertaintyAcknowledged: true })) })
    current.plan.sections = Array.from({ length: 4 }, (_, index) => ({ ...current.plan.sections[index % 2]!, id: `section-${index}` }))
    current.plan.images = Array.from({ length: 6 }, (_, index) => ({ ...current.plan.images[index % 2]!, id: index < 2 ? current.plan.images[index]!.id : `extra-${index}`, factualConstraints: Array.from({ length: 20 }, () => 'é'.repeat(2000)) }))
    current.images.push(...current.plan.images.slice(2).map(image => ({ imageId: image.id, status: 'planned' as const, callId: null, asset: null })))
    current.status = 'needs-images'
    const document = (size: number) => ({ ...current.document, introduction: 'x'.repeat(256 * 1024), synthesis: 'x'.repeat(256 * 1024), sourceNotes: Array.from({ length: 40 }, () => 'x'.repeat(2000)), sections: current.plan.sections.map(section => ({ id: section.id, markdown: 'x'.repeat(size), examples: ['Concrete example'], misconceptions: [] })) })
    // The complete published page is legal; retaining paid lineage plus future raster envelopes is not.
    const fits = (size: number) => { try { parseChapterManifest({ ...current, document: document(size) }); return true } catch { return false } }
    let low = 1000, high = 256 * 1024
    while (low + 1 < high) { const middle = Math.floor((low + high) / 2); if (fits(middle)) low = middle; else high = middle }
    current.document = document(low)
    fixture.repository.readState = async () => ({ manifest: parseChapterManifest(current), manifestDigest: current.baseline.expectedManifestDigest, stale: false, missingImageIds: [], issues: [], recovery: { kind: 'none' } })
    await expect(fixture.service.replacement!.generate({ ...fixture.request, prompt: 'P'.repeat(16000) })).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    await fixture.service.waitForIdle(); expect(fixture.preparations()).toBe(0); expect(fixture.calls()).toBe(0)
  })
})
