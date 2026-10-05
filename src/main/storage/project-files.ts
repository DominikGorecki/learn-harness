import { lstat, mkdir, readdir, realpath, rmdir, unlink } from 'node:fs/promises'
import { isAbsolute, join, relative } from 'node:path'
import { ApplicationError } from '../../shared/contracts'
import { maximumProjectFileBytes, parseProjectFileEdits, projectFilePath } from '../../shared/project-files'
import type { ProjectFileEdit } from '../../shared/project-files'
import { atomicWrite } from './atomic-file'
import { readBoundedFile } from './bounded-file'

const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === 'ENOENT'

/** Validate each component, including Windows junctions, rather than resolving a caller path blindly. */
export async function projectTarget(root: string, path: string, createParents = false, created: string[] = []): Promise<string> {
  projectFilePath(path, false)
  if (relative(root, await realpath(root)) !== '') throw new ApplicationError('STORAGE', 'The project location changed. Reopen it before saving.')
  const parts = path.split('/')
  let parent = root
  for (const part of parts.slice(0, -1)) {
    parent = join(parent, part)
    let stat
    try { stat = await lstat(parent) }
    catch (error) {
      if (!missing(error)) throw error
      if (!createParents) return join(root, ...parts)
      await mkdir(parent, { mode: 0o700 }); created.push(parent)
      stat = await lstat(parent)
    }
    if (!stat.isDirectory() || stat.isSymbolicLink() || relative(parent, await realpath(parent)) !== '') throw new ApplicationError('FORBIDDEN', 'Project files must stay in regular folders inside this project.')
  }
  const target = join(root, ...parts)
  const delta = relative(root, target)
  if (isAbsolute(delta) || delta.startsWith('..')) throw new ApplicationError('FORBIDDEN', 'Project files must stay inside this project.')
  try {
    const stat = await lstat(target)
    if (!stat.isFile() || stat.isSymbolicLink() || relative(target, await realpath(target)) !== '') throw new ApplicationError('FORBIDDEN', 'Choose a regular project file, without links.')
  } catch (error) { if (!missing(error)) throw error }
  return target
}

export async function projectFileContent(root: string, path: string): Promise<string | null> {
  const target = await projectTarget(root, path)
  try { return await readBoundedFile(target, maximumProjectFileBytes) }
  catch (error) { if (missing(error)) return null; throw error }
}

export async function listProjectFiles(root: string, folder = ''): Promise<{ path: string; kind: 'file' | 'folder' }[]> {
  if (relative(root, await realpath(root)) !== '') throw new ApplicationError('FORBIDDEN', 'Reopen the project before reading its files.')
  let directory = root
  if (folder) {
    // A sentinel validates every directory component without requiring a file to exist.
    await projectTarget(root, `${projectFilePath(folder, false)}/__scope_check__`)
    directory = join(root, ...folder.split('/'))
    const stat = await lstat(directory)
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new ApplicationError('FORBIDDEN', 'Choose a regular project folder.')
  }
  const entries = await readdir(directory, { withFileTypes: true })
  if (entries.length > 1000) throw new ApplicationError('UNAVAILABLE', 'This folder has too many entries. Choose a narrower project folder.')
  return entries.filter(entry => !entry.isSymbolicLink() && (entry.isFile() || entry.isDirectory()))
    .flatMap(entry => {
      const path = folder ? `${folder}/${entry.name}` : entry.name
      try { projectFilePath(path, false); return [{ path, kind: entry.isDirectory() ? 'folder' as const : 'file' as const }] }
      catch { return [] }
    }).sort((a, b) => a.path.localeCompare(b.path))
}

/** All baselines are checked before publication. Normal failures compensate prior writes. */
export async function applyProjectEdits(root: string, values: ProjectFileEdit[], write: typeof atomicWrite = atomicWrite, onRestored?: () => void): Promise<() => Promise<void>> {
  const edits = parseProjectFileEdits(values)
  const applied: ProjectFileEdit[] = [], created: string[] = []
  const rollback = async () => {
    let failed = false
    for (const edit of [...applied].reverse()) {
      try {
        if (await projectFileContent(root, edit.path) !== edit.content) throw new Error('File changed during recovery')
        const target = await projectTarget(root, edit.path)
        if (edit.expectedContent === null) await unlink(target)
        else await atomicWrite(target, edit.expectedContent)
      } catch { failed = true }
    }
    for (const directory of [...created].reverse()) {
      try { await rmdir(directory) } catch (error) { if (!['ENOTEMPTY', 'ENOENT'].includes((error as NodeJS.ErrnoException).code ?? '')) failed = true }
    }
    if (failed) throw new ApplicationError('STORAGE', 'Some project file changes could not be restored. Your outline remains unsaved; inspect the topic files before retrying.')
  }
  try {
    for (const edit of edits) {
      if (Buffer.byteLength(edit.content) > maximumProjectFileBytes) throw new ApplicationError('STORAGE', 'A proposed project file is too large.')
      if (await projectFileContent(root, edit.path) !== edit.expectedContent) throw new ApplicationError('CONFLICT', 'A project file changed during generation. Reopen the project before applying these changes.')
    }
    for (const edit of edits) {
      const target = await projectTarget(root, edit.path, true, created)
      if (await projectFileContent(root, edit.path) !== edit.expectedContent) throw new ApplicationError('CONFLICT', 'A project file changed during saving. Its external changes have been preserved.')
      await write(target, edit.content)
      applied.push(edit)
    }
    return rollback
  } catch (error) { await rollback(); onRestored?.(); throw error }
}
