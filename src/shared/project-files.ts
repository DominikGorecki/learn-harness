import { ApplicationError } from './contracts'
import { strictRecord } from './validation'
import { materialPath } from './outline'

export interface ProjectFileEdit { path: string; content: string; expectedContent: string | null }
export const maximumProjectFileBytes = 256 * 1024
export const maximumProjectEditCharacters = 2 * 1024 * 1024

export function projectFilePath(value: unknown, forWrite = true): string {
  const path = materialPath(value)
  const parts = path.split('/')
  if (parts.some(part => /[<>:"|?*]/.test(part) || [...part].some(character => character.charCodeAt(0) < 32) || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part) || (forWrite && part.toLowerCase() === '.git')) ||
    (forWrite && ['.edu/project.json', '.edu/file-transaction.json'].includes(path.toLowerCase()))) {
    throw new ApplicationError('FORBIDDEN', 'Choose a project content file. Application state and repository internals are managed separately.')
  }
  return path
}

export function parseProjectFileEdits(value: unknown, writeRoot?: string): ProjectFileEdit[] {
  if (!Array.isArray(value) || value.length > 100) throw new ApplicationError('INVALID_INPUT', 'Too many project file changes were proposed.')
  let characters = 0
  const paths = new Set<string>()
  return value.map(item => {
    const data = strictRecord(item, ['path', 'content', 'expectedContent'])
    const path = projectFilePath(data.path)
    if (writeRoot && !path.startsWith(writeRoot + '/')) throw new ApplicationError('FORBIDDEN', 'A topic edit can only change files in that topic’s folder.')
    if (paths.has(path.toLowerCase())) throw new ApplicationError('INVALID_INPUT', 'A project file may only be changed once per save.')
    paths.add(path.toLowerCase())
    if (typeof data.content !== 'string' || data.content.includes('\0') || data.content.length > maximumProjectFileBytes ||
      (data.expectedContent !== null && (typeof data.expectedContent !== 'string' || data.expectedContent.length > maximumProjectFileBytes))) {
      throw new ApplicationError('INVALID_INPUT', 'Project file changes must contain bounded text.')
    }
    characters += data.content.length + (data.expectedContent?.length ?? 0)
    if (characters > maximumProjectEditCharacters) throw new ApplicationError('INVALID_INPUT', 'The proposed project changes are too large. Make a smaller change.')
    return { path, content: data.content, expectedContent: data.expectedContent as string | null }
  })
}
