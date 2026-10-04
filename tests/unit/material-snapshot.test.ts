import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { collectMaterials, materialLimits } from '../../src/main/generation/material-snapshot'

const roots: string[] = []
async function root() { const value = await mkdtemp(join(tmpdir(), 'edu-materials-')); roots.push(value); return value }
afterEach(async () => { await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true }))) })
const signal = () => new AbortController().signal
describe('bounded material snapshots', () => {
  it('reads nested UTF-8 Markdown/text without changing originals and separates available from AI-read material', async () => {
    const path = await root(); await mkdir(join(path, 'chapters'))
    await writeFile(join(path, 'chapters', 'probability.md'), '# Probability\nLearning naïve assumptions and evidence.\n')
    await writeFile(join(path, 'goals.txt'), 'Understand uncertainty')
    const result = await collectMaterials(path, signal())
    expect([...result.text.keys()]).toEqual(['chapters/probability.md', 'goals.txt'])
    expect(result.coverage.files.every(file => file.status === 'not-read')).toBe(true)
    expect(await readFile(join(path, 'chapters/probability.md'), 'utf8')).toBe('# Probability\nLearning naïve assumptions and evidence.\n')
  })
  it('excludes metadata, secrets, build directories, and agent instructions at any depth', async () => {
    const path = await root()
    for (const directory of ['.edu', '.git', 'node_modules', 'build', 'nested']) await mkdir(join(path, directory))
    for (const name of ['.env', 'credentials.txt', 'tokens.md', 'AGENTS.md', 'CLAUDE.md', 'SKILL.md', '.edu/project.json', '.git/config', 'node_modules/readme.md', 'build/generated.txt', 'nested/GEMINI.md']) await writeFile(join(path, name), 'DO NOT TRANSMIT')
    await writeFile(join(path, 'nested', 'notes.md'), 'Actual learning notes')
    const result = await collectMaterials(path, signal())
    expect([...result.text.values()]).toEqual(['Actual learning notes'])
    expect(result.coverage.files.filter(file => file.status === 'excluded')).toHaveLength(11)
  })
  it('never follows file or directory symlinks outside the project', async () => {
    const path = await root(), outside = await root()
    await writeFile(join(outside, 'private.txt'), 'OUTSIDE CONTENT')
    await symlink(join(outside, 'private.txt'), join(path, 'notes.txt'))
    await symlink(outside, join(path, 'linked-folder'), 'dir')
    const result = await collectMaterials(path, signal())
    expect(result.text.size).toBe(0)
    expect(result.coverage.files.map(file => file.status)).toEqual(['excluded', 'excluded'])
  })
  it('classifies unsupported, empty, invalid UTF-8, binary, and oversized files', async () => {
    const path = await root()
    await writeFile(join(path, 'slides.pdf'), 'Not a text source')
    await writeFile(join(path, 'empty.txt'), '  \n')
    await writeFile(join(path, 'binary.txt'), Buffer.from([0, 1, 2, 3]))
    await writeFile(join(path, 'invalid.txt'), Buffer.from([0xff, 0xfe, 0xfd]))
    await writeFile(join(path, 'large.md'), 'x'.repeat(materialLimits.fileBytes + 1))
    const result = await collectMaterials(path, signal())
    expect(result.text.size).toBe(0)
    expect(Object.fromEntries(result.coverage.files.map(file => [file.path, file.status]))).toEqual({ 'slides.pdf': 'unsupported', 'empty.txt': 'not-read', 'binary.txt': 'binary', 'invalid.txt': 'binary', 'large.md': 'too-large' })
  })
  it('enforces file-count and aggregate-byte budgets while disclosing omissions', async () => {
    const path = await root()
    for (let index = 0; index < 5; index++) await writeFile(join(path, `${index}.txt`), 'a'.repeat(100))
    const count = await collectMaterials(path, signal(), { ...materialLimits, files: 2 })
    expect(count.text.size).toBe(2)
    expect(count.coverage.limitations.join(' ')).toContain('2 text files')
    const bytes = await collectMaterials(path, signal(), { ...materialLimits, totalBytes: 250 })
    expect(bytes.text.size).toBe(2)
    expect(bytes.coverage.files.filter(file => file.reason?.includes('total source-size'))).toHaveLength(3)
  })
  it('bounds directory traversal and depth even when no file is usable', async () => {
    const path = await root(); await mkdir(join(path, 'nested')); await mkdir(join(path, 'nested', 'deeper'))
    await writeFile(join(path, 'nested', 'deeper', 'notes.txt'), 'Material')
    const depth = await collectMaterials(path, signal(), { ...materialLimits, depth: 1 })
    expect(depth.text.size).toBe(0)
    expect(depth.coverage.limitations.join(' ')).toContain('nested material')
    for (let index = 0; index < 20; index++) await writeFile(join(path, `${index}.pdf`), '')
    const entries = await collectMaterials(path, signal(), { ...materialLimits, entries: 5 })
    expect(entries.coverage.files.length).toBeLessThanOrEqual(5)
    expect(entries.coverage.limitations.join(' ')).toContain('scan')
  })
  it('rejects a symlinked root, missing root, and cancellation', async () => {
    const path = await root(), outside = await root()
    await symlink(outside, join(path, 'linked'), 'dir')
    await expect(collectMaterials(join(path, 'linked'), signal())).rejects.toMatchObject({ code: 'STORAGE' })
    await expect(collectMaterials(join(path, 'missing'), signal())).rejects.toMatchObject({ code: 'STORAGE' })
    const controller = new AbortController(); controller.abort()
    await expect(collectMaterials(path, controller.signal)).rejects.toMatchObject({ code: 'CANCELLED' })
  })
  it.skipIf(process.platform === 'win32' || process.geteuid?.() === 0)('reports an unreadable file without failing other useful material', async () => {
    const path = await root()
    const locked = join(path, 'locked.txt')
    await writeFile(locked, 'Unavailable content'); await chmod(locked, 0)
    await writeFile(join(path, 'notes.txt'), 'Readable material')
    try {
      const result = await collectMaterials(path, signal())
      expect(result.coverage.files.find(file => file.path === 'locked.txt')?.status).toBe('unreadable')
      expect([...result.text.values()]).toEqual(['Readable material'])
    } finally { await chmod(locked, 0o600) }
  })
})
