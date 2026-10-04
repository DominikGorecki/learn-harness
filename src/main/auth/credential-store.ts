import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { chmod, lstat, mkdir, open, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { ApplicationError } from '../../shared/contracts'
import { assertRegularFile, atomicWrite } from '../storage/atomic-file'
import type { AccountCredential, CredentialStore } from './types'

export interface SecretEncryption {
  available(): boolean
  encrypt(value: string): Uint8Array
  decrypt(value: Uint8Array): string
}

export function parseCredential(value: unknown): AccountCredential {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid stored connection')
  const data = value as Record<string, unknown>
  const text = (key: string, nullable = false): string | null => {
    const value = data[key]
    if (nullable && value === null) return null
    if (typeof value !== 'string' || !value || value.length > 32_768) throw new Error('Invalid stored connection')
    return value
  }
  if (data.version !== 1 || !Number.isFinite(data.expiresAt) || !Array.isArray(data.scopes) ||
      data.scopes.length > 30 || !data.scopes.every(value => typeof value === 'string' && value.length < 200)) throw new Error('Invalid stored connection')
  return {
    version: 1, clientId: text('clientId')!, subject: text('subject')!, name: text('name')!, email: text('email', true),
    idToken: text('idToken')!, accessToken: text('accessToken', true), refreshToken: text('refreshToken', true),
    expiresAt: data.expiresAt as number, scopes: [...data.scopes] as string[]
  }
}

const maximumConnectionBytes = 256 * 1024
const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === 'ENOENT'
const storageFailure = () => new ApplicationError('STORAGE', 'Your saved ChatGPT connection could not be read or saved. Check the app data folder and reconnect if necessary.')

/** Read through the checked file descriptor; never follow a credential symlink. */
async function readPrivateFile(path: string, limit = maximumConnectionBytes): Promise<Buffer> {
  await assertRegularFile(path, false)
  const file = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
  try {
    const stat = await file.stat()
    if (!stat.isFile() || stat.size > limit || stat.nlink !== 1 ||
        (process.platform !== 'win32' && stat.uid !== process.getuid?.())) throw storageFailure()
    if (process.platform !== 'win32') await file.chmod(0o600)
    const buffer = Buffer.alloc(limit + 1)
    let length = 0
    while (length <= limit) {
      const result = await file.read(buffer, length, buffer.length - length, null)
      if (!result.bytesRead) break
      length += result.bytesRead
    }
    if (length > limit) throw storageFailure()
    return buffer.subarray(0, length)
  } finally { await file.close() }
}

export function createCredentialStore(directory: string, encryption: SecretEncryption): CredentialStore {
  const path = join(directory, 'chatgpt.json')
  const legacyPath = join(directory, 'chatgpt.enc')
  const hostPath = join(directory, 'host-id')
  const protectedStorage = encryption.available()
  let memory: AccountCredential | null = null
  let host: Promise<string> | undefined

  async function prepare(create: boolean): Promise<boolean> {
    try {
      let stat
      try { stat = await lstat(directory) }
      catch (error) {
        if (!missing(error)) throw error
        if (!create) return false
        await mkdir(directory, { recursive: true, mode: 0o700 })
        stat = await lstat(directory)
      }
      if (!stat.isDirectory() || stat.isSymbolicLink() ||
          (process.platform !== 'win32' && stat.uid !== process.getuid?.())) throw storageFailure()
      if (process.platform !== 'win32') await chmod(directory, 0o700)
      return true
    } catch { throw storageFailure() }
  }

  async function remove(path: string): Promise<void> {
    await assertRegularFile(path)
    await unlink(path).catch(error => { if (!missing(error)) throw error })
  }

  async function write(credential: AccountCredential): Promise<void> {
    try {
      const validated = parseCredential(credential)
      await prepare(true)
      await assertRegularFile(legacyPath)
      const stored = protectedStorage
        ? { version: 1, storage: 'protected', ciphertext: Buffer.from(encryption.encrypt(JSON.stringify(validated))).toString('base64') }
        : { version: 1, storage: 'local', credential: validated }
      const serialized = JSON.stringify(stored) + '\n'
      if (Buffer.byteLength(serialized) > maximumConnectionBytes) throw storageFailure()
      await atomicWrite(path, serialized)
      memory = structuredClone(validated)
      // The atomic JSON file is authoritative once committed. A legacy cleanup
      // failure cannot undo a successful save; reads and sign-out retry cleanup.
      await remove(legacyPath).catch(() => {})
    } catch { throw storageFailure() }
  }

  return {
    persistence: protectedStorage ? 'protected' : 'local',
    async read() {
      if (memory) return structuredClone(memory)
      try {
        if (!await prepare(false)) return null
        let raw: Buffer
        try { raw = await readPrivateFile(path) }
        catch (error) {
          if (!missing(error)) throw error
          // Migrate the former OS-encrypted file without requiring another login.
          let legacy: Buffer
          try { legacy = await readPrivateFile(legacyPath) }
          catch (error) { if (missing(error)) return null; throw error }
          if (!protectedStorage) throw storageFailure()
          const credential = parseCredential(JSON.parse(encryption.decrypt(legacy)))
          await write(credential)
          return structuredClone(credential)
        }
        const data = JSON.parse(raw.toString('utf8')) as Record<string, unknown> | null
        if (!data || data.version !== 1) throw storageFailure()
        let credential: AccountCredential
        if (data.storage === 'protected') {
          if (!protectedStorage || typeof data.ciphertext !== 'string' || !data.ciphertext ||
              !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data.ciphertext)) throw storageFailure()
          credential = parseCredential(JSON.parse(encryption.decrypt(Buffer.from(data.ciphertext, 'base64'))))
        } else if (data.storage === 'local') credential = parseCredential(data.credential)
        else throw storageFailure()
        // Upgrade local persistence when an OS keychain becomes available.
        if (data.storage === 'local' && protectedStorage) await write(credential)
        else {
          memory = structuredClone(credential)
          await remove(legacyPath).catch(() => {})
        }
        return structuredClone(credential)
      } catch { throw storageFailure() }
    },
    write,
    async clear() {
      try {
        if (await prepare(false)) {
          // Preflight both paths before deleting either; never touch a symlink.
          await assertRegularFile(legacyPath); await assertRegularFile(path)
          await remove(legacyPath); await remove(path)
        }
        memory = null
      } catch { throw storageFailure() }
    },
    hostId() {
      host ??= (async () => {
        await prepare(true)
        try {
          const id = (await readPrivateFile(hostPath, 128)).toString('utf8').trim()
          if (!/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
            throw new ApplicationError('STORAGE', 'The app connection identity could not be read. Your saved data has been preserved.')
          }
          return id
        } catch (error) {
          if (!missing(error)) throw error
          const id = `urn:uuid:${randomUUID()}`
          await atomicWrite(hostPath, id + '\n')
          return id
        }
      })()
      return host
    }
  }
}
