import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceService } from '../../src/core/workspace/service'
import { GenerationService } from '../../src/core/generation/service'
import { createProjectStorage } from '../../src/main/storage/project-storage'
import { createProjectRegistry } from '../../src/main/storage/project-registry'
import { atomicWrite } from '../../src/main/storage/atomic-file'
import { projectTools } from '../../src/main/generation/project-tools'
import { applyProjectEdits } from '../../src/main/storage/project-files'
import { beginFileTransaction } from '../../src/main/storage/project-file-transaction'
import { parseRewriteTopic } from '../../src/shared/generation'
import { ApplicationError } from '../../src/shared/contracts'
import { learningOutline } from '../fixtures/learning-outline'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
async function setup() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-topic-'))); roots.push(root)
  const path = join(root, 'project'); await mkdir(path)
  let failSave = false, id = 0
  const storage = createProjectStorage({ write: async (file, content) => {
    if (failSave && file === join(path, '.edu/project.json')) throw new ApplicationError('STORAGE', 'Disk full.')
    await atomicWrite(file, content)
  } })
  const workspace = new WorkspaceService({ storage, registry: createProjectRegistry(join(root, 'profile')), models: () => [{ id: 'model', name: 'Model' }], createId: () => `id-${++id}`, now: () => new Date().toISOString() })
  await workspace.initialize()
  const projectId = (await workspace.open(path)).activeProject!.id
  const generate = vi.fn<ConstructorParameters<typeof GenerationService>[0]['generate']>(async () => ({ kind: 'outline', document: learningOutline() }))
  const service = new GenerationService({ workspace, generate, createId: () => `run-${++id}`, now: () => new Date().toISOString(), onBusy: () => {}, onAccountFailure: () => {} })
  service.start({ projectId, modelId: 'model', brief: 'Bayesian reasoning', replace: false }); await service.waitForIdle()
  await mkdir(join(path, 'beliefs')); await mkdir(join(path, 'evidence'))
  await writeFile(join(path, 'beliefs/notes.md'), 'Original topic notes')
  await writeFile(join(path, 'evidence/notes.md'), 'Other topic notes')
  const original = workspace.get().activeProject!.outline!
  const request = { projectId, modelId: 'model', topicId: 'beliefs', changes: 'Learn further history on this topic' }
  return { root, path, workspace, storage, service, generate, original, request, failSave: (value: boolean) => { failSave = value } }
}

describe('topic edits and project file access', () => {
  it('saves only the selected lesson, updates its existing folder and ignores unrelated outline proposals', async () => {
    const { path, workspace, service, generate, request, original } = await setup()
    const proposal = learningOutline()
    proposal.title = 'Unauthorized project rename'; proposal.scope = 'Unauthorized scope'; proposal.lessons.reverse()
    proposal.startingLessonId = 'evidence'; proposal.lessons[0]!.overview = 'Unauthorized other lesson'
    const revised = proposal.lessons.find(lesson => lesson.id === 'beliefs')!
    revised.overview = 'Learn the history of priors.'
    generate.mockResolvedValueOnce({ kind: 'outline', document: proposal, projectEdits: [
      { path: 'beliefs/notes.md', expectedContent: 'Original topic notes', content: 'History of priors' },
      { path: 'beliefs/history/timeline.md', expectedContent: null, content: 'A historical timeline' }
    ] })
    service.rewriteTopic(request); await service.waitForIdle()
    expect(service.get().runs[0]?.status).toBe('saved')
    expect(workspace.get().activeProject!.outline!.document).toEqual({ ...original.document, lessons: [revised, original.document.lessons[1]] })
    expect(generate.mock.calls[1]![0]).toMatchObject({ topicId: 'beliefs', topicWriteRoot: 'beliefs', currentOutline: original, changes: request.changes })
    expect(await readFile(join(path, 'beliefs/notes.md'), 'utf8')).toBe('History of priors')
    expect(await readFile(join(path, 'beliefs/history/timeline.md'), 'utf8')).toBe('A historical timeline')
    expect(await readFile(join(path, 'evidence/notes.md'), 'utf8')).toBe('Other topic notes')
    const mirror = JSON.parse(await readFile(join(path, 'beliefs/.edu/topic.json'), 'utf8'))
    expect(mirror).toMatchObject({ topicId: request.topicId, topic: revised })
  })
  it('rejects worker-proposed writes outside the topic and refuses a missing or changed topic identifier', async () => {
    const { path, service, generate, request, original, workspace } = await setup()
    generate.mockResolvedValueOnce({ kind: 'outline', document: learningOutline(), projectEdits: [{ path: 'evidence/notes.md', content: 'Wrong topic', expectedContent: 'Other topic notes' }] })
    service.rewriteTopic(request); await service.waitForIdle()
    expect(service.get().runs[0]?.errorCode).toBe('FORBIDDEN')
    expect(workspace.get().activeProject!.outline).toEqual(original)
    expect(await readFile(join(path, 'evidence/notes.md'), 'utf8')).toBe('Other topic notes')
    const invalid = learningOutline(); invalid.lessons[0]!.id = 'changed-id'; invalid.startingLessonId = 'changed-id'
    generate.mockResolvedValueOnce({ kind: 'outline', document: invalid })
    service.rewriteTopic(request); await service.waitForIdle()
    expect(service.get().runs[0]?.errorCode).toBe('INVALID_INPUT')
    service.rewriteTopic({ ...request, topicId: 'unknown' }); await service.waitForIdle()
    expect(service.get().runs[0]?.errorCode).toBe('NOT_FOUND')
    expect(generate).toHaveBeenCalledTimes(3)
  })
  it('rolls back topic files after a failed outline save and retries the retained edits without inference', async () => {
    const { path, storage, service, generate, request, original, failSave } = await setup()
    const proposal = learningOutline(); proposal.lessons[0]!.overview = 'New historical coverage'
    generate.mockImplementationOnce(async () => {
      failSave(true)
      return { kind: 'outline', document: proposal, projectEdits: [{ path: 'beliefs/notes.md', expectedContent: 'Original topic notes', content: 'History of priors' }] }
    })
    service.rewriteTopic(request); await service.waitForIdle()
    const run = service.get().runs[0]!
    expect(run.status).toBe('unsaved')
    expect((await storage.load(path)).document?.outline).toEqual(original)
    expect(await readFile(join(path, 'beliefs/notes.md'), 'utf8')).toBe('Original topic notes')
    await expect(readFile(join(path, 'beliefs/.edu/topic.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    failSave(false)
    await service.retrySave({ projectId: request.projectId, runId: run.id })
    expect(service.get().runs[0]?.status).toBe('saved')
    expect(await readFile(join(path, 'beliefs/notes.md'), 'utf8')).toBe('History of priors')
    expect(generate).toHaveBeenCalledTimes(2)
  })
  it('preserves external file changes and refuses ambiguous, shared or linked topic folders', async () => {
    const { path, root, service, generate, request, storage, workspace } = await setup()
    generate.mockImplementationOnce(async () => {
      await writeFile(join(path, 'beliefs/notes.md'), 'External edit')
      return { kind: 'outline', document: learningOutline(), projectEdits: [{ path: 'beliefs/notes.md', content: 'Overwrite', expectedContent: 'Original topic notes' }] }
    })
    service.rewriteTopic(request); await service.waitForIdle()
    expect(service.get().runs[0]?.errorCode).toBe('CONFLICT')
    expect(await readFile(join(path, 'beliefs/notes.md'), 'utf8')).toBe('External edit')
    expect((await storage.load(path)).document?.outline).toBeTruthy()
    await expect(readFile(join(path, '.edu/file-transaction.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    const projectId = workspace.get().activeProject!.projectId!, lesson = learningOutline().lessons[0]!
    await mkdir(join(path, lesson.title))
    await expect(storage.prepareTopicFolder(path, projectId, lesson, 1, [])).rejects.toMatchObject({ code: 'CONFLICT' })
    await rm(join(path, lesson.title), { recursive: true })
    const shared = learningOutline().lessons[1]!; shared.sources = ['beliefs/notes.md']
    await expect(storage.prepareTopicFolder(path, projectId, lesson, 1, [shared])).rejects.toMatchObject({ code: 'CONFLICT' })
    await rm(join(path, 'beliefs'), { recursive: true })
    await symlink(root, join(path, 'beliefs'), 'junction')
    await expect(storage.prepareTopicFolder(path, projectId, lesson, 1, [])).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
  it('gives Pi whole-project reading and general creation/editing, while topic tools restrict only writes', async () => {
    const { path } = await setup()
    const reads = new Set<string>()
    const scoped = projectTools(path, new AbortController().signal, reads, 'beliefs')
    const read = scoped.tools.find(tool => tool.name === 'read_project_file')!, write = scoped.tools.find(tool => tool.name === 'write_project_file')!
    await read.execute('read', { path: 'evidence/notes.md' })
    expect(reads.has('evidence/notes.md')).toBe(true)
    await expect(write.execute('write', { path: 'evidence/notes.md', content: 'Unauthorized' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await write.execute('write', { path: 'beliefs/history.md', content: 'New history' })
    await expect(readFile(join(path, 'beliefs/history.md'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(scoped.edits()).toEqual([{ path: 'beliefs/history.md', expectedContent: null, content: 'New history' }])
    const full = projectTools(path, new AbortController().signal, new Set())
    await full.tools.find(tool => tool.name === 'write_project_file')!.execute('write', { path: 'new-material/examples.json', content: '{"example":1}' })
    expect(full.edits()[0]?.path).toBe('new-material/examples.json')
    for (const outside of ['../outside.md', 'C:/outside.md', 'beliefs/link/escape.md', '.edu/project.json', '.git/config']) {
      if (outside.includes('link')) await symlink(join(path, 'evidence'), join(path, 'beliefs/link'), 'junction')
      await expect(write.execute('write', { path: outside, content: 'Bad write' })).rejects.toBeDefined()
    }
  })
  it('rejects forged caller context and validates a bounded topic request', () => {
    const request = { projectId: 'project', modelId: 'model', topicId: 'beliefs', changes: 'Add history' }
    expect(parseRewriteTopic(request)).toEqual(request)
    for (const addition of [{ topicId: '../outside' }, { changes: ' ' }, { changes: 'x'.repeat(32_001) }, { path: '/tmp' }, { currentOutline: learningOutline() }]) expect(() => parseRewriteTopic({ ...request, ...addition })).toThrow()
  })
  it('general Pi outline requests can save content at the project root and in new folders', async () => {
    const { path, service, generate, request } = await setup()
    generate.mockResolvedValueOnce({ kind: 'outline', document: learningOutline(), projectEdits: [
      { path: 'research.md', expectedContent: null, content: 'Requested project-wide research notes' },
      { path: 'new-topic/examples.json', expectedContent: null, content: '{"example":1}' }
    ] })
    service.rewrite({ projectId: request.projectId, modelId: request.modelId, changes: 'Create research notes and a new example file' }); await service.waitForIdle()
    expect(service.get().runs[0]?.status).toBe('saved')
    expect(await readFile(join(path, 'research.md'), 'utf8')).toBe('Requested project-wide research notes')
    expect(await readFile(join(path, 'new-topic/examples.json'), 'utf8')).toBe('{"example":1}')
  })
  it('recovery restores files after an interruption before the outline commit, and preserves files after the commit', async () => {
    const { path, storage } = await setup()
    const previous = await storage.load(path)
    const edits = [{ path: 'beliefs/notes.md', expectedContent: 'Original topic notes', content: 'New history' },
      { path: 'beliefs/new.md', expectedContent: null, content: 'New material' }]
    const next = { ...previous.document!, revision: previous.document!.revision + 1 }
    const content = JSON.stringify(next, null, 2) + '\n'
    const nextDigest = createHash('sha256').update(content).digest('hex')
    await beginFileTransaction(path, next.projectId, previous.digest, nextDigest, edits, atomicWrite)
    await applyProjectEdits(path, edits)
    expect((await createProjectStorage().load(path)).document).toEqual(previous.document)
    expect(await readFile(join(path, 'beliefs/notes.md'), 'utf8')).toBe('Original topic notes')
    await expect(readFile(join(path, 'beliefs/new.md'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readFile(join(path, '.edu/file-transaction.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    await beginFileTransaction(path, next.projectId, previous.digest, nextDigest, edits, atomicWrite)
    await applyProjectEdits(path, edits)
    await atomicWrite(join(path, '.edu/project.json'), content)
    expect((await createProjectStorage().load(path)).document).toEqual(next)
    expect(await readFile(join(path, 'beliefs/notes.md'), 'utf8')).toBe('New history')
    expect(await readFile(join(path, 'beliefs/new.md'), 'utf8')).toBe('New material')
    await expect(readFile(join(path, '.edu/file-transaction.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  })
  it('interrupted-save recovery preserves unknown external bytes rather than guessing a replacement', async () => {
    const { path, storage } = await setup()
    const previous = await storage.load(path)
    const edits = [{ path: 'beliefs/notes.md', expectedContent: 'Original topic notes', content: 'New history' }]
    await beginFileTransaction(path, previous.document!.projectId, previous.digest, 'a'.repeat(64), edits, atomicWrite)
    await applyProjectEdits(path, edits)
    await writeFile(join(path, 'beliefs/notes.md'), 'External work after interruption')
    await expect(createProjectStorage().load(path)).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(await readFile(join(path, 'beliefs/notes.md'), 'utf8')).toBe('External work after interruption')
    expect(await readFile(join(path, '.edu/file-transaction.json'), 'utf8')).toContain('New history')
  })
  it('confirmed outline conflict recovery applies only the topic to the latest outline without repeating inference', async () => {
    const { path, service, generate, request, original } = await setup()
    generate.mockImplementationOnce(async () => {
      const external = JSON.parse(await readFile(join(path, '.edu/project.json'), 'utf8'))
      external.brief = 'New external learning goal'; external.name = 'External project title'
      external.outline.document.title = 'External project title'
      external.outline.document.lessons[1].overview = 'Other topic changed outside the app'
      await writeFile(join(path, '.edu/project.json'), JSON.stringify(external))
      const revised = learningOutline(); revised.lessons[0]!.overview = 'Revised history'
      return { kind: 'outline', document: revised }
    })
    service.rewriteTopic(request); await service.waitForIdle()
    const run = service.get().runs[0]!
    expect(run.status).toBe('unsaved'); expect(run.errorCode).toBe('CONFLICT')
    await service.retrySave({ projectId: request.projectId, runId: run.id, replaceChanged: true })
    expect(service.get().runs[0]?.status).toBe('saved')
    const current = JSON.parse(await readFile(join(path, '.edu/project.json'), 'utf8'))
    expect(current.name).toBe('External project title'); expect(current.brief).toBe('New external learning goal')
    expect(current.outline.document).toEqual({ ...original.document, title: 'External project title', lessons: [
      { ...original.document.lessons[0], overview: 'Revised history' },
      { ...original.document.lessons[1], overview: 'Other topic changed outside the app' }
    ] })
    expect(generate).toHaveBeenCalledTimes(2)
  })
})
