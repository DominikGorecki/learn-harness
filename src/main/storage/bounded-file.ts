import { constants } from 'node:fs'
import { lstat, open } from 'node:fs/promises'
import { ApplicationError } from '../../shared/contracts'

export async function readBoundedFile(path: string, maximumBytes: number): Promise<string> {
  const stat = await lstat(path)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximumBytes) throw new ApplicationError('STORAGE', 'The saved file is unsupported or too large. Its contents have been preserved.')
  const file = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
  try {
    const actual = await file.stat()
    if (!actual.isFile() || actual.size > maximumBytes || actual.dev !== stat.dev || actual.ino !== stat.ino) throw new ApplicationError('STORAGE', 'The saved file is unsupported, changed or too large.')
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
