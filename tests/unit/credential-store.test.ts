import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createCredentialStore } from '../../src/main/auth/credential-store'
import type { SecretEncryption } from '../../src/main/auth/credential-store'
import type { AccountCredential } from '../../src/main/auth/types'

const directories: string[] = []
async function directory() { const path = await mkdtemp(join(tmpdir(), 'edu-credentials-')); directories.push(path); return path }
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

const credential: AccountCredential = { version: 1, clientId: 'client', subject: 'learner', name: 'Learner', email: null,
  idToken: 'identity-secret', accessToken: 'access-secret', refreshToken: 'refresh-secret', expiresAt: 1234, scopes: ['openid'] }
// A reversible test cipher proves that storage delegates to the OS encryption port.
const cipher: SecretEncryption = { available: () => true,
  encrypt: value => Buffer.from(value).map(byte => byte ^ 0xaa), decrypt: value => Buffer.from(value).map(byte => byte ^ 0xaa).toString() }

describe('connection storage', () => {
  it('persists protected credentials and restores through a fresh store', async () => {
    const path = await directory()
    await createCredentialStore(path, cipher).write(credential)
    expect((await readFile(join(path, 'chatgpt.enc'))).toString()).not.toContain('access-secret')
    expect(await createCredentialStore(path, cipher).read()).toEqual(credential)
    expect(await readdir(path)).toEqual(['chatgpt.enc'])
  })
  it('keeps credentials in memory when protected persistence is unavailable', async () => {
    const path = await directory()
    const storage = createCredentialStore(path, { ...cipher, available: () => false })
    await storage.write(credential)
    expect(await storage.read()).toEqual(credential)
    expect(storage.persistence).toBe('session')
    expect(await readdir(path)).toEqual([])
    expect(await createCredentialStore(path, { ...cipher, available: () => false }).read()).toBeNull()
  })
  it('persists one installation identity and clears secrets independently', async () => {
    const path = await directory()
    const storage = createCredentialStore(path, cipher)
    const first = await storage.hostId()
    expect(first).toMatch(/^urn:uuid:/)
    expect(await createCredentialStore(path, cipher).hostId()).toBe(first)
    await storage.write(credential); await storage.clear()
    expect(await storage.read()).toBeNull()
    expect(await readdir(path)).toEqual(['host-id'])
  })
  it('preserves invalid saved data and reports reconnection recovery', async () => {
    const path = await directory()
    await writeFile(join(path, 'chatgpt.enc'), 'corrupt')
    await expect(createCredentialStore(path, cipher).read()).rejects.toMatchObject({ code: 'STORAGE' })
    expect(await readFile(join(path, 'chatgpt.enc'), 'utf8')).toBe('corrupt')
  })
  it('does not overwrite a credential symlink', async () => {
    const path = await directory()
    const target = join(path, 'source.txt')
    await writeFile(target, 'preserve me')
    await symlink(target, join(path, 'chatgpt.enc'))
    await expect(createCredentialStore(path, cipher).write(credential)).rejects.toMatchObject({ code: 'STORAGE' })
    expect(await readFile(target, 'utf8')).toBe('preserve me')
  })
})
