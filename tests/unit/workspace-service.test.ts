import { mkdtemp, realpath, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { WorkspaceService } from '../../src/core/workspace/service'
import { createProjectRegistry } from '../../src/main/storage/project-registry'
import { createProjectStorage } from '../../src/main/storage/project-storage'
import { parseBriefRequest, parseModelRequest, parseProjectRequest, maximumBriefLength } from '../../src/shared/workspace'

const roots: string[] = []
async function setup() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-workspace-'))); roots.push(root)
  const first = join(root, 'first'), second = join(root, 'second')
  await mkdir(first); await mkdir(second)
  let counter = 0
  const create = () => new WorkspaceService({ registry: createProjectRegistry(join(root, 'profile')), storage: createProjectStorage(),
    models: () => [{ id: 'model-one', name: 'Model one' }, { id: 'model-two', name: 'Model two' }],
    createId: () => `id-${++counter}`, now: () => '2026-10-04T12:00:00Z' })
  const service = create(); await service.initialize()
  return { service, create, first, second, root }
}
afterEach(async () => { await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

describe('workspace use cases', () => {
  it('opens and deduplicates a folder without creating .edu', async () => {
    const { service, first } = await setup()
    await service.open(first); await service.open(first)
    expect(service.get().projects).toHaveLength(1)
    expect(service.get().activeProject).toMatchObject({ name: 'first', brief: '', sourceHint: 'empty', revision: 0 })
    expect(await readdir(first)).toEqual([])
  })
  it('restores two separate model preferences and a substantial brief after restart', async () => {
    const { service, create, first, second } = await setup()
    const one = (await service.open(first)).activeProject!.id
    await service.setModel(one, 'model-one')
    const brief = 'A detailed learning goal. '.repeat(100)
    await service.saveBrief(one, brief)
    const two = (await service.open(second)).activeProject!.id
    await service.setModel(two, 'model-two')
    const restarted = create(); await restarted.initialize()
    expect(restarted.get().projects).toHaveLength(2)
    expect((await restarted.select(one)).activeProject).toMatchObject({ selectedModel: { id: 'model-one' }, brief: brief.trim() })
    expect((await restarted.select(two)).activeProject?.selectedModel?.id).toBe('model-two')
  })
  it('serializes changes without losing the model or brief', async () => {
    const { service, first } = await setup()
    const id = (await service.open(first)).activeProject!.id
    await Promise.all([service.setModel(id, 'model-one'), service.saveBrief(id, 'Learn how stars form')])
    expect(service.get().activeProject).toMatchObject({ selectedModel: { id: 'model-one' }, brief: 'Learn how stars form', revision: 2 })
  })
  it('keeps a missing project recognizable and reconnects its moved folder', async () => {
    const { service, first, root } = await setup()
    const id = (await service.open(first)).activeProject!.id
    await service.saveBrief(id, 'Economics')
    const moved = join(root, 'moved')
    await rename(first, moved)
    expect((await service.select(id)).activeProject?.availability).toBe('missing')
    const restored = await service.locate(id, moved)
    expect(restored.projects).toHaveLength(1)
    expect(restored.activeProject).toMatchObject({ id, availability: 'available', brief: 'Economics', folderPath: moved })
  })
  it('rejects locating an initialized project in an unrelated folder', async () => {
    const { service, first, second } = await setup()
    const id = (await service.open(first)).activeProject!.id
    await service.saveBrief(id, 'Economics')
    await expect(service.locate(id, second)).rejects.toMatchObject({ code: 'CONFLICT' })
  })
  it('does not overwrite a corrupt project or silently change an unavailable model', async () => {
    const { service, first } = await setup()
    await mkdir(join(first, '.edu')); await writeFile(join(first, '.edu', 'project.json'), '{bad')
    const state = await service.open(first)
    expect(state.activeProject?.availability).toBe('unreadable')
    await expect(service.saveBrief(state.activeProject!.id, 'Overwrite')).rejects.toMatchObject({ code: 'STORAGE' })
    await expect(service.setModel(state.activeProject!.id, 'missing')).rejects.toMatchObject({ code: 'UNAVAILABLE' })
  })
  it('keeps a background project mutation from replacing the active project', async () => {
    const { service, first, second } = await setup()
    const one = (await service.open(first)).activeProject!.id
    const two = (await service.open(second)).activeProject!.id
    await service.saveBrief(one, 'A background goal')
    expect(service.get().activeProject?.id).toBe(two)
    expect((await service.select(one)).activeProject?.brief).toBe('A background goal')
  })
  it.each(['missing', 'different'] as const)('preserves a known project identity when its metadata becomes %s', async mode => {
    const { service, create, first } = await setup()
    const id = (await service.open(first)).activeProject!.id
    await service.saveBrief(id, 'The original learning goal')
    const originalId = service.get().activeProject!.projectId
    const file = join(first, '.edu/project.json')
    const original = await readFile(file, 'utf8')
    const replacement = JSON.stringify({ ...JSON.parse(original), projectId: 'another-project', brief: 'Another learner project' })
    if (mode === 'missing') await rm(file)
    else await writeFile(file, replacement)
    const state = await service.select(id)
    expect(state.activeProject).toMatchObject({ availability: 'unreadable', writable: false, projectId: originalId })
    await expect(service.setModel(id, 'model-one')).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(service.saveBrief(id, 'Must not overwrite')).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(service.prepareOutline(id, 'model-one', 'Must not generate here', true)).rejects.toMatchObject({ code: 'CONFLICT' })
    // A restart has no loaded-project cache, but still knows the portable identity.
    const restarted = create(); await restarted.initialize()
    await expect(restarted.prepareOutline(id, 'model-one', 'Must not adopt a replacement', true)).rejects.toMatchObject({ code: 'CONFLICT' })
    if (mode === 'missing') await expect(readFile(file, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
    else expect(await readFile(file, 'utf8')).toBe(replacement)
    await writeFile(file, original)
    expect((await service.select(id)).activeProject).toMatchObject({ availability: 'available', projectId: originalId, brief: 'The original learning goal' })
  })
})

describe('workspace request boundaries', () => {
  it('accepts a substantial brief but rejects forged paths and excessive input', () => {
    expect(parseBriefRequest({ projectId: 'project-one', brief: 'x'.repeat(4000) }).brief).toHaveLength(4000)
    expect(() => parseBriefRequest({ projectId: 'project-one', brief: 'x'.repeat(maximumBriefLength + 1) })).toThrow()
    expect(() => parseProjectRequest({ projectId: 'project-one', path: '/other' })).toThrow()
    expect(() => parseProjectRequest({ projectId: '../escape' })).toThrow()
    expect(() => parseModelRequest({ projectId: 'project-one', modelId: '' })).toThrow()
  })
})
