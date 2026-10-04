import { expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'
import type { AccountApi } from '../../src/shared/account'

test('account panel restores and renews its connection after restart and signs out durably', async ({ playwright }, testInfo) => {
  const fixture = await startChatGPTFixture()
  const profile = await mkdtemp(join(tmpdir(), 'edu-account-desktop-'))
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  const launch = () => playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env,
    EDU_HARNESS_TEST_DATA_DIR: profile, EDU_HARNESS_TEST_PROVIDER_URL: fixture.baseUrl } })
  let desktop: ElectronApplication | undefined
  try {
    desktop = await launch()
    // Only the OS browser opening is automated. The real callback, token exchange,
    // signed identity verification, model request, service, preload, and UI run.
    await desktop.evaluate(({ shell }) => { shell.openExternal = async url => { await fetch(url) } })
    let page = await desktop.firstWindow()
    await page.getByRole('button', { name: 'Account settings' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Continue with ChatGPT' }).click()
    await expect(page.getByRole('heading', { name: 'Connected to ChatGPT' })).toBeVisible()
    await expect(page.getByText('2 models available for your projects')).toBeVisible()
    expect(fixture.authorizations).toHaveLength(1)
    expect(fixture.modelsRequested()).toBe(1)
    const state = await page.evaluate(async () => (globalThis as unknown as { learning: AccountApi }).learning.getAccount())
    expect(JSON.stringify(state)).not.toContain('fixture-access')
    expect(JSON.stringify(state)).not.toContain('fixture-refresh')
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('account-protocol-fixture.png') })
    // Expire only this isolated fixture profile to exercise real renewal on boot.
    // The encrypted variant uses the running OS storage adapter, not a fake cipher.
    const connectionFile = join(profile, 'connection', 'chatgpt.json')
    const stored = JSON.parse(await readFile(connectionFile, 'utf8'))
    if (stored.storage === 'protected') {
      stored.ciphertext = await desktop.evaluate(({ safeStorage }, ciphertext) => {
        const credential = JSON.parse(safeStorage.decryptString(Buffer.from(ciphertext, 'base64')))
        credential.expiresAt = 0
        return safeStorage.encryptString(JSON.stringify(credential)).toString('base64')
      }, stored.ciphertext)
    } else stored.credential.expiresAt = 0
    await writeFile(connectionFile, JSON.stringify(stored))
    await desktop.close(); desktop = undefined
    desktop = await launch()
    page = await desktop.firstWindow()
    await page.getByRole('button', { name: 'Account settings' }).click()
    await expect(page.getByRole('heading', { name: 'Connected to ChatGPT' })).toBeVisible()
    await expect(page.getByText('2 models available for your projects')).toBeVisible()
    expect(fixture.authorizations).toHaveLength(1)
    expect(fixture.tokens.filter(value => value.get('grant_type') === 'refresh_token')).toHaveLength(1)
    expect(fixture.modelsRequested()).toBe(2)
    await page.getByRole('button', { name: 'Sign out of this app' }).click()
    await expect(page.getByRole('button', { name: 'Continue with ChatGPT' })).toBeVisible()
    expect(fixture.revoked()).toBe(1)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Account settings' })).toBeFocused()
    await expect(readFile(join(profile, 'connection', 'chatgpt.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    await desktop.close(); desktop = undefined
    desktop = await launch()
    page = await desktop.firstWindow()
    await page.getByRole('button', { name: 'Account settings' }).click()
    await expect(page.getByRole('button', { name: 'Continue with ChatGPT' })).toBeVisible()
    expect(fixture.authorizations).toHaveLength(1)
  } finally {
    await desktop?.close()
    await fixture.close()
    await rm(profile, { recursive: true, force: true })
  }
})

test('manual sign-in link completes OAuth when the system browser cannot open', async ({ playwright }, testInfo) => {
  const fixture = await startChatGPTFixture()
  const profile = await mkdtemp(join(tmpdir(), 'edu-account-copy-desktop-'))
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  let desktop: ElectronApplication | undefined
  try {
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env,
      EDU_HARNESS_TEST_DATA_DIR: profile, EDU_HARNESS_TEST_PROVIDER_URL: fixture.baseUrl } })
    await desktop.evaluate(async ({ shell, clipboard }) => {
      shell.openExternal = async () => { throw new Error('No system browser available') }
      await clipboard.writeText('manual-login-fixture')
    })
    const page = await desktop.firstWindow()
    await page.getByRole('button', { name: 'Account settings' }).click()
    await page.getByRole('button', { name: 'Continue with ChatGPT' }).click()
    await expect(page.getByText('The browser could not open automatically.', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Copy sign-in link' }).click()
    await expect(page.getByText('Sign-in link copied.', { exact: false })).toBeVisible()
    expect(fixture.authorizations).toHaveLength(0)
    const validLink = await desktop.evaluate(async ({ clipboard }, origin) => {
      const url = new URL(await clipboard.readText())
      return url.origin === origin && url.searchParams.get('code_challenge_method') === 'S256' && Boolean(url.searchParams.get('state'))
    }, fixture.baseUrl)
    expect(validLink).toBe(true)
    const state = await page.evaluate(async () => (globalThis as unknown as { learning: AccountApi }).learning.getAccount())
    expect(JSON.stringify(state)).not.toContain('code_challenge')
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('manual-sign-in-link.png') })
    // Simulate pasting the copied link into a browser; the real loopback callback
    // and signed token/model exchange complete through the running app.
    await desktop.evaluate(async ({ clipboard }) => { await fetch(await clipboard.readText()); await clipboard.clear() })
    await expect(page.getByRole('heading', { name: 'Connected to ChatGPT' })).toBeVisible()
    await expect(page.getByText('2 models available for your projects')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy sign-in link' })).toHaveCount(0)
    expect(fixture.authorizations).toHaveLength(1)
  } finally {
    await desktop?.close()
    await fixture.close()
    await rm(profile, { recursive: true, force: true })
  }
})
