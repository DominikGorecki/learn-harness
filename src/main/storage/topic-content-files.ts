import { createHash, randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { link, lstat, open, readdir, realpath, unlink } from 'node:fs/promises'
import { basename, dirname, join, relative } from 'node:path'
import { ApplicationError } from '../../shared/contracts'
import { projectTarget } from './project-files'
import { identifier, strictRecord } from '../../shared/validation'

export interface ContentFileIdentity { device: number; inode: number }
export const contentDigest = (content: string | Uint8Array): string => createHash('sha256').update(content).digest('hex')
export const contentMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === 'ENOENT'
export function contentConflict(message = 'Saved topic content changed outside this operation. Its files have been preserved.'): ApplicationError { return new ApplicationError('CONFLICT', message) }
export function contentStorageError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error
  return new ApplicationError('STORAGE', 'Topic content could not be read or saved. Existing files and recovery state have been preserved.')
}
/** Encoded rather than interpolated: case-distinct topic IDs remain distinct on Windows. */
export function topicManifestPath(topicId: string): string { return `.edu/chapters/topic-${Buffer.from(identifier(topicId), 'utf8').toString('hex')}.json` }
export function topicJournalPath(topicId: string): string { return `.edu/content-publications/topic-${Buffer.from(identifier(topicId), 'utf8').toString('hex')}.json` }
export function topicCheckpointPath(runId: string): string { return `.edu/content-runs/${identifier(runId)}.json` }
export function topicCandidatePath(candidateId: string): string { return `.edu/content-candidates/${identifier(candidateId)}.json` }
export function topicImageAttemptPath(candidateId: string): string { return `.edu/content-image-attempts/${identifier(candidateId)}.json` }
export async function contentRootIdentity(root: string): Promise<ContentFileIdentity> {
  const stat = await lstat(root)
  if (!stat.isDirectory() || stat.isSymbolicLink() || relative(root, await realpath(root)) !== '') throw contentConflict('The project root changed. Reopen the original project before saving content.')
  return { device: stat.dev, inode: stat.ino }
}
export async function assertContentRoot(root: string, expected: ContentFileIdentity): Promise<void> {
  const actual = await contentRootIdentity(root)
  if (actual.device !== expected.device || actual.inode !== expected.inode) throw contentConflict('The project root was replaced during this operation. Its files have been preserved.')
}
/** Bounded binary read rejects links and verifies the opened file identity. No image decoding on main. */
export async function readContentBytes(root: string, path: string, maximumBytes: number): Promise<Uint8Array | null> {
  const target = await projectTarget(root, path)
  let stat
  try { stat = await lstat(target) } catch (error) { if (contentMissing(error)) return null; throw error }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > maximumBytes) throw new ApplicationError('FORBIDDEN', 'Topic content must be a bounded regular file without links.')
  const file = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
  try {
    const actual = await file.stat()
    if (!actual.isFile() || actual.nlink !== 1 || actual.size > maximumBytes || actual.dev !== stat.dev || actual.ino !== stat.ino) throw contentConflict()
    const buffer = Buffer.alloc(maximumBytes + 1)
    let length = 0
    while (length <= maximumBytes) {
      const result = await file.read(buffer, length, buffer.length - length, null)
      if (!result.bytesRead) break
      length += result.bytesRead
    }
    if (length > maximumBytes) throw new ApplicationError('FORBIDDEN', 'Topic content exceeds its allowed file size.')
    const end = await file.stat()
    if (end.size !== length || end.mtimeMs !== actual.mtimeMs || end.ctimeMs !== actual.ctimeMs) throw contentConflict()
    return buffer.subarray(0, length)
  } finally { await file.close() }
}
export async function readContentText(root: string, path: string, maximumBytes: number): Promise<string | null> {
  const bytes = await readContentBytes(root, path, maximumBytes)
  return bytes === null ? null : new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}
/** Call only from an authorized serialized mutation, never an ordinary reader. */
export async function finishImmutableContentWrite(root: string, path: string, expectedDigest: string, expectedBytes: number): Promise<void> {
  const target = await projectTarget(root, path), stat = await lstat(target).catch(error => { if (contentMissing(error)) return null; throw error })
  if (!stat || stat.nlink === 1) return
  if (stat.nlink !== 2) throw contentConflict('A chapter file has unknown filesystem links. Its bytes have been preserved.')
  const parentPath = path.split('/').slice(0, -1).join('/'), prefix = '.' + basename(target) + '.'
  const intentFolder = '.edu/content-file-intents'
  await projectTarget(root, intentFolder + '/__scope__')
  const entries = await readdir(join(root, '.edu', 'content-file-intents'), { withFileTypes: true }).catch(error => { if (contentMissing(error)) return []; throw error })
  if (entries.length > 1000) throw contentConflict()
  for (const entry of entries) {
    if (!entry.isFile() || !/^[0-9a-f-]{36}\.json$/.test(entry.name)) continue
    const recordPath = `${intentFolder}/${entry.name}`, content = await readContentText(root, recordPath, 2048)
    if (!content) continue
    let record
    try { record = strictRecord(JSON.parse(content), ['version', 'target', 'temporary', 'digest', 'bytes']) } catch { continue }
    if (record.version !== 1 || record.target !== path || record.digest !== expectedDigest || record.bytes !== expectedBytes || typeof record.temporary !== 'string' || !record.temporary.startsWith(prefix) || !/\.[0-9a-f-]{36}\.content\.tmp$/.test(record.temporary) || record.temporary.includes('/') || record.temporary.includes('\\')) continue
    const temporary = await projectTarget(root, `${parentPath}/${record.temporary}`), tempStat = await lstat(temporary).catch(error => { if (contentMissing(error)) return null; throw error })
    if (!tempStat || tempStat.ino !== stat.ino || tempStat.dev !== stat.dev || tempStat.nlink !== 2 || tempStat.size !== expectedBytes) continue
    // The durable ownership record precedes the link; unlink only this exact, identity-matched private temporary.
    const handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
    try {
      if ((await handle.stat()).size !== expectedBytes) throw contentConflict()
      const buffer = Buffer.alloc(expectedBytes + 1)
      let length = 0
      while (length < buffer.length) { const read = await handle.read(buffer, length, buffer.length - length, null); if (!read.bytesRead) break; length += read.bytesRead }
      if (length !== expectedBytes || contentDigest(buffer.subarray(0, length)) !== expectedDigest) throw contentConflict()
    } finally { await handle.close() }
    await unlink(temporary)
    await unlink(await projectTarget(root, recordPath))
    return
  }
  throw contentConflict('A chapter file has an unrecognized filesystem link. Its bytes and recovery state have been preserved.')
}
/** Private temp + fsync + no-clobber hardlink prevents partial final bytes and unknown-target replacement. */
export async function writeImmutableContent(root: string, path: string, bytes: string | Uint8Array, writeTemporary?: (file: Awaited<ReturnType<typeof open>>, bytes: Uint8Array) => Promise<void>): Promise<void> {
  const buffer = typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : bytes
  await finishImmutableContentWrite(root, path, contentDigest(buffer), buffer.byteLength)
  const existing = await readContentBytes(root, path, buffer.byteLength)
  if (existing !== null) { if (contentDigest(existing) !== contentDigest(buffer)) throw contentConflict(); return }
  const target = await projectTarget(root, path, true)
  const uuid = randomUUID(), temporaryName = `.${basename(target)}.${uuid}.content.tmp`
  const temporary = join(dirname(target), temporaryName), record = await projectTarget(root, `.edu/content-file-intents/${uuid}.json`, true)
  const owner = await open(record, 'wx', 0o600)
  try { await owner.writeFile(JSON.stringify({ version: 1, target: path, temporary: temporaryName, digest: contentDigest(buffer), bytes: buffer.byteLength })); await owner.sync() } finally { await owner.close() }
  let created = false
  try {
    const file = await open(temporary, 'wx', 0o600)
    created = true
    try { if (writeTemporary) await writeTemporary(file, buffer); else await file.writeFile(buffer); await file.sync() } finally { await file.close() }
    if ((await lstat(temporary)).size !== buffer.byteLength) throw new ApplicationError('STORAGE', 'A private chapter file write was incomplete.')
    await projectTarget(root, path)
    try { await link(temporary, target) }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw contentConflict(); throw error }
  } finally {
    if (created) await unlink(temporary).catch(error => { if (!contentMissing(error)) throw error })
    await unlink(record).catch(error => { if (!contentMissing(error)) throw error })
  }
}
