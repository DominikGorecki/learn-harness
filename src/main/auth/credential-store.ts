import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink } from 'node:fs/promises'
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

export function createCredentialStore(directory: string, encryption: SecretEncryption): CredentialStore {
  const path = join(directory, 'chatgpt.enc')
  const hostPath = join(directory, 'host-id')
  const protectedStorage = encryption.available()
  let memory: AccountCredential | null = null
  let host: Promise<string> | undefined
  const prepare = () => mkdir(directory, { recursive: true, mode: 0o700 })
  return {
    persistence: protectedStorage ? 'protected' : 'session',
    async read() {
      if (memory) return structuredClone(memory)
      if (!protectedStorage) return null
      try {
        await assertRegularFile(path)
        const raw = await readFile(path)
        if (raw.byteLength > 128 * 1024) throw new Error('Invalid stored connection')
        memory = parseCredential(JSON.parse(encryption.decrypt(raw)))
        return structuredClone(memory)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw new ApplicationError('STORAGE', 'Your saved ChatGPT connection could not be opened. Reconnect to restore access.')
      }
    },
    async write(credential) {
      const validated = parseCredential(credential)
      if (protectedStorage) {
        await prepare()
        await atomicWrite(path, encryption.encrypt(JSON.stringify(validated)))
      }
      memory = structuredClone(validated)
    },
    async clear() {
      memory = null
      await assertRegularFile(path)
      await unlink(path).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error })
    },
    hostId() {
      host ??= (async () => {
        await prepare()
        try {
          await assertRegularFile(hostPath)
          const id = (await readFile(hostPath, 'utf8')).trim()
          if (!/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
            throw new ApplicationError('STORAGE', 'The app connection identity could not be read. Your saved data has been preserved.')
          }
          return id
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
          const id = `urn:uuid:${randomUUID()}`
          await atomicWrite(hostPath, id + '\n')
          return id
        }
      })()
      return host
    }
  }
}
