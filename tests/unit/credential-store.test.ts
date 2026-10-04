import { chmod, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises'
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
    expect((await readFile(join(path, 'chatgpt.json'))).toString()).not.toContain('access-secret')
    expect(await createCredentialStore(path, cipher).read()).toEqual(credential)
    expect(await readdir(path)).toEqual(['chatgpt.json'])
  })
  it('persists local credentials across fresh stores when OS encryption is unavailable', async () => {
    const path = await directory()
    const storage = createCredentialStore(path, { ...cipher, available: () => false })
    await storage.write(credential)
    expect(await storage.read()).toEqual(credential)
    expect(storage.persistence).toBe('local')
    expect(await readdir(path)).toEqual(['chatgpt.json'])
    expect(await createCredentialStore(path, { ...cipher, available: () => false }).read()).toEqual(credential)
    expect(JSON.parse(await readFile(join(path, 'chatgpt.json'), 'utf8')).storage).toBe('local')
  })
  it('migrates the old protected credential file without changing its connection', async () => {
    const path = await directory()
    await writeFile(join(path, 'chatgpt.enc'), cipher.encrypt(JSON.stringify(credential)))
    expect(await createCredentialStore(path, cipher).read()).toEqual(credential)
    expect(await readdir(path)).toEqual(['chatgpt.json'])
    const raw = await readFile(join(path, 'chatgpt.json'), 'utf8')
    expect(JSON.parse(raw).storage).toBe('protected')
    expect(raw).not.toContain('access-secret')
  })
  it('upgrades a local connection when protected storage becomes available', async () => {
    const path = await directory()
    await createCredentialStore(path, { ...cipher, available: () => false }).write(credential)
    expect(await createCredentialStore(path, cipher).read()).toEqual(credential)
    expect(JSON.parse(await readFile(join(path, 'chatgpt.json'), 'utf8')).storage).toBe('protected')
    expect(await createCredentialStore(path, cipher).read()).toEqual(credential)
  })
  it('does not downgrade an encrypted connection when the keychain becomes unavailable', async () => {
    const path = await directory()
    await createCredentialStore(path, cipher).write(credential)
    const before = await readFile(join(path, 'chatgpt.json'), 'utf8')
    await expect(createCredentialStore(path, { ...cipher, available: () => false }).read()).rejects.toMatchObject({ code: 'STORAGE' })
    expect(await readFile(join(path, 'chatgpt.json'), 'utf8')).toBe(before)
  })
  it('preserves the previous connection if encryption fails during replacement', async () => {
    const path = await directory()
    await createCredentialStore(path, cipher).write(credential)
    const before = await readFile(join(path, 'chatgpt.json'), 'utf8')
    const failing = { ...cipher, encrypt: () => { throw new Error('Encryption unavailable') } }
    await expect(createCredentialStore(path, failing).write({ ...credential, accessToken: 'replacement' })).rejects.toMatchObject({ code: 'STORAGE' })
    expect(await readFile(join(path, 'chatgpt.json'), 'utf8')).toBe(before)
  })
  it('uses the canonical connection when a legacy file remains and clears both on sign-out', async () => {
    const path = await directory()
    await createCredentialStore(path, cipher).write(credential)
    await writeFile(join(path, 'chatgpt.enc'), cipher.encrypt(JSON.stringify({ ...credential, accessToken: 'stale' })))
    const fresh = createCredentialStore(path, cipher)
    expect(await fresh.read()).toEqual(credential)
    await writeFile(join(path, 'chatgpt.enc'), 'old encrypted data')
    await fresh.clear()
    expect(await readdir(path)).toEqual([])
    expect(await createCredentialStore(path, cipher).read()).toBeNull()
  })
  it.skipIf(process.platform === 'win32')('restricts existing directories and credential files to their owner', async () => {
    const path = await directory()
    await chmod(path, 0o755)
    await createCredentialStore(path, { ...cipher, available: () => false }).write(credential)
    expect((await stat(path)).mode & 0o777).toBe(0o700)
    expect((await stat(join(path, 'chatgpt.json'))).mode & 0o777).toBe(0o600)
    await chmod(join(path, 'chatgpt.json'), 0o644)
    await createCredentialStore(path, { ...cipher, available: () => false }).read()
    expect((await stat(join(path, 'chatgpt.json'))).mode & 0o777).toBe(0o600)
  })
  it('refuses symlinked credential directories without writing outside the app profile', async () => {
    const path = await directory()
    const outside = join(path, 'outside'); await mkdir(outside)
    const link = join(path, 'connection'); await symlink(outside, link, 'junction')
    const storage = createCredentialStore(link, { ...cipher, available: () => false })
    await expect(storage.write(credential)).rejects.toMatchObject({ code: 'STORAGE' })
    await expect(storage.read()).rejects.toMatchObject({ code: 'STORAGE' })
    await expect(storage.clear()).rejects.toMatchObject({ code: 'STORAGE' })
    expect(await readdir(outside)).toEqual([])
  })
  it('rejects oversized or future-format files without replacing them', async () => {
    const path = await directory()
    for (const raw of [JSON.stringify({ version: 99 }), 'x'.repeat(256 * 1024 + 1)]) {
      await writeFile(join(path, 'chatgpt.json'), raw)
      await expect(createCredentialStore(path, cipher).read()).rejects.toMatchObject({ code: 'STORAGE' })
      expect(await readFile(join(path, 'chatgpt.json'), 'utf8')).toBe(raw)
    }
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
    await writeFile(join(path, 'chatgpt.json'), 'corrupt')
    await expect(createCredentialStore(path, cipher).read()).rejects.toMatchObject({ code: 'STORAGE' })
    expect(await readFile(join(path, 'chatgpt.json'), 'utf8')).toBe('corrupt')
  })
  it('does not overwrite a credential symlink', async () => {
    const path = await directory()
    const target = join(path, 'source.txt')
    await writeFile(target, 'preserve me')
    await symlink(target, join(path, 'chatgpt.json'))
    await expect(createCredentialStore(path, cipher).write(credential)).rejects.toMatchObject({ code: 'STORAGE' })
    expect(await readFile(target, 'utf8')).toBe('preserve me')
  })
})
