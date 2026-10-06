import { expect, test } from '../flows/fixture'
import type { ElectronApplication } from '@playwright/test'
import type { AiApi } from '../../src/shared/ai/activity'
import { mkdir, mkdtemp, readdir, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

test('appearance changes every surface, preserves drafts, and survives a desktop restart', { tag: '@appearance', annotation: { type: 'flow', description: 'appearance' } }, async ({ playwright, flow }) => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-appearance-')))
  const folder = join(root, 'Learning about oceans')
  await mkdir(folder)
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  const launch = () => playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env, EDU_HARNESS_TEST_DATA_DIR: join(root, 'profile') } })
  let desktop: ElectronApplication | undefined
  try {
    desktop = await launch()
    let page = await desktop.firstWindow()
    await desktop.evaluate(({ dialog }, selected) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] }) }, folder)
    await page.getByRole('main').getByRole('button', { name: 'Open project', exact: true }).click()
    const draft = 'How do ocean currents shape climate? Start with the foundations.'
    await page.getByRole('textbox').fill(draft)
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible()
    await page.getByRole('radio', { name: 'Light', exact: true }).check()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await flow.capture(desktop, page, 'settings-light')
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await flow.capture(desktop, page, 'workspace-light')
    await page.keyboard.press('ControlOrMeta+,')
    await page.getByRole('radio', { name: 'Light', exact: true }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await flow.capture(desktop, page, 'settings-dark')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused()
    await expect(page.getByRole('textbox')).toHaveValue(draft)
    await expect(page.locator('.studio-workspace')).toHaveCSS('background-color', 'rgb(24, 24, 24)')
    expect(await page.evaluate(async () => (globalThis as unknown as { learning: AiApi }).learning.getAiActivity())).toMatchObject({ ok: true, data: { active: null, settled: null } })
    await expect(page.locator('.ai-panel')).toHaveCount(0)
    await flow.capture(desktop, page, 'workspace-dark')
    await page.getByRole('button', { name: 'Account settings' }).click()
    await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(24, 24, 24)')
    await flow.capture(desktop, page, 'account-dark')
    await page.keyboard.press('Escape')
    expect(await readdir(folder)).toEqual([])

    await desktop.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0]!
      window.setContentSize(600, 640); window.webContents.setZoomFactor(2)
    })
    // Windows hidden-title content edges can round by one CSS pixel at zoom 2.
    await expect.poll(() => page.evaluate(() => (globalThis as unknown as { innerWidth: number }).innerWidth)).toBeLessThanOrEqual(301)
    expect(await page.evaluate(() => (globalThis as unknown as { innerWidth: number }).innerWidth)).toBeGreaterThanOrEqual(300)
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByRole('radio', { name: 'Dark', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeInViewport()
    expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('textbox')).toHaveValue(draft)
    await desktop.close(); desktop = undefined

    desktop = await launch()
    page = await desktop.firstWindow()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked()
    await page.getByRole('radio', { name: 'Light', exact: true }).check()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    // A blocked preference store must not stop a learner from changing appearance.
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Storage unavailable') } })
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByRole('radio', { name: 'Dark', exact: true }).check()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('dialog').getByRole('status')).toContainText('This device could not save the preference.')
    expect(await readdir(folder)).toEqual([])
  } finally { await desktop?.close(); await rm(root, { recursive: true, force: true }) }
})
