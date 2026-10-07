import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { access, lstat, mkdir, readdir, realpath } from 'node:fs/promises'
import { basename, join, relative, isAbsolute } from 'node:path'
import { ApplicationError } from '../../shared/contracts'
import { parseProjectDocument } from '../../shared/workspace'
import type { ProjectDocument } from '../../shared/workspace'
import type { LoadedProject, ProjectStorage, TopicFolderState } from '../../core/workspace/ports'
import { atomicWrite } from './atomic-file'
import { applyProjectEdits, projectFileContent, projectTarget } from './project-files'
import { beginFileTransaction, finishFileTransaction, recoverFileTransaction } from './project-file-transaction'
import { parseProjectFileEdits, projectFilePath } from '../../shared/project-files'
import { localizeTopicOutline } from '../../shared/outline'
import { readBoundedFile } from './bounded-file'
export { readBoundedFile } from './bounded-file'

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
      await recoverFileTransaction(path, state.document?.projectId ?? null, state.digest)
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
    async prepareTopicFolder(path, projectId, lesson, number, otherLessons) {
      await checkRoot(path)
      const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
      const matches = (name: string) => [lesson.id, lesson.title, `${number} ${lesson.title}`, `${String(number).padStart(2, '0')} ${lesson.title}`].some(value => normalize(value) === normalize(name))
      const entries = await readdir(path, { withFileTypes: true })
      if (entries.length > 1000) throw new ApplicationError('UNAVAILABLE', 'Too many root folders to identify this topic safely.')
      const candidates: TopicFolderState[] = []
      const sourceRoots = new Set(lesson.sources.filter(source => source.includes('/')).map(source => source.split('/')[0]!))
      for (const entry of entries) {
        if ((!entry.isDirectory() && !entry.isSymbolicLink()) || entry.name === '.edu' || entry.name === '.git') continue
        const named = matches(entry.name)
        if (entry.isSymbolicLink()) {
          if (named || sourceRoots.has(entry.name)) throw new ApplicationError('FORBIDDEN', 'The topic folder must be a regular folder inside this project.')
          continue
        }
        let content: string | null, owned = false
        try {
          projectFilePath(entry.name)
          content = await projectFileContent(path, `${entry.name}/.edu/topic.json`)
          if (content !== null) {
            const metadata = JSON.parse(content)
            owned = metadata.version === 1 && metadata.projectId === projectId && metadata.topicId === lesson.id
            if (named && !owned) throw new ApplicationError('CONFLICT', 'This topic folder’s saved plan belongs to different content. Its files have been preserved.')
          }
        } catch (error) { if (named) throw storageFailure(error); continue }
        const sourceMatch = sourceRoots.size === 1 && sourceRoots.has(entry.name)
        if (!named && !owned && !sourceMatch) continue
        if (otherLessons.some(other => other.sources.some(source => source.startsWith(entry.name + '/')) || normalize(other.id) === normalize(entry.name) || normalize(other.title) === normalize(entry.name))) {
          throw new ApplicationError('CONFLICT', 'This folder is shared by other topics. Give this topic its own folder before editing its files.')
        }
        await projectTarget(path, `${entry.name}/.edu/topic.json`)
        const stat = await lstat(join(path, entry.name))
        candidates.push({ folder: entry.name, device: stat.dev, inode: stat.ino, content })
      }
      if (candidates.length > 1) throw new ApplicationError('CONFLICT', 'Several root folders match this topic. Keep one matching topic folder before editing.')
      return candidates[0] ?? null
    },
    async save(path, document, expectedDigest, changes) {
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
        const topic = changes?.topic
        const edits = parseProjectFileEdits(changes?.edits ?? [], topic ? topic.folder?.folder ?? topic.topicId : undefined)
        if (topic) {
          if (!existing.document?.outline || !validated.outline) throw new ApplicationError('CONFLICT', 'A saved outline is required before changing a topic.')
          const localized = localizeTopicOutline(existing.document.outline.document, validated.outline.document, topic.topicId)
          if (JSON.stringify(localized) !== JSON.stringify(validated.outline.document) || validated.name !== existing.document.name || validated.brief !== existing.document.brief) throw new ApplicationError('FORBIDDEN', 'A topic edit cannot change other outline content.')
          const folder = topic.folder
          const root = folder?.folder ?? topic.topicId
          if (existing.document.outline.document.lessons.some(lesson => lesson.id !== topic.topicId && lesson.sources.some(source => source.startsWith(root + '/')))) throw new ApplicationError('CONFLICT', 'This topic folder is now shared by another topic. Its files have been preserved.')
          const mirrorPath = `${root}/.edu/topic.json`
          if (edits.some(edit => edit.path.toLowerCase() === mirrorPath.toLowerCase())) throw new ApplicationError('FORBIDDEN', 'The topic plan is saved by the application alongside the outline.')
          if (folder) {
            await projectTarget(path, mirrorPath)
            const stat = await lstat(join(path, root))
            if (stat.dev !== folder.device || stat.ino !== folder.inode) throw new ApplicationError('CONFLICT', 'The topic folder changed during generation. Reopen the project before editing.')
          }
          if (folder || edits.length) {
            const lesson = validated.outline.document.lessons.find(lesson => lesson.id === topic.topicId)!
            edits.push({ path: mirrorPath, expectedContent: folder?.content ?? null,
              content: JSON.stringify({ version: 1, projectId: validated.projectId, topicId: topic.topicId, generatedAt: validated.outline.generatedAt, topic: lesson }, null, 2) + '\n' })
          }
        }
        if (edits.length) await beginFileTransaction(path, validated.projectId, expectedDigest, digest(content), edits, write)
        let rollback: (() => Promise<void>) | undefined
        let filesRestored = false
        try {
          rollback = await applyProjectEdits(path, edits, write, () => { filesRestored = true })
          await checkRoot(path); await checkEdu(path)
          if ((await readState(path)).digest !== expectedDigest) throw new ApplicationError('CONFLICT', 'The project changed during saving. Its external changes have been preserved.')
          await write(join(path, '.edu', 'project.json'), content)
        } catch (error) {
          if (rollback) { await rollback(); filesRestored = true }
          if (edits.length) {
            if (filesRestored) await finishFileTransaction(path)
            else { const state = await readState(path); await recoverFileTransaction(path, state.document?.projectId ?? null, state.digest) }
          }
          throw error
        }
        // The commit is durable even if cleanup is temporarily unavailable. Load verifies it later.
        if (edits.length) await finishFileTransaction(path).catch(() => {})
        return { document: structuredClone(validated), digest: digest(content), writable: true, sourceHint: existing.sourceHint }
      } catch (error) { throw storageFailure(error) }
    }
  }
}
