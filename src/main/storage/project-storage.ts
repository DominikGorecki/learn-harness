import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { access, lstat, mkdir, open, readdir, realpath } from 'node:fs/promises'
import { basename, join, relative, isAbsolute } from 'node:path'
import { ApplicationError } from '../../shared/contracts'
import { parseProjectDocument } from '../../shared/workspace'
import type { ProjectDocument } from '../../shared/workspace'
import type { LoadedProject, ProjectStorage } from '../../core/workspace/ports'
import { atomicWrite } from './atomic-file'

export const excludedSourceDirectories = new Set(['node_modules', 'vendor', 'dist', 'out', 'build', 'target', 'coverage', '__pycache__'])
const maxDocumentBytes = 2 * 1024 * 1024
const digest = (content: string) => createHash('sha256').update(content).digest('hex')
const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === 'ENOENT'

function storageFailure(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error
  const code = (error as NodeJS.ErrnoException).code
  if (code === 'ENOENT') return new ApplicationError('NOT_FOUND', 'This project folder could not be found. Locate the folder to reconnect it.')
  if (code === 'EACCES' || code === 'EPERM' || code === 'EROFS') return new ApplicationError('STORAGE', 'This folder cannot be written. Check its permissions or choose a writable location.')
  return new ApplicationError('STORAGE', 'The project could not be read or saved. Its existing files have been preserved.')
}

export async function readBoundedFile(path: string, maximumBytes: number): Promise<string> {
  const stat = await lstat(path)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximumBytes) throw new ApplicationError('STORAGE', 'The saved file is unsupported or too large. Its contents have been preserved.')
  const file = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
  try {
    const actual = await file.stat()
    if (!actual.isFile() || actual.size > maximumBytes) throw new ApplicationError('STORAGE', 'The saved file is unsupported or too large.')
    const buffer = Buffer.alloc(maximumBytes + 1)
    let length = 0
    while (length <= maximumBytes) {
      const result = await file.read(buffer, length, buffer.length - length, null)
      if (!result.bytesRead) break
      length += result.bytesRead
    }
    if (length > maximumBytes) throw new ApplicationError('STORAGE', 'The saved file is too large.')
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, length))
  } finally { await file.close() }
}

export function createProjectStorage(options: { write?: typeof atomicWrite } = {}): ProjectStorage {
  const write = options.write ?? atomicWrite

  async function checkRoot(path: string): Promise<void> {
    const actual = await realpath(path)
    if (relative(path, actual) !== '') throw new ApplicationError('STORAGE', 'The project location changed. Reopen its folder before saving.')
    if (!(await lstat(path)).isDirectory()) throw new ApplicationError('NOT_FOUND', 'This project location is no longer a folder.')
  }

  async function checkEdu(path: string): Promise<boolean> {
    const edu = join(path, '.edu')
    try {
      const stat = await lstat(edu)
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new ApplicationError('STORAGE', 'The .edu location must be a regular folder. Existing content has been preserved.')
      const delta = relative(path, await realpath(edu))
      if (isAbsolute(delta) || delta.startsWith('..') || delta.toLowerCase() !== '.edu') throw new ApplicationError('STORAGE', 'The project state points outside this folder.')
      return true
    } catch (error) { if (missing(error)) return false; throw error }
  }

  async function readState(path: string): Promise<{ document: ProjectDocument | null; digest: string | null }> {
    if (!await checkEdu(path)) return { document: null, digest: null }
    let content: string
    try { content = await readBoundedFile(join(path, '.edu', 'project.json'), maxDocumentBytes) }
    catch (error) { if (missing(error)) return { document: null, digest: null }; throw error }
    try { return { document: parseProjectDocument(JSON.parse(content)), digest: digest(content) } }
    catch (error) {
      if (error instanceof ApplicationError && error.code === 'UNAVAILABLE') throw error
      throw new ApplicationError('STORAGE', 'The saved learning project is unreadable. Its .edu files have been preserved.')
    }
  }

  async function load(path: string): Promise<LoadedProject> {
    try {
      await checkRoot(path)
      const state = await readState(path)
      let writable = true
      try { await access(path, constants.W_OK); if (await checkEdu(path)) await access(join(path, '.edu'), constants.W_OK) }
      catch { writable = false }
      const entries = await readdir(path, { withFileTypes: true })
      const hasSources = entries.some(entry => !entry.name.startsWith('.') && !excludedSourceDirectories.has(entry.name) && !entry.isSymbolicLink() && entry.name !== 'AGENTS.md')
      return { ...state, writable, sourceHint: hasSources ? 'files' : 'empty' }
    } catch (error) { throw storageFailure(error) }
  }

  return {
    async canonicalPath(path) {
      try {
        const canonical = await realpath(path)
        if (!(await lstat(canonical)).isDirectory()) throw new ApplicationError('INVALID_INPUT', 'Choose a folder for your project.')
        return { path: canonical, name: (basename(canonical) || canonical).slice(0, 240) }
      } catch (error) { throw storageFailure(error) }
    },
    load,
    async save(path, document, expectedDigest) {
      try {
        const validated = parseProjectDocument(document)
        const existing = await load(path)
        if (!existing.writable) throw new ApplicationError('STORAGE', 'This project is read-only. Choose a writable location or update its folder permissions.')
        if (existing.digest !== expectedDigest) throw new ApplicationError('CONFLICT', 'This project changed outside the app. Reopen it to load the latest version before saving.')
        if (existing.document && (existing.document.projectId !== validated.projectId || validated.revision !== existing.document.revision + 1)) {
          throw new ApplicationError('CONFLICT', 'The saved project version changed. Reopen the project before saving.')
        }
        if (!existing.document && validated.revision !== 1) throw new ApplicationError('CONFLICT', 'The original project state is missing. Its files have been preserved.')
        if (!await checkEdu(path)) await mkdir(join(path, '.edu'), { mode: 0o700 })
        await checkRoot(path)
        await checkEdu(path)
        const latest = await readState(path)
        if (latest.digest !== expectedDigest) throw new ApplicationError('CONFLICT', 'This project changed during saving. Reopen it before trying again.')
        const content = JSON.stringify(validated, null, 2) + '\n'
        if (Buffer.byteLength(content) > maxDocumentBytes) throw new ApplicationError('STORAGE', 'The generated project is too large to save. Narrow the learning scope and try again.')
        await write(join(path, '.edu', 'project.json'), content)
        return { document: structuredClone(validated), digest: digest(content), writable: true, sourceHint: existing.sourceHint }
      } catch (error) { throw storageFailure(error) }
    }
  }
}
