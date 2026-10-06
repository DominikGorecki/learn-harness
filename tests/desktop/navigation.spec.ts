import { expect, test } from '../flows/fixture'
import type { ElectronApplication } from '@playwright/test'
import { mkdir, mkdtemp, readFile, realpath, rename, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createProjectStorage } from '../../src/main/storage/project-storage'
import { learningOutline } from '../fixtures/learning-outline'
import type { ProjectDocument } from '../../src/shared/workspace'

test('shared navigation restores current reading and drafts, preserves branches and scopes commands', { tag: '@navigation', annotation: { type: 'flow', description: 'navigation' } }, async ({ playwright, flow }) => {
  test.setTimeout(90_000)
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-navigation-')))
  const first = join(root, 'First subject'), second = join(root, 'Second subject'), third = join(root, 'Draft subject')
  await mkdir(first); await mkdir(second); await mkdir(third)
  const outline = learningOutline()
  outline.lessons = Array.from({ length: 12 }, (_, index) => ({ ...structuredClone(outline.lessons[index % 2]!), id: `stable-${index}`, title: `Topic ${index + 1}`, overview: 'Current saved learning material. '.repeat(30) }))
  outline.startingLessonId = 'stable-0'
  const document: ProjectDocument = { version: 1, projectId: 'portable-first', revision: 1, name: 'First subject', createdAt: '2026-10-06T12:00:00Z', updatedAt: '2026-10-06T12:00:00Z', selectedModel: null, brief: '',
    outline: { generatedAt: '2026-10-06T12:00:00Z', model: { id: 'saved-model', name: 'Saved model' }, brief: '', inferredBrief: null, document: outline, coverage: { files: [], limitations: [] } } }
  const storage = createProjectStorage()
  await storage.save(first, document, null)
  await storage.save(second, { ...document, projectId: 'portable-second', name: 'Second subject', outline: { ...document.outline!, document: { ...outline, title: 'Second subject outline' } } }, null)
  const before = await readFile(join(first, '.edu/project.json'), 'utf8')
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  let desktop: ElectronApplication | undefined
  const choose = async (path: string | null) => desktop!.evaluate(({ dialog }, selected) => { dialog.showOpenDialog = async () => ({ canceled: !selected, filePaths: selected ? [selected] : [] }) }, path)
  try {
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env, EDU_HARNESS_TEST_DATA_DIR: join(root, 'profile') } })
    const page = await desktop.firstWindow()
    const mac = process.platform === 'darwin'
    const backShortcut = mac ? 'Meta+[' : 'Alt+ArrowLeft'
    const back = page.getByRole('button', { name: 'Back', exact: true }), forward = page.getByRole('button', { name: 'Forward', exact: true })
    await expect(back).toBeDisabled()
    expect(await page.locator('.application-strip').getByRole('button').allTextContents()).toEqual(mac ? ['', '', ''] : ['', '', '', 'File', 'Edit', 'View', 'Help'])
    await choose(first); await page.getByRole('main').getByRole('button', { name: 'Open project', exact: true }).click()
    await expect(page.locator('#outline-heading')).toHaveText(outline.title)
    await expect(back).toBeEnabled()
    const lesson = page.locator('.lesson-disclosure').nth(2), summary = lesson.locator('summary')
    await summary.focus(); await summary.press('Enter')
    await page.locator('[data-disclosure="context:scope"] > summary').click()
    await summary.focus()
    const position = await page.getByRole('main').evaluate(element => { element.scrollTop = 450; return element.scrollTop })
    await choose(second); await page.getByRole('button', { name: 'Choose project folder' }).click()
    await expect(page.locator('#outline-heading')).toHaveText('Second subject outline')
    await expect(page.locator('.lesson-disclosure').nth(2)).not.toHaveAttribute('open', '')
    await back.click()
    await expect(page.locator('#outline-heading')).toHaveText(outline.title)
    await expect(lesson).toHaveAttribute('open', '')
    await expect(summary).toBeFocused()
    await expect.poll(() => page.getByRole('main').evaluate(element => element.scrollTop)).toBe(position)
    await expect(page.locator('[data-disclosure="context:scope"]')).toHaveAttribute('open', '')
    await expect(forward).toBeEnabled()
    // Same-location direct selection and cancelled chooser retain Forward.
    await page.getByRole('navigation', { name: 'Projects', exact: true }).getByRole('button', { name: 'First subject' }).click()
    await expect(forward).toBeEnabled()
    await choose(null); await page.getByRole('button', { name: 'Choose project folder' }).click()
    await expect(forward).toBeEnabled()
    await flow.capture(desktop, page, 'reading-restored-light')
    // Native View callback traverses the same real history with live availability.
    await expect.poll(() => desktop!.evaluate(({ Menu }) => Menu.getApplicationMenu()!.getMenuItemById('go-forward')!.enabled)).toBe(true)
    await desktop.evaluate(({ Menu, BrowserWindow }) => Menu.getApplicationMenu()!.getMenuItemById('go-forward')!.click(undefined, BrowserWindow.getAllWindows()[0]!, { triggeredByAccelerator: false }))
    await expect(page.locator('#outline-heading')).toHaveText('Second subject outline')
    await back.click()
    await choose(third); await page.getByRole('button', { name: 'Choose project folder' }).click()
    await expect(forward).toBeDisabled()
    await page.getByRole('textbox').fill('A'.repeat(32_001))
    await back.click(); await forward.click()
    await expect(page.getByRole('textbox')).toHaveValue('A'.repeat(32_001))
    // Editing owns navigation-like shortcuts; IME and modal scope apply to native callbacks too.
    await page.getByRole('textbox').focus(); await page.keyboard.press(backShortcut)
    await expect(page.getByRole('textbox')).toHaveValue('A'.repeat(32_001))
    if (!mac) {
      await page.keyboard.press('F10'); await expect(page.getByRole('button', { name: 'File', exact: true })).toBeFocused()
      await page.keyboard.press('Alt+e'); await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeFocused()
      await page.keyboard.press('Escape'); await expect(page.getByRole('textbox')).toBeFocused()
      // Exercise the owning native popup and Electron editing role against the
      // original keyboard surface. OS key selection of popup rows is separate.
      await page.getByRole('textbox').fill('Editable sample')
      await page.getByRole('textbox').evaluate(element => { const input = element as unknown as { setSelectionRange(start: number, end: number): void }; input.setSelectionRange(0, 8) })
      await desktop.evaluate(({ Menu, BrowserWindow }) => {
        const probe = globalThis as typeof globalThis & { navigationRoleProbe?: Promise<{ roles: string[]; invoked: boolean; error: string | null }> }
        probe.navigationRoleProbe = new Promise(resolveProbe => {
          const original = Menu.prototype.popup
          Menu.prototype.popup = function (options) {
            Menu.prototype.popup = original
            original.call(this, options)
            setTimeout(() => {
              const result = { roles: this.items.map(item => item.role ?? ''), invoked: false, error: null as string | null }
              try {
                const selectAll = this.items.find(item => item.role?.toLowerCase() === 'selectall')
                if (!selectAll) throw new Error('Native Edit popup has no Select All role')
                // Electron's normalized role callback receives the focused
                // WebContents internally, unlike custom application callbacks.
                const activate = selectAll.click as unknown as (item: unknown, window: unknown, contents: unknown) => void
                const owner = BrowserWindow.fromId(options!.window!.id)!
                activate(selectAll, owner, owner.webContents)
                result.invoked = true
              } catch (error) { result.error = error instanceof Error ? error.message : String(error) }
              finally { this.closePopup(); resolveProbe(result) }
            }, 50)
          }
        })
      })
      await page.keyboard.press('F10'); await page.keyboard.press('Alt+e'); await page.keyboard.press('ArrowDown')
      const roleProbe = await desktop.evaluate(async () => {
        const probe = globalThis as typeof globalThis & { navigationRoleProbe?: Promise<{ roles: string[]; invoked: boolean; error: string | null }> }
        const result = await probe.navigationRoleProbe
        delete probe.navigationRoleProbe
        return result
      })
      expect(roleProbe?.error, JSON.stringify(roleProbe?.roles)).toBeNull()
      expect(roleProbe?.invoked).toBe(true)
      await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeFocused()
      await page.keyboard.press('Escape'); await expect(page.getByRole('textbox')).toBeFocused()
      expect(await page.getByRole('textbox').evaluate(element => { const input = element as unknown as { selectionStart: number; selectionEnd: number }; return [input.selectionStart, input.selectionEnd] })).toEqual([0, 15])
      await page.keyboard.type('X')
      await expect(page.getByRole('textbox')).toHaveValue('X')
      await page.getByRole('textbox').press('ControlOrMeta+z')
      await expect(page.getByRole('textbox')).toHaveValue('Editable sample')

    }
    await page.getByRole('textbox').dispatchEvent('compositionstart')
    await desktop.evaluate(({ Menu, BrowserWindow }) => Menu.getApplicationMenu()!.getMenuItemById('go-back')!.click(undefined, BrowserWindow.getAllWindows()[0]!, { triggeredByAccelerator: false }))
    await expect(page.getByRole('textbox')).toBeVisible()
    await page.getByRole('textbox').dispatchEvent('compositionend')
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.keyboard.press(backShortcut); await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible()
    await page.getByRole('radio', { name: 'Dark', exact: true }).check(); await page.keyboard.press('Escape')
    await back.click(); await expect(page.locator('#outline-heading')).toHaveText(outline.title)
    // Changed authoritative content drops removed anchors, without reverting saved data.
    await forward.click()
    const changed = structuredClone(document); changed.revision++; changed.outline!.document.lessons.splice(2, 1)
    const current = await storage.load(first)
    await storage.save(first, changed, current.digest)
    await back.click(); await expect(page.locator('.lesson-disclosure')).toHaveCount(11)
    await expect(page.locator('#outline-heading')).toBeFocused()
    expect(await readFile(join(first, '.edu/project.json'), 'utf8')).not.toBe(before)
    await flow.capture(desktop, page, 'reading-current-dark')
    // Known recovery is traversable; repaired same-identity reload keeps Forward.
    const metadata = join(first, '.edu/project.json')
    await rename(metadata, metadata + '.backup')
    await forward.click(); await back.click()
    await expect(page.getByRole('heading', { name: 'This project needs attention.' })).toBeVisible()
    await rename(metadata + '.backup', metadata)
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await expect(page.locator('#outline-heading')).toBeVisible(); await expect(forward).toBeEnabled()
    await expect(page.locator('#outline-heading')).toBeFocused()
    // Hit-test all compact controls at the actual minimum window and Electron zoom.
    for (const theme of ['light', 'dark'] as const) {
      await page.getByRole('button', { name: 'Settings', exact: true }).click()
      await page.getByRole('radio', { name: theme === 'light' ? 'Light' : 'Dark', exact: true }).check(); await page.keyboard.press('Escape')
      await desktop.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]!; window.setContentSize(600, 480); window.webContents.setZoomFactor(2) })
      for (const label of ['Back', 'Forward', 'Show navigation', ...(!mac ? ['Menu'] : [])]) {
        const button = page.getByRole('button', { name: label, exact: true })
        await expect(button).toBeInViewport()
        expect(await button.evaluate(element => { const rect = element.getBoundingClientRect(); return element.ownerDocument.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === element || element.contains(element.ownerDocument.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)) })).toBe(true)
      }
      expect(await page.locator('.studio-shell').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
      if (theme === 'light') await flow.capture(desktop, page, 'compact-light')
      else await flow.capture(desktop, page, 'compact-dark')
      await desktop.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]!; window.webContents.setZoomFactor(1); window.setContentSize(1280, 840) })
    }
  } finally { await desktop?.close(); await rm(root, { recursive: true, force: true }) }
})
