import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { ApplicationError } from '../../shared/contracts'
import { parseProjectFileEdits } from '../../shared/project-files'
import type { ProjectFileEdit } from '../../shared/project-files'
import { identifier, strictRecord } from '../../shared/validation'
import { atomicWrite } from './atomic-file'
import { readBoundedFile } from './bounded-file'
import { projectFileContent, projectTarget } from './project-files'

const journalName = '.edu/file-transaction.json'
const conflict = () => new ApplicationError('CONFLICT', 'An interrupted project save conflicts with external changes. Its recovery record and files have been preserved.')

export async function beginFileTransaction(root: string, projectId: string, previousDigest: string | null, nextDigest: string, edits: ProjectFileEdit[], write: typeof atomicWrite): Promise<void> {
  const content = JSON.stringify({ version: 1, projectId, previousDigest, nextDigest, edits: parseProjectFileEdits(edits) })
  if (Buffer.byteLength(content) > 8 * 1024 * 1024) throw new ApplicationError('STORAGE', 'The project changes are too large to save together.')
  await projectTarget(root, journalName)
  await write(join(root, ...journalName.split('/')), content)
}

export async function finishFileTransaction(root: string): Promise<void> {
  await projectTarget(root, journalName)
  await unlink(join(root, ...journalName.split('/'))).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error })
}

/** The outline digest is the commit marker. Recovery never overwrites an unknown file version. */
export async function recoverFileTransaction(root: string, projectId: string | null, currentDigest: string | null): Promise<void> {
  await projectTarget(root, journalName)
  let content: string
  try { content = await readBoundedFile(join(root, ...journalName.split('/')), 8 * 1024 * 1024) }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error }
  const data = strictRecord(JSON.parse(content), ['version', 'projectId', 'previousDigest', 'nextDigest', 'edits'])
  if (data.version !== 1 || identifier(data.projectId) !== projectId ||
    (data.previousDigest !== null && (typeof data.previousDigest !== 'string' || !/^[a-f0-9]{64}$/.test(data.previousDigest))) ||
    typeof data.nextDigest !== 'string' || !/^[a-f0-9]{64}$/.test(data.nextDigest)) throw conflict()
  const committed = currentDigest === data.nextDigest
  if (!committed && currentDigest !== data.previousDigest) throw conflict()
  const edits = parseProjectFileEdits(data.edits)
  const restore: ProjectFileEdit[] = []
  // Preflight every file before any recovery mutation.
  for (const edit of edits) {
    const actual = await projectFileContent(root, edit.path)
    if (committed) { if (actual !== edit.content) throw conflict() }
    else if (actual === edit.content) restore.push(edit)
    else if (actual !== edit.expectedContent) throw conflict()
  }
  for (const edit of restore.reverse()) {
    if (await projectFileContent(root, edit.path) !== edit.content) throw conflict()
    const target = await projectTarget(root, edit.path)
    if (edit.expectedContent === null) await unlink(target)
    else await atomicWrite(target, edit.expectedContent)
  }
  await finishFileTransaction(root)
}
