import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { ApplicationError } from '../../shared/contracts'
import { boundedText, identifier, strictRecord, timestamp } from '../../shared/validation'
import type { ProjectRegistry, RegisteredProject } from '../../core/workspace/ports'
import { atomicWrite } from './atomic-file'
import { readBoundedFile } from './project-storage'

function parseRegistry(value: unknown): RegisteredProject[] {
  const data = strictRecord(value, ['version', 'projects'])
  if (data.version !== 1 || !Array.isArray(data.projects) || data.projects.length > 500) throw new Error('Invalid registry')
  const ids = new Set<string>()
  const paths = new Set<string>()
  return data.projects.map(value => {
    const entry = strictRecord(value, ['id', 'path', 'name', 'projectId', 'lastOpenedAt', 'hasOutline'])
    const id = identifier(entry.id)
    const path = boundedText(entry.path, 'Project location', 8192)
    if (ids.has(id) || paths.has(path) || typeof entry.hasOutline !== 'boolean') throw new Error('Invalid registry')
    ids.add(id); paths.add(path)
    return { id, path, name: boundedText(entry.name, 'Project name', 240), projectId: entry.projectId === null ? null : identifier(entry.projectId),
      lastOpenedAt: timestamp(entry.lastOpenedAt), hasOutline: entry.hasOutline }
  })
}

export function createProjectRegistry(directory: string): ProjectRegistry {
  const path = join(directory, 'workspace.json')
  let unreadable = false
  return {
    async read() {
      try {
        const records = parseRegistry(JSON.parse(await readBoundedFile(path, 2 * 1024 * 1024)))
        unreadable = false
        return records
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') { unreadable = false; return [] }
        unreadable = true
        throw new ApplicationError('STORAGE', 'Your project list could not be read. Its saved file has been preserved. Try reopening the app after restoring access.')
      }
    },
    async write(projects) {
      if (unreadable) throw new ApplicationError('STORAGE', 'The saved project list needs recovery before it can be changed.')
      const validated = parseRegistry({ version: 1, projects })
      try {
        await mkdir(directory, { recursive: true, mode: 0o700 })
        await atomicWrite(path, JSON.stringify({ version: 1, projects: validated }, null, 2) + '\n')
      } catch {
        throw new ApplicationError('STORAGE', 'Your project list could not be saved. Check the application profile permissions and try again.')
      }
    }
  }
}
