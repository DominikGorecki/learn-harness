import { mkdtemp, realpath, mkdir, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProjectStorage } from '../../src/main/storage/project-storage'
import { createProjectRegistry } from '../../src/main/storage/project-registry'
import type { ProjectDocument } from '../../src/shared/workspace'

const roots: string[] = []
async function root() { const path = await realpath(await mkdtemp(join(tmpdir(), 'edu-project-'))); roots.push(path); return path }
afterEach(async () => { await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true }))) })
const document: ProjectDocument = { version: 1, projectId: 'project-one', revision: 1, name: 'Bayesian reasoning',
  createdAt: '2026-10-04T12:00:00Z', updatedAt: '2026-10-04T12:00:00Z', selectedModel: { id: 'learning-model', name: 'Learning model' }, brief: 'Bayesian reasoning', outline: null }

describe('portable project storage', () => {
  it('inspects an empty folder without creating educational state', async () => {
    const path = await root()
    const storage = createProjectStorage()
    expect(await storage.load(path)).toMatchObject({ document: null, digest: null, sourceHint: 'empty', writable: true })
    expect(await readdir(path)).toEqual([])
  })
  it('saves and restores a versioned project while preserving source material', async () => {
    const path = await root()
    await writeFile(join(path, 'notes.md'), '# Existing notes\n')
    const storage = createProjectStorage()
    const saved = await storage.save(path, document, null)
    expect(saved.digest).toMatch(/^[a-f0-9]{64}$/)
    expect((await createProjectStorage().load(path)).document).toEqual(document)
    expect(await readFile(join(path, 'notes.md'), 'utf8')).toBe('# Existing notes\n')
    expect(await readdir(join(path, '.edu'))).toEqual(['project.json'])
  })
  it('rejects an external edit even when its revision was not changed', async () => {
    const path = await root()
    const storage = createProjectStorage()
    const previous = await storage.save(path, document, null)
    const external = JSON.stringify({ ...document, brief: 'Changed outside the app' })
    await writeFile(join(path, '.edu', 'project.json'), external)
    await expect(storage.save(path, { ...document, revision: 2, brief: 'Overwrite' }, previous.digest)).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(await readFile(join(path, '.edu', 'project.json'), 'utf8')).toBe(external)
  })
  it('preserves the previous bytes if replacement fails', async () => {
    const path = await root()
    const saved = await createProjectStorage().save(path, document, null)
    const before = await readFile(join(path, '.edu', 'project.json'), 'utf8')
    const storage = createProjectStorage({ write: vi.fn(async () => { throw Object.assign(new Error('disk full'), { code: 'ENOSPC' }) }) })
    await expect(storage.save(path, { ...document, revision: 2 }, saved.digest)).rejects.toMatchObject({ code: 'STORAGE' })
    expect(await readFile(join(path, '.edu', 'project.json'), 'utf8')).toBe(before)
  })
  it.each(['corrupt', 'future-version'])('preserves %s metadata instead of treating the project as empty', async mode => {
    const path = await root()
    await mkdir(join(path, '.edu'))
    const raw = mode === 'corrupt' ? '{broken' : JSON.stringify({ ...document, version: 99 })
    await writeFile(join(path, '.edu', 'project.json'), raw)
    await expect(createProjectStorage().load(path)).rejects.toMatchObject({ code: mode === 'corrupt' ? 'STORAGE' : 'UNAVAILABLE' })
    await expect(createProjectStorage().save(path, document, null)).rejects.toBeDefined()
    expect(await readFile(join(path, '.edu', 'project.json'), 'utf8')).toBe(raw)
  })
  it('refuses a symlinked .edu directory and a symlinked state file', async () => {
    const path = await root(), outside = await root()
    await symlink(outside, join(path, '.edu'), 'junction')
    await expect(createProjectStorage().save(path, document, null)).rejects.toMatchObject({ code: 'STORAGE' })
    expect(await readdir(outside)).toEqual([])
    await rm(join(path, '.edu'))
    await mkdir(join(path, '.edu'))
    await writeFile(join(outside, 'state.json'), JSON.stringify(document))
    await symlink(join(outside, 'state.json'), join(path, '.edu', 'project.json'))
    await expect(createProjectStorage().load(path)).rejects.toMatchObject({ code: 'STORAGE' })
  })
  it('detects a replaced project root before a write', async () => {
    const parent = await root(), outside = await root()
    const path = join(parent, 'original')
    await mkdir(path)
    await rename(path, join(parent, 'moved'))
    await symlink(outside, path, 'junction')
    await expect(createProjectStorage().save(path, document, null)).rejects.toMatchObject({ code: 'STORAGE' })
    expect(await readdir(outside)).toEqual([])
  })
  it('does not count its own metadata as source material', async () => {
    const path = await root()
    await createProjectStorage().save(path, document, null)
    expect((await createProjectStorage().load(path)).sourceHint).toBe('empty')
    await mkdir(join(path, 'reading'))
    await writeFile(join(path, 'reading', 'topic.md'), '# Topic')
    expect((await createProjectStorage().load(path)).sourceHint).toBe('files')
  })
})

describe('application project registry', () => {
  it('restores locations independently of educational state', async () => {
    const path = await root()
    const entry = { id: 'local-handle', path: '/example/project', name: 'Project', projectId: null, lastOpenedAt: '2026-10-04T12:00:00Z', hasOutline: false }
    const registry = createProjectRegistry(path)
    expect(await registry.read()).toEqual([])
    await registry.write([entry])
    expect(await createProjectRegistry(path).read()).toEqual([entry])
  })
  it('preserves a corrupt registry and refuses a silent reset', async () => {
    const path = await root()
    await writeFile(join(path, 'workspace.json'), '{bad')
    const registry = createProjectRegistry(path)
    await expect(registry.read()).rejects.toMatchObject({ code: 'STORAGE' })
    await expect(registry.write([])).rejects.toMatchObject({ code: 'STORAGE' })
    expect(await readFile(join(path, 'workspace.json'), 'utf8')).toBe('{bad')
  })
})
