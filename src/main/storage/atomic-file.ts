import { randomUUID } from 'node:crypto'
import { lstat, open, rename, unlink } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { ApplicationError } from '../../shared/contracts'

export async function assertRegularFile(path: string, allowMissing = true): Promise<void> {
  try {
    const stat = await lstat(path)
    if (!stat.isFile() || stat.isSymbolicLink()) throw new ApplicationError('STORAGE', 'The saved file is not a regular file. Its contents have been preserved.')
  } catch (error) {
    if (allowMissing && (error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
}

export async function atomicWrite(path: string, content: string | Uint8Array): Promise<void> {
  await assertRegularFile(path)
  const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`)
  let created = false
  try {
    const file = await open(temporary, 'wx', 0o600)
    created = true
    try { await file.writeFile(content); await file.sync() } finally { await file.close() }
    await assertRegularFile(path)
    await rename(temporary, path)
  } finally {
    if (created) await unlink(temporary).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    })
  }
}
