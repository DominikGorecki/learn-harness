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
    const verifyWorkspaceContrast = async () => {
      const contrast = await page.locator('.workspace-composer').evaluate(element => {
        const view = element.ownerDocument.defaultView!
        const style = view.getComputedStyle(element)
        const luminance = (color: string) => {
          const channels = color.startsWith('#') ? color.slice(1).match(/../g)!.map(part => parseInt(part, 16)) : color.match(/[\d.]+/g)!.slice(0, 3).map(Number)
          return channels.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
            .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index]!, 0)
        }
        const ratio = (foreground: string, background: string) => {
          const a = luminance(foreground), b = luminance(background)
          return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
        }
        const backgrounds = ['--workspace-highlight', '--workspace-surface'].map(name => style.getPropertyValue(name).trim())
        const againstSurface = (color: string) => Math.min(...backgrounds.map(background => ratio(color, background)))
        return { text: againstSurface(view.getComputedStyle(element.querySelector('label')!).color),
          action: againstSurface(view.getComputedStyle(element.querySelector('.workspace-action')!).color),
          focus: againstSurface(style.getPropertyValue('--accent').trim()) }
      })
      expect(contrast.text).toBeGreaterThanOrEqual(4.5)
      expect(contrast.action).toBeGreaterThanOrEqual(4.5)
      expect(contrast.focus).toBeGreaterThanOrEqual(3)
      console.info('Central gradient endpoint contrast', await page.locator('html').getAttribute('data-theme'), contrast)
    }
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Appearance', exact: true }).click()
    await page.getByRole('radio', { name: 'Light', exact: true }).check()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    const brand = page.getByRole('button', { name: 'Learning Studio projects', exact: true })
    const verifyBrand = async (color: string) => {
      await expect(brand).toHaveText('Learning Studio')
      await expect(brand.locator('svg')).toHaveAttribute('aria-hidden', 'true')
      await expect(brand.locator('svg')).toHaveAttribute('fill', 'currentColor')
      await expect(brand.locator('svg')).toHaveCSS('width', '22px')
      await expect(brand.locator('svg')).toHaveCSS('height', '22px')
      await expect(brand.locator('path')).toHaveCount(3)
      await expect(brand.locator('svg')).toHaveCSS('color', color)
    }
    await verifyBrand('rgb(121, 68, 202)')
    await flow.capture(desktop, page, 'settings-light')
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await verifyWorkspaceContrast()
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
    await verifyBrand('rgb(181, 138, 248)')
    expect(await page.evaluate(async () => (globalThis as unknown as { learning: AiApi }).learning.getAiActivity())).toMatchObject({ ok: true, data: { active: null, settled: null } })
    await expect(page.locator('.ai-panel')).toHaveCount(0)
    await verifyWorkspaceContrast()
    await flow.capture(desktop, page, 'workspace-dark')
    // The filled baseline must remain usable when the decorative gradient is absent.
    await page.locator('.workspace-composer').evaluate(element => { (element as unknown as { style: { backgroundImage: string } }).style.backgroundImage = 'none' })
    expect(await page.locator('.workspace-composer').evaluate(element => element.ownerDocument.defaultView!.getComputedStyle(element).backgroundColor)).toMatch(/^rgb\(/)
    await expect(page.getByRole('textbox')).toHaveValue(draft)
    await page.getByRole('button', { name: 'Create outline', exact: true }).focus()
    await expect(page.getByRole('button', { name: 'Create outline', exact: true })).toBeFocused()
    await expect(page.getByRole('button', { name: 'Create outline', exact: true })).toBeEnabled()
    await page.locator('.workspace-composer').evaluate(element => { (element as unknown as { style: { removeProperty(name: string): void } }).style.removeProperty('background-image') })
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
    await page.emulateMedia({ reducedMotion: 'reduce' }); await flow.capture(desktop, page, 'settings-zoom-dark')
    await page.getByRole('radio', { name: 'Light', exact: true }).check(); await flow.capture(desktop, page, 'settings-zoom-light')
    await page.getByRole('radio', { name: 'Dark', exact: true }).check()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('textbox')).toHaveValue(draft)
    await desktop.close(); desktop = undefined

    desktop = await launch()
    page = await desktop.firstWindow()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByRole('button', { name: 'Appearance', exact: true }).click()
    await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked()
    await page.getByRole('button', { name: 'Appearance', exact: true }).click()
    await page.getByRole('radio', { name: 'Light', exact: true }).check()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    // A blocked preference store must not stop a learner from changing appearance.
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Storage unavailable') } })
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByRole('button', { name: 'Appearance', exact: true }).click()
    await page.getByRole('radio', { name: 'Dark', exact: true }).check()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('dialog').getByRole('status')).toContainText('This device could not save the preference.')
    expect(await readdir(folder)).toEqual([])
  } finally { await desktop?.close(); await rm(root, { recursive: true, force: true }) }
})
