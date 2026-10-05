import { expect, test } from '../flows/fixture'
import type { ElectronApplication } from '@playwright/test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'
import type { AccountApi } from '../../src/shared/account'
import type { AiApi } from '../../src/shared/ai/activity'

test('account panel restores and renews its connection after restart and signs out durably', { tag: '@account-connection', annotation: { type: 'flow', description: 'account-connection' } }, async ({ playwright, flow }) => {
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
    const activity = await page.evaluate(async () => {
      const bridge = (globalThis as unknown as { learning: AiApi }).learning
      const empty = await bridge.getAiActivity()
      const unsubscribe = bridge.onAiActivityChanged(() => { throw new Error('An empty coordinator must not emit producer activity') })
      const isUnsubscribe = typeof unsubscribe === 'function'
      unsubscribe(); unsubscribe()
      const stale = await bridge.cancelAiOperation({ operationId: 'stale' })
      const malformed = await bridge.cancelAiOperation({ operationId: 'stale', timeout: 0 } as Parameters<AiApi['cancelAiOperation']>[0])
      return { empty, isUnsubscribe, stale, malformed }
    })
    expect(activity.empty).toEqual({ ok: true, data: { revision: 0, active: null, settled: null } })
    expect(activity.isUnsubscribe).toBe(true)
    expect(activity.stale).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } })
    expect(activity.malformed).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
    await page.evaluate(() => {
      const target = globalThis as unknown as { learning: AiApi; aiBridgeEvidence: { revision: number; keys: string[] }[]; unsubscribeAi: () => void }
      target.aiBridgeEvidence = []
      target.unsubscribeAi = target.learning.onAiActivityChanged(snapshot => target.aiBridgeEvidence.push({ revision: snapshot.revision, keys: Object.keys(snapshot) }))
    })
    await desktop.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0]!.webContents.send('ai:activity-changed', { revision: 1, active: null, settled: null }) })
    await page.waitForFunction(() => (globalThis as unknown as { aiBridgeEvidence: unknown[] }).aiBridgeEvidence.length === 1)
    const subscription = await page.evaluate(() => {
      const target = globalThis as unknown as { aiBridgeEvidence: { revision: number; keys: string[] }[]; unsubscribeAi: () => void }
      target.unsubscribeAi(); return target.aiBridgeEvidence
    })
    expect(subscription).toEqual([{ revision: 1, keys: ['revision', 'active', 'settled'] }])
    await desktop.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0]!.webContents.send('ai:activity-changed', { revision: 2, active: null, settled: null }) })
    // A subsequent IPC reply ensures the sent event has crossed the bridge before checking unsubscribe.
    await page.evaluate(async () => { await (globalThis as unknown as { learning: AiApi }).learning.getAiActivity() })
    expect(await page.evaluate(() => (globalThis as unknown as { aiBridgeEvidence: unknown[] }).aiBridgeEvidence.length)).toBe(1)
    // Exercise authorization through real Electron IPC, without adding a public raw-IPC capability.
    const forgedActivity = await desktop.evaluate(async ({ ipcMain, webContents }) => {
      const listener = (ipcMain as unknown as { _invokeHandlers: Map<string, (event: unknown, payload?: unknown) => Promise<unknown>> })._invokeHandlers
      const contents = webContents.getAllWebContents().find(item => item.getURL().startsWith('learningapp://workspace'))!
      const forged = { sender: {}, senderFrame: contents.mainFrame }
      return Promise.all(['ai:get-activity', 'ai:cancel-operation'].map(channel => listener.get(channel)!(forged, channel.includes('cancel') ? { operationId: 'stale' } : undefined)))
    })
    expect(forgedActivity).toEqual([expect.objectContaining({ ok: false, error: expect.objectContaining({ code: 'FORBIDDEN' }) }),
      expect.objectContaining({ ok: false, error: expect.objectContaining({ code: 'FORBIDDEN' }) })])
    await page.getByRole('button', { name: 'Account settings' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Continue with ChatGPT' }).click()
    await expect(page.getByRole('heading', { name: 'Connected to ChatGPT' })).toBeVisible()
    await expect(page.getByText('4 model choices for your projects')).toBeVisible()
    expect(fixture.authorizations).toHaveLength(1)
    expect(fixture.modelsRequested()).toBe(1)
    const state = await page.evaluate(async () => (globalThis as unknown as { learning: AccountApi }).learning.getAccount())
    expect(JSON.stringify(state)).not.toContain('fixture-access')
    expect(JSON.stringify(state)).not.toContain('fixture-refresh')
    await flow.capture(desktop, page, 'account-protocol-fixture')
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
    await expect(page.getByText('4 model choices for your projects')).toBeVisible()
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

test('manual sign-in link completes OAuth when the system browser cannot open', { tag: '@manual-sign-in', annotation: { type: 'flow', description: 'manual-sign-in' } }, async ({ playwright, flow }) => {
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
    await flow.capture(desktop, page, 'manual-sign-in-link')
    // Simulate pasting the copied link into a browser; the real loopback callback
    // and signed token/model exchange complete through the running app.
    await desktop.evaluate(async ({ clipboard }) => { await fetch(await clipboard.readText()); await clipboard.clear() })
    await expect(page.getByRole('heading', { name: 'Connected to ChatGPT' })).toBeVisible()
    await expect(page.getByText('4 model choices for your projects')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy sign-in link' })).toHaveCount(0)
    expect(fixture.authorizations).toHaveLength(1)
  } finally {
    await desktop?.close()
    await fixture.close()
    await rm(profile, { recursive: true, force: true })
  }
})
