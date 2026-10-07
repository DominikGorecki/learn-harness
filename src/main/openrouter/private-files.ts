import { constants } from 'node:fs'
import { chmod, lstat, mkdir, open } from 'node:fs/promises'
import { ApplicationError } from '../../shared/contracts'
import { atomicWrite } from '../storage/atomic-file'
export const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === 'ENOENT'
export const storageError = (): ApplicationError => new ApplicationError('STORAGE', 'OpenRouter state could not be saved or read. Existing credentials and history have been preserved.')
export async function privateDirectory(path: string, create = true): Promise<boolean> {
  let stat
  try { stat = await lstat(path) } catch (error) {
    if (!missing(error)) throw storageError()
    if (!create) return false
    await mkdir(path, { recursive: true, mode: 0o700 }); stat = await lstat(path)
  }
  if (!stat.isDirectory() || stat.isSymbolicLink() || process.platform !== 'win32' && stat.uid !== process.getuid?.()) throw storageError()
  if (process.platform !== 'win32') await chmod(path, 0o700)
  return true
}
export async function readPrivate(path: string, limit: number): Promise<string | null> {
  let stat
  try { stat = await lstat(path) } catch (error) { if (missing(error)) return null; throw storageError() }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > limit || process.platform !== 'win32' && stat.uid !== process.getuid?.()) throw storageError()
  const file = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
  try {
    const actual = await file.stat()
    if (actual.ino !== stat.ino || actual.dev !== stat.dev || actual.nlink !== 1 || actual.size > limit) throw storageError()
    const bytes = Buffer.alloc(limit + 1); let length = 0
    while (length < bytes.length) { const read = await file.read(bytes, length, bytes.length - length, null); if (!read.bytesRead) break; length += read.bytesRead }
    const end = await file.stat()
    if (length > limit || end.size !== length || end.mtimeMs !== actual.mtimeMs || end.ctimeMs !== actual.ctimeMs) throw storageError()
    if (process.platform !== 'win32') await file.chmod(0o600)
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length))
  } finally { await file.close() }
}
export async function replacePrivate(path: string, value: unknown, limit: number): Promise<void> {
  const content = JSON.stringify(value) + '\n'
  if (Buffer.byteLength(content) > limit) throw storageError()
  await readPrivate(path, limit)
  try { await atomicWrite(path, content) } catch { throw storageError() }
}
/** A partially written immutable record is preserved as corruption and blocks replay. */
export async function appendPrivate(path: string, value: unknown, limit: number): Promise<void> {
  const content = JSON.stringify(value) + '\n'
  if (Buffer.byteLength(content) > limit) throw storageError()
  try {
    const file = await open(path, 'wx', 0o600)
    try { await file.writeFile(content); await file.sync() } finally { await file.close() }
  } catch { throw storageError() }
}
