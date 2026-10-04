import { expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'
import type { AccountApi } from '../../src/shared/account'

test('account panel completes signed OAuth, loads models, and signs out through real IPC', async ({ playwright }, testInfo) => {
  const fixture = await startChatGPTFixture()
  const profile = await mkdtemp(join(tmpdir(), 'edu-account-desktop-'))
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  let desktop: ElectronApplication | undefined
  try {
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env,
      EDU_HARNESS_TEST_DATA_DIR: profile, EDU_HARNESS_TEST_PROVIDER_URL: fixture.baseUrl } })
    // Only the OS browser opening is automated. The real callback, token exchange,
    // signed identity verification, model request, service, preload, and UI run.
    await desktop.evaluate(({ shell }) => { shell.openExternal = async url => { await fetch(url) } })
    const page = await desktop.firstWindow()
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
    await page.screenshot({ path: testInfo.outputPath('account-protocol-fixture.png') })
    await page.getByRole('button', { name: 'Sign out of this app' }).click()
    await expect(page.getByRole('button', { name: 'Continue with ChatGPT' })).toBeVisible()
    expect(fixture.revoked()).toBe(1)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Account settings' })).toBeFocused()
  } finally {
    await desktop?.close()
    await fixture.close()
    await rm(profile, { recursive: true, force: true })
  }
})
