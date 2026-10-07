import { constants } from 'node:fs'
import { createHash } from 'node:crypto'
import { lstat, open, opendir, realpath } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { ApplicationError } from '../../shared/contracts'
import type { MaterialCoverage } from '../../shared/outline'
import { materialPath } from '../../shared/outline'

export const materialLimits = { entries: 1000, files: 200, depth: 6, fileBytes: 256 * 1024, totalBytes: 2 * 1024 * 1024 } as const
export interface MaterialSnapshot { text: Map<string, string>; coverage: MaterialCoverage; digests?: Map<string, string> }
const directories = new Set(['node_modules', 'vendor', 'dist', 'out', 'build', 'target', 'coverage', '__pycache__', 'venv', 'env'])
const instructions = new Set(['agents.md', 'claude.md', 'gemini.md', 'skill.md'])
const extensions = new Set(['.md', '.markdown', '.txt', '.text'])
const sensitive = /(^|[._ -])(credentials?|secrets?|passwords?|tokens?|private[-_ ]?key|id_rsa|id_ed25519)([._ -]|$)/i

/** Read-only, bounded local snapshot. Only read_material exposes text to Pi. */
export async function collectMaterials(root: string, signal: AbortSignal, limits: { entries: number; files: number; depth: number; fileBytes: number; totalBytes: number } = materialLimits,
  excluded?: (path: string) => boolean | Promise<boolean>): Promise<MaterialSnapshot> {
  const text = new Map<string, string>()
  const digests = new Map<string, string>()
  const coverage: MaterialCoverage = { files: [], limitations: [] }
  const limitations = new Set<string>()
  let visited = 0, totalBytes = 0
  const checkRoot = async () => {
    if (relative(root, await realpath(root)) !== '' || !(await lstat(root)).isDirectory()) throw new ApplicationError('STORAGE', 'The project location changed. Reopen the folder before creating an outline.')
  }
  const scoped = async (path: string) => {
    await checkRoot()
    let current = root
    for (const part of materialPath(path).split('/')) {
      current = join(current, part)
      if ((await lstat(current)).isSymbolicLink()) throw new Error('Symbolic links are excluded')
    }
    if (relative(root, await realpath(current)).split(/[/\\]/).join('/') !== path) throw new Error('Material moved outside its expected location')
    return current
  }
  const note = (path: string, status: MaterialCoverage['files'][number]['status'], reason: string | null) => coverage.files.push({ path, status, reason })
  const read = async (path: string) => {
    if (text.size >= limits.files) { note(path, 'not-read', 'The source-file limit was reached.'); limitations.add(`At most ${limits.files} text files are considered per outline.`); return }
    const location = await scoped(path)
    const before = await lstat(location)
    if (!before.isFile() || before.nlink !== 1) { note(path, 'excluded', 'Only unlinked regular files are read.'); return }
    if (before.size > limits.fileBytes) { note(path, 'too-large', 'This file exceeds the per-file size limit.'); limitations.add(`Files larger than ${Math.floor(limits.fileBytes / 1024)} KiB were omitted.`); return }
    if (totalBytes + before.size > limits.totalBytes) { note(path, 'not-read', 'The total source-size limit was reached.'); limitations.add(`At most ${Math.floor(limits.totalBytes / 1024)} KiB of source text is considered per outline.`); return }
    const file = await open(location, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0))
    try {
      const stat = await file.stat()
      if (!stat.isFile() || stat.dev !== before.dev || stat.ino !== before.ino || stat.size !== before.size) throw new Error('Material changed during reading')
      const buffer = Buffer.alloc(limits.fileBytes + 1)
      let size = 0
      while (size < buffer.length) {
        signal.throwIfAborted()
        const part = await file.read(buffer, size, buffer.length - size, null)
        if (!part.bytesRead) break
        size += part.bytesRead
      }
      if (size > limits.fileBytes || totalBytes + size > limits.totalBytes) { note(path, 'too-large', 'The file grew beyond the source-size limit.'); return }
      totalBytes += size
      await scoped(path)
      const after = await lstat(location)
      if (after.dev !== stat.dev || after.ino !== stat.ino || after.size !== size || after.mtimeMs !== stat.mtimeMs) throw new Error('Material changed during reading')
      const bytes = buffer.subarray(0, size)
      let content: string
      try {
        content = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
        if (bytes.some(value => value < 32 && value !== 9 && value !== 10 && value !== 13)) throw new Error('Binary control characters')
      } catch { note(path, 'binary', 'This file is not supported UTF-8 text.'); return }
      if (!content.trim()) { note(path, 'not-read', 'This file contains no learning material.'); return }
      text.set(path, content)
      // Evidence binds the original delivered bytes, including a UTF-8 BOM.
      digests.set(path, createHash('sha256').update(bytes).digest('hex'))
      note(path, 'not-read', 'Available, but not read by the outline assistant.')
    } finally { await file.close() }
  }
  const walk = async (directory: string, depth: number): Promise<void> => {
    signal.throwIfAborted()
    const location = directory ? await scoped(directory) : root
    const names: string[] = []
    const entries = await opendir(location)
    for await (const entry of entries) {
      if (visited >= limits.entries) { limitations.add(`The folder scan stopped after ${limits.entries} entries. Some material may be omitted.`); break }
      visited++; names.push(entry.name)
    }
    for (const name of names.sort((a, b) => a.localeCompare(b, 'en'))) {
      signal.throwIfAborted()
      const path = directory ? `${directory}/${name}` : name
      try { materialPath(path) } catch { limitations.add('Files with unsupported names were omitted.'); continue }
      const lower = name.toLowerCase()
      if (name.startsWith('.') || instructions.has(lower) || sensitive.test(name) || directories.has(lower)) {
        note(path, 'excluded', 'Project metadata, configuration, generated content, or sensitive files are excluded.'); continue
      }
      if (await excluded?.(path)) { note(path, 'excluded', 'App-owned chapter output is excluded from primary sources.'); continue }
      try {
        const stat = await lstat(join(root, ...path.split('/')))
        if (stat.isSymbolicLink()) { note(path, 'excluded', 'Symbolic links are not followed.'); continue }
        if (stat.isDirectory()) {
          if (depth >= limits.depth || visited >= limits.entries) { note(path, 'not-read', 'This folder exceeds the scan limits.'); limitations.add('Some nested material was omitted by the folder scan limits.'); continue }
          await walk(path, depth + 1); continue
        }
        if (!stat.isFile()) { note(path, 'excluded', 'Only regular files are read.'); continue }
        if (!extensions.has(extname(lower))) { note(path, 'unsupported', 'Only UTF-8 text and Markdown files are supported for now.'); continue }
        await read(path)
      } catch (error) {
        if (signal.aborted) throw error
        if (error instanceof ApplicationError) throw error
        note(path, 'unreadable', 'This material could not be read safely. It was omitted.')
      }
    }
  }
  try { await checkRoot(); await walk('', 0); await checkRoot() }
  catch (error) {
    if (signal.aborted) throw new ApplicationError('CANCELLED', 'Material inspection cancelled.')
    if (error instanceof ApplicationError) throw error
    throw new ApplicationError('STORAGE', 'The project material could not be inspected. Check the folder and try again.')
  }
  coverage.limitations = [...limitations]
  return { text, coverage, digests }
}
