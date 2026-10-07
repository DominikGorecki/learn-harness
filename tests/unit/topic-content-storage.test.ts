import { link, mkdir, readFile, readdir, rename, rm, rmdir, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { createTopicContentStorage } from '../../src/main/storage/topic-content'
import { createTopicContentRepository } from '../../src/main/storage/topic-content-repository'
import { atomicWrite } from '../../src/main/storage/atomic-file'
import { contentDigest, topicCandidatePath, topicCheckpointPath, topicJournalPath, topicManifestPath, writeImmutableContent } from '../../src/main/storage/topic-content-files'
import { ApplicationError } from '../../src/shared/contracts'
import type { TopicImageCandidate } from '../../src/shared/topic-content'
import { contentCheckpoint, contentManifest, topicContentProject, topicContentTimestamp, topicPng } from '../fixtures/topic-content'

const roots: string[] = []
const setup = () => topicContentProject(root => roots.push(root))
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

describe('portable chapter publication and recovery', () => {
  it('explicitly discards only the proven uncommitted journal while preserving old and staged trees', async () => {
    const { path, storage, authority } = await setup(), first = await contentManifest(storage, authority)
    await storage.publish(authority, first)
    const next = await contentManifest(storage, authority, 'revision-2')
    const failing = createTopicContentStorage({ fault: point => { if (point === 'after-tree') throw new ApplicationError('STORAGE', 'Interruption') } })
    await expect(failing.publish(authority, next)).rejects.toMatchObject({ code: 'STORAGE' })
    const staged = await readFile(join(path, next.outputDirectory, 'chapter.md'))
    await expect(storage.discardPublication(authority, 'wrong-run', next.revisionId)).rejects.toMatchObject({ code: 'CONFLICT' })
    await storage.discardPublication(authority, next.provenance.runId, next.revisionId)
    expect((await storage.read(authority)).manifest).toEqual(first)
    expect(await readFile(join(path, next.outputDirectory, 'chapter.md'))).toEqual(staged)
    await expect(storage.retryPublication(authority)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(storage.discardPublication(authority, first.provenance.runId, first.revisionId)).rejects.toMatchObject({ code: 'CONFLICT' })
  })
  it('accepts an exact committed retry without a journal and rejects changed immutable bytes', async () => {
    const { path, storage, authority } = await setup(), manifest = await contentManifest(storage, authority)
    await storage.publish(authority, manifest); await storage.publish(authority, manifest)
    await writeFile(join(path, manifest.outputDirectory, 'chapter.md'), 'External bytes')
    await expect(storage.publish(authority, manifest)).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(await readFile(join(path, manifest.outputDirectory, 'chapter.md'), 'utf8')).toBe('External bytes')
  })
  it('prepares/reads without account or project mutation and publishes independent readable bytes', async () => {
    const { path, handle, workspace, storage, authority } = await setup()
    const project = await readFile(join(path, '.edu/project.json'), 'utf8')
    const prepared = await workspace.readTopicContent(handle, 'beliefs')
    expect(prepared).toMatchObject({ projectHandle: handle, projectId: 'portable-project', selectedModel: { id: 'offline-model' } })
    await expect(workspace.prepareTopicContent(handle, 'beliefs', 'offline-model')).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    expect((await storage.read(authority)).manifest).toBeNull()
    expect(await readdir(path)).toEqual(['.edu'])
    const manifest = await contentManifest(storage, authority, 'revision-1', true)
    await storage.publish(authority, manifest)
    expect((await storage.read(authority)).manifest).toEqual(manifest)
    expect(await readFile(join(path, manifest.outputDirectory, 'chapter.md'), 'utf8')).toContain('![Two people begin with different priors](images/illustration-revision-1.png)')
    expect(await readFile(join(path, '.edu/project.json'), 'utf8')).toBe(project)
    expect(JSON.parse(await readFile(join(path, 'beliefs/.edu/topic.json'), 'utf8'))).toMatchObject({ projectId: 'portable-project', topicId: 'beliefs' })
  })
  it.each(['after-journal', 'after-tree', 'before-marker'] as const)('retains the old chapter at %s and retries durable work after restart without inference', async point => {
    const { workspace, handle, path, storage, authority } = await setup()
    const original = await contentManifest(storage, authority); await storage.publish(authority, original)
    const next = await contentManifest(storage, authority, 'revision-2')
    const failing = createTopicContentStorage({ fault: current => { if (current === point) throw new ApplicationError('STORAGE', 'Simulated interruption') } })
    await expect(failing.publish(authority, next)).rejects.toMatchObject({ code: 'STORAGE' })
    expect((await storage.read(authority)).manifest?.revisionId).toBe('revision-1')
    const oldBytes = await readFile(join(path, original.outputDirectory, 'chapter.md'), 'utf8')
    const restart = createTopicContentStorage(), fresh = await restart.prepare(await workspace.readTopicContent(handle, 'beliefs'))
    expect((await restart.read(fresh)).recovery.kind).toBe('pending')
    await restart.retryPublication(fresh)
    expect((await restart.read(fresh)).manifest?.revisionId).toBe('revision-2')
    expect(await readFile(join(path, original.outputDirectory, 'chapter.md'), 'utf8')).toBe(oldBytes)
    await expect(readFile(join(path, topicJournalPath('beliefs')))).rejects.toMatchObject({ code: 'ENOENT' })
  })
  it('recognizes a committed marker after interruption and keeps inspection read-only', async () => {
    const { path, workspace, handle, storage, authority } = await setup()
    const manifest = await contentManifest(storage, authority, 'revision-1', true)
    const failing = createTopicContentStorage({ fault: point => { if (point === 'after-marker') throw new ApplicationError('STORAGE', 'Simulated crash') } })
    await expect(failing.publish(authority, manifest)).rejects.toMatchObject({ code: 'STORAGE' })
    const journal = await readFile(join(path, topicJournalPath('beliefs')), 'utf8')
    expect((await storage.read(authority)).recovery.kind).toBe('committed')
    expect(await readFile(join(path, topicJournalPath('beliefs')), 'utf8')).toBe(journal)
    const repository = createTopicContentRepository(workspace), context = await repository.resolve(handle, 'beliefs')
    const next = await contentManifest(storage, authority, 'revision-2', true)
    await repository.publish(context, next)
    expect((await repository.load(context))?.revisionId).toBe('revision-2')
    await expect(readFile(join(path, topicJournalPath('beliefs')))).rejects.toMatchObject({ code: 'ENOENT' })
  })
  it.each(['manifest', 'tree', 'journal'] as const)('preserves unknown external %s bytes and refuses recovery replacement', async target => {
    const { path, storage, authority } = await setup()
    const old = await contentManifest(storage, authority); await storage.publish(authority, old)
    const next = await contentManifest(storage, authority, 'revision-2')
    const failing = createTopicContentStorage({ fault: point => { if (point === 'after-tree') throw new ApplicationError('STORAGE', 'Crash') } })
    await expect(failing.publish(authority, next)).rejects.toThrow()
    const location = target === 'manifest' ? topicManifestPath('beliefs') : target === 'journal' ? topicJournalPath('beliefs') : next.outputDirectory + '/chapter.md'
    const unknown = target === 'manifest' ? JSON.stringify({ ...old, document: { ...old.document, introduction: 'External version' } }) : target === 'journal' ? '{unknown recovery format' : 'External chapter bytes'
    await writeFile(join(path, ...location.split('/')), unknown)
    await expect(storage.retryPublication(authority)).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(await readFile(join(path, ...location.split('/')), 'utf8')).toBe(unknown)
    expect((await storage.read(authority)).recovery.kind).toBe('conflict')
    expect(await readFile(join(path, old.outputDirectory, 'chapter.md'), 'utf8')).toContain('Reasoning about priors')
  })
  it('rechecks sources immediately before the marker and excludes only proven generated namespaces', async () => {
    const { path, storage, authority } = await setup()
    await mkdir(join(path, 'manual/content/tutorials/section'), { recursive: true })
    const source = 'manual/content/tutorials/section/intro.md'; await writeFile(join(path, source), 'Learner-owned source')
    const manifest = await contentManifest(storage, authority)
    manifest.baseline = await storage.captureBaseline(authority, [source])
    const failing = createTopicContentStorage({ fault: async point => { if (point === 'before-marker') await writeFile(join(path, source), 'Changed source') } })
    await expect(failing.publish(authority, manifest)).rejects.toMatchObject({ code: 'CONFLICT' })
    expect((await storage.read(authority)).manifest).toBeNull()
    expect(await readFile(join(path, source), 'utf8')).toBe('Changed source')
    const other = await setup(), saved = await contentManifest(other.storage, other.authority); await other.storage.publish(other.authority, saved)
    await expect(other.storage.captureBaseline(other.authority, [saved.outputDirectory + '/chapter.md'])).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
  it('retains valid chapters through unrelated topic changes while marking selected/context/source changes stale', async () => {
    const { path, storage, authority, document } = await setup()
    const manifest = await contentManifest(storage, authority); await storage.publish(authority, manifest)
    const changed = structuredClone(document); changed.outline!.document.lessons[1]!.overview = 'Unrelated topic change'
    await writeFile(join(path, '.edu/project.json'), JSON.stringify(changed))
    expect((await storage.read(authority)).stale).toBe(false)
    changed.outline!.document.lessons[0]!.overview = 'Updated selected topic'
    await writeFile(join(path, '.edu/project.json'), JSON.stringify(changed))
    expect((await storage.read(authority)).stale).toBe(true)
    await expect(storage.publish(authority, { ...manifest, revisionId: 'new', outputDirectory: 'beliefs/content/chapter/new', previousRevisionIds: ['revision-1'] })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect((await storage.read(authority)).manifest).toEqual(manifest)
  })
  it('binds worker source evidence to delivered bytes and retains previously inspected evidence', async () => {
    const { workspace, handle, path } = await setup(), repository = createTopicContentRepository(workspace), context = await repository.resolve(handle, 'beliefs')
    await writeFile(join(path, 'a.md'), 'Source A'); await writeFile(join(path, 'b.md'), 'Source B')
    const a = { path: 'a.md', digest: contentDigest('Source A') }, b = { path: 'b.md', digest: contentDigest('Source B') }
    await repository.recordSources(context, [a]); await repository.recordSources(context, [b])
    expect(context.baseline.sources).toEqual([a, b])
    await expect(repository.recordSources(context, [{ ...b, digest: contentDigest('Bytes never delivered') }])).rejects.toMatchObject({ code: 'CONFLICT' })
    const fresh = await repository.resolve(handle, 'beliefs')
    await expect(repository.recordSources(fresh, [{ ...a, digest: contentDigest('Different delivered bytes') }])).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(fresh.baseline.sources).toEqual([])
    await writeFile(join(path, 'a.md'), 'Changed A')
    await expect(repository.recordSources(context, [b])).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(repository.recordSources(context, [{ ...a, digest: contentDigest('Changed A') }, b])).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(context.baseline.sources).toEqual([a, b])
  })
  it('rejects reused historical revisions and any silent loss of retained revision pointers', async () => {
    const { storage, authority, path } = await setup(), original = await contentManifest(storage, authority, 'revision-a'); await storage.publish(authority, original)
    const second = await contentManifest(storage, authority, 'revision-b'); await storage.publish(authority, second)
    const oldBytes = await readFile(join(path, original.outputDirectory, 'chapter.md')), markerBytes = await readFile(join(path, topicManifestPath('beliefs')))
    const reuse = await contentManifest(storage, authority, 'revision-a')
    reuse.previousRevisionIds = ['revision-b']; reuse.document.sections[0]!.markdown = 'A different historical section'
    await expect(storage.publish(authority, reuse)).rejects.toMatchObject({ code: 'CONFLICT' })
    const next = await contentManifest(storage, authority, 'revision-c'); next.previousRevisionIds = ['revision-b']
    await expect(storage.publish(authority, next)).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(await readFile(join(path, original.outputDirectory, 'chapter.md'))).toEqual(oldBytes)
    expect(await readFile(join(path, topicManifestPath('beliefs')))).toEqual(markerBytes)
    await expect(readFile(join(path, topicJournalPath('beliefs')))).rejects.toMatchObject({ code: 'ENOENT' })
  })
  it('reads after relocation and degrades missing media without deleting prose', async () => {
    const { root, path, handle, workspace, storage, authority } = await setup()
    const manifest = await contentManifest(storage, authority, 'revision-1', true); await storage.publish(authority, manifest)
    const moved = join(root, 'relocated'); await rename(path, moved); await workspace.locate(handle, moved)
    const repository = createTopicContentRepository(workspace), state = await repository.inspect(handle, 'beliefs')
    expect(state.manifest).toEqual(manifest); expect(state.stale).toBe(false)
    const media = { projectHandle: handle, topicId: 'beliefs', chapterId: 'chapter', imageId: 'illustration', versionId: 'revision-1' }
    expect(Buffer.from((await repository.resolveMedia(media)).bytes)).toEqual(topicPng)
    await rm(join(moved, manifest.images[0]!.asset!.path))
    const missing = await repository.inspect(handle, 'beliefs')
    expect(missing.manifest?.document).toEqual(manifest.document); expect(missing.missingImageIds).toEqual(['illustration'])
  })
  it('preserves corrupt manifests/progress and rejects root replacement and linked asset aliases', async () => {
    const one = await setup(), manifest = await contentManifest(one.storage, one.authority, 'revision-1', true); await one.storage.publish(one.authority, manifest)
    await mkdir(join(one.path, '.edu/content-runs'), { recursive: true }); await writeFile(join(one.path, topicCheckpointPath('broken')), '{bad')
    await expect(one.storage.loadCheckpoint(one.authority, 'broken')).rejects.toMatchObject({ code: 'CONFLICT' })
    expect((await one.storage.read(one.authority)).manifest).toEqual(manifest)
    const media = { projectHandle: one.handle, topicId: 'beliefs', chapterId: 'chapter', imageId: 'illustration', versionId: 'revision-1' }
    await link(join(one.path, manifest.images[0]!.asset!.path), join(one.root, 'outside-alias.png'))
    await expect(one.storage.resolveMedia(one.authority, media)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await writeFile(join(one.path, topicManifestPath('beliefs')), '{"schemaVersion":99}')
    expect((await one.storage.read(one.authority)).issues[0]).toContain('manifest')
    expect(await readFile(join(one.path, topicManifestPath('beliefs')), 'utf8')).toBe('{"schemaVersion":99}')
    const two = await setup(); await rename(two.path, join(two.root, 'old')); await mkdir(two.path)
    await expect(two.storage.captureBaseline(two.authority)).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})

describe('checkpoints, candidates and immutable storage retry', () => {
  it('requires explicit charge acknowledgment even after an unresolved call is downgraded to failed', async () => {
    const { storage, authority, handle } = await setup(), checkpoint = await contentCheckpoint(storage, authority)
    await storage.saveCheckpoint(authority, checkpoint)
    const failed = { ...checkpoint, checkpointRevision: 2, images: checkpoint.images.map(image => ({ ...image, status: 'failed' as const })) }
    await storage.saveCheckpoint(authority, failed)
    const retry = { projectId: handle, topicId: checkpoint.topicId, chapterId: checkpoint.chapterId, runId: checkpoint.runId,
      checkpointRevision: 2, imageId: 'illustration', priorCallId: 'paid-intent', acknowledgeUncertainCharge: false }
    const next = { ...failed, checkpointRevision: 3, images: [{ ...failed.images[0]!, status: 'planned' as const, callId: null,
      previousAttempts: [{ callId: 'paid-intent', status: 'failed' as const, uncertaintyAcknowledged: true }] }] }
    await expect(storage.saveCheckpoint(authority, next, retry)).rejects.toMatchObject({ code: 'CONFLICT' })
    await storage.saveCheckpoint(authority, next, { ...retry, acknowledgeUncertainCharge: true })
    expect((await storage.loadCheckpoint(authority, checkpoint.runId))?.images[0]?.previousAttempts).toEqual(next.images[0]!.previousAttempts)
  })
  it('persists restart-safe unresolved paid intents and prevents their erasure through Continue', async () => {
    const { workspace, handle, storage, authority, path } = await setup(), checkpoint = await contentCheckpoint(storage, authority)
    await storage.saveCheckpoint(authority, checkpoint)
    const fresh = await createTopicContentStorage().prepare(await workspace.readTopicContent(handle, 'beliefs'))
    expect(await storage.loadCheckpoint(fresh, 'run')).toEqual(checkpoint)
    await expect(storage.saveCheckpoint(fresh, { ...checkpoint, checkpointRevision: 2, images: [{ imageId: 'illustration', status: 'planned', callId: null, asset: null }] })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(await readFile(join(path, topicCheckpointPath('run')), 'utf8')).toContain('paid-intent')
    await expect(storage.discardProgress(fresh, 'run', 2)).rejects.toMatchObject({ code: 'CONFLICT' })
    // Simulate a crash after the immutable archive publication but before progress unlink.
    await writeImmutableContent(path, '.edu/content-abandoned/run-1.json', JSON.stringify(checkpoint, null, 2) + '\n')
    await storage.discardProgress(fresh, 'run', 1)
    expect(await storage.loadCheckpoint(fresh, 'run')).toBeNull()
    expect(await storage.excludedSources(fresh, [checkpoint.outputDirectory + '/chapter.md', 'manual/content/tutorial/section/intro.md'])).toEqual([checkpoint.outputDirectory + '/chapter.md'])
    await storage.saveCheckpoint(fresh, checkpoint)
    await storage.saveCheckpoint(fresh, { ...checkpoint, checkpointRevision: 2 })
    await storage.discardProgress(fresh, 'run', 2)
    expect(await readdir(join(path, '.edu/content-abandoned'))).toEqual(['run-1.json', 'run-2.json'])
  })
  it('keeps image candidates separate, rejects expired baselines, and retains original/candidate assets on discard', async () => {
    const { storage, authority, path, handle } = await setup(), original = await contentManifest(storage, authority, 'revision-1', true); await storage.publish(authority, original)
    const old = original.images[0]!.asset!, asset = { ...old, versionId: 'replacement', callId: 'replacement-call', previousVersionId: old.versionId, path: 'beliefs/content/chapter/replacement/images/illustration-replacement.png' }
    await storage.stageAsset(authority, original.plan, 'replacement', asset, topicPng)
    const candidate: TopicImageCandidate = { schemaVersion: 1, projectId: 'portable-project', topicId: 'beliefs', chapterId: 'chapter', revisionId: 'replacement', candidateId: 'candidate', imageId: 'illustration', expectedRevisionId: original.revisionId,
      expectedImageVersionId: old.versionId, expectedManifestDigest: (await storage.read(authority)).manifestDigest!, prompt: 'A clearer prior comparison', caption: 'A comparison', alt: 'Different starting beliefs', asset, createdAt: topicContentTimestamp }
    await storage.saveCandidate(authority, candidate)
    const request = { projectHandle: handle, topicId: 'beliefs', chapterId: 'chapter', imageId: 'illustration', versionId: 'replacement', candidateId: 'candidate' }
    expect(Buffer.from((await storage.resolveMedia(authority, request)).bytes)).toEqual(topicPng)
    await expect(storage.resolveMedia(authority, { ...request, candidateId: undefined })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(storage.saveCandidate(authority, { ...candidate, candidateId: 'other', expectedImageVersionId: 'changed' })).rejects.toThrow()
    expect((await storage.read(authority)).manifest).toEqual(original)
    await storage.discardCandidate(authority, 'candidate', original.revisionId)
    await expect(storage.resolveMedia(authority, request)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(await readFile(join(path, old.path))).toEqual(topicPng); expect(await readFile(join(path, asset.path))).toEqual(topicPng)
    await expect(readFile(join(path, topicCandidatePath('candidate')))).rejects.toMatchObject({ code: 'ENOENT' })
  })
  it('copies accepted media into a fresh completion revision and never writes the published tree', async () => {
    const { storage, authority, path } = await setup(), old = await contentManifest(storage, authority, 'revision-1', true); await storage.publish(authority, old)
    const chapterBytes = await readFile(join(path, old.outputDirectory, 'chapter.md'))
    await expect(storage.stageAsset(authority, old.plan, old.revisionId, old.images[0]!.asset!, topicPng)).rejects.toMatchObject({ code: 'CONFLICT' })
    const [copied] = await storage.copyAcceptedImages(authority, old.plan, 'completion')
    expect(copied!.path).toBe('beliefs/content/chapter/completion/images/illustration-revision-1.png')
    expect(await readFile(join(path, copied!.path))).toEqual(topicPng)
    expect(await readFile(join(path, old.outputDirectory, 'chapter.md'))).toEqual(chapterBytes)
    const next = { ...old, revisionId: 'completion', outputDirectory: 'beliefs/content/chapter/completion', images: [{ ...old.images[0]!, asset: copied! }], baseline: await storage.captureBaseline(authority), previousRevisionIds: ['revision-1'] }
    await storage.publish(authority, next)
    expect((await storage.read(authority)).manifest?.revisionId).toBe('completion')
  })
  it('retries a failed owned-folder mirror without adopting unknown directories', async () => {
    const { authority, path } = await setup()
    let fail = true
    const storage = createTopicContentStorage({ write: async (target, bytes) => { if (fail && target.endsWith(join('.edu', 'topic.json'))) { fail = false; throw new ApplicationError('STORAGE', 'Disk full') }; await atomicWrite(target, bytes) } })
    const manifest = await contentManifest(storage, authority)
    await expect(storage.publish(authority, manifest)).rejects.toMatchObject({ code: 'STORAGE' })
    expect(authority.folder?.content).toBeNull()
    await storage.publish(authority, manifest)
    expect((await storage.read(authority)).manifest).toEqual(manifest)
    expect(await readFile(join(path, '.edu/project.json'), 'utf8')).toContain('portable-project')
  })
  it('keeps final immutable bytes absent after a partial private write and preserves racing external targets', async () => {
    const { path } = await setup(), relative = 'beliefs/content/chapter/retry/chapter.md', final = join(path, ...relative.split('/'))
    await expect(writeImmutableContent(path, relative, 'A full chapter', async file => { await file.writeFile('partial'); throw new ApplicationError('STORAGE', 'Write interrupted') })).rejects.toMatchObject({ code: 'STORAGE' })
    await expect(readFile(final)).rejects.toMatchObject({ code: 'ENOENT' })
    await writeImmutableContent(path, relative, 'A full chapter')
    expect(await readFile(final, 'utf8')).toBe('A full chapter')
    const racing = 'beliefs/content/chapter/race/chapter.md'
    await expect(writeImmutableContent(path, racing, 'App bytes', async (file, bytes) => { await file.writeFile(bytes); await writeFile(join(path, ...racing.split('/')), 'External bytes') })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(await readFile(join(path, ...racing.split('/')), 'utf8')).toBe('External bytes')
    expect((await readdir(join(path, '.edu/content-file-intents')))).toEqual([])
  })
  it.each(['after-tree', 'after-marker'] as const)('finishes a proven crash-window temporary hardlink through serialized recovery at %s', async point => {
    const { workspace, handle, path, storage, authority } = await setup(), original = await contentManifest(storage, authority); await storage.publish(authority, original)
    const next = await contentManifest(storage, authority, 'revision-2'), failing = createTopicContentStorage({ fault: current => { if (current === point) throw new ApplicationError('STORAGE', 'Crash') } })
    await expect(failing.publish(authority, next)).rejects.toThrow()
    const relative = next.outputDirectory + '/chapter.md', target = join(path, relative), bytes = await readFile(target), uuid = randomUUID(), temporaryName = `.chapter.md.${uuid}.content.tmp`, temporary = join(path, next.outputDirectory, temporaryName)
    await link(target, temporary)
    await writeFile(join(path, '.edu/content-file-intents', uuid + '.json'), JSON.stringify({ version: 1, target: relative, temporary: temporaryName, digest: contentDigest(bytes), bytes: bytes.length }))
    expect((await storage.read(authority)).recovery.kind).toBe('conflict')
    expect(await readFile(temporary)).toEqual(bytes)
    const repository = createTopicContentRepository(workspace), context = await repository.resolve(handle, 'beliefs')
    if (point === 'after-marker') await repository.recover(context)
    else await repository.retryPublication(context)
    expect((await repository.load(context))?.revisionId).toBe('revision-2')
    expect(await readFile(target)).toEqual(bytes)
    await expect(readFile(temporary)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readdir(join(path, '.edu/content-file-intents'))).toEqual([])
  })
  it('rejects linked/ambiguous/shared ownership and preserves learner sources', async () => {
    const { path, projectStorage, authority, document, root } = await setup()
    await mkdir(join(path, 'beliefs')); await mkdir(join(path, 'Beliefs before evidence'))
    await expect(projectStorage.prepareTopicFolder(path, document.projectId, authority.prepared.topic, 1, document.outline!.document.lessons.slice(1))).rejects.toMatchObject({ code: 'CONFLICT' })
    await rmdir(join(path, 'Beliefs before evidence'))
    const other = { ...document.outline!.document.lessons[1]!, sources: ['beliefs/shared.md'] }
    await expect(projectStorage.prepareTopicFolder(path, document.projectId, authority.prepared.topic, 1, [other])).rejects.toMatchObject({ code: 'CONFLICT' })
    await rmdir(join(path, 'beliefs')); await mkdir(join(root, 'outside')); await writeFile(join(root, 'outside/notes.md'), 'Outside source')
    await symlink(join(root, 'outside'), join(path, 'materials'), 'junction')
    await expect(projectStorage.prepareTopicFolder(path, document.projectId, { ...authority.prepared.topic, sources: ['materials/notes.md'] }, 1, [])).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(await readFile(join(root, 'outside/notes.md'), 'utf8')).toBe('Outside source')
  })
  it('serializes content writes with metadata and retains token ownership until active mutation settles', async () => {
    const { workspace, handle } = await setup()
    const lease = workspace.lockTopicContent(handle)
    await expect(workspace.saveBrief(handle, 'Competing change')).rejects.toMatchObject({ code: 'BUSY' })
    expect((await workspace.readTopicContent(handle, 'beliefs')).projectId).toBe('portable-project')
    let finish!: () => void
    const blocked = new Promise<void>(resolve => { finish = resolve })
    const mutation = lease.mutate('beliefs', async () => { await blocked })
    await new Promise(resolve => setTimeout(resolve, 0)); lease.release()
    expect(() => workspace.lockTopicContent(handle)).toThrow()
    finish(); await mutation
    await new Promise(resolve => setTimeout(resolve, 0))
    await workspace.saveBrief(handle, 'A later authorized change')
    await expect(lease.mutate('beliefs', async () => {})).rejects.toMatchObject({ code: 'CONFLICT' })
  })
  it('makes case-distinct topic manifest names deterministic and rejects forged media scope', async () => {
    expect(topicManifestPath('Topic')).not.toBe(topicManifestPath('topic'))
    const { storage, authority, handle } = await setup(), manifest = await contentManifest(storage, authority, 'revision-1', true); await storage.publish(authority, manifest)
    const request = { projectHandle: handle, topicId: 'beliefs', chapterId: 'chapter', imageId: 'illustration', versionId: 'revision-1' }
    for (const patch of [{ projectHandle: 'other' }, { topicId: 'evidence' }, { chapterId: 'other' }, { imageId: 'other' }, { versionId: 'unknown' }]) await expect(storage.resolveMedia(authority, { ...request, ...patch })).rejects.toThrow()
    expect(contentDigest(await readFile(join(authority.prepared.path, manifest.images[0]!.asset!.path)))).toBe(manifest.images[0]!.asset!.digest)
  })
})
