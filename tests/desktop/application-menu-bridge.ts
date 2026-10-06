import { expect } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import type { ApplicationCommand, ApplicationMenuApi } from '../../src/shared/application-menu'
import type { WorkspaceApi } from '../../src/shared/workspace'

export async function verifyApplicationMenuBridge(desktop: ElectronApplication, page: Page): Promise<void> {
  const rejected = await page.evaluate(async () => {
    const bridge = (globalThis as unknown as { learning: ApplicationMenuApi & WorkspaceApi }).learning
    const show = bridge.showApplicationMenu as (value: unknown) => Promise<unknown>
    const state = bridge.setApplicationMenuState as (value: unknown) => Promise<unknown>
    const appearance = bridge.setWindowAppearance as (value: unknown) => Promise<unknown>
    return Promise.all([show({ menu: 'shell', anchor: { x: 0, y: 0 } }), show({ menu: 'file', anchor: { x: Infinity, y: 0 } }),
      show({ menu: 'file', anchor: { x: 0, y: 0 }, path: '/private' }), state({ revision: 0 }),
      appearance({ mode: 'dark', color: '#fff' }), bridge.selectProject({ projectId: 'unknown-menu-handle' })])
  })
  expect(rejected.slice(0, 5)).toEqual(Array.from({ length: 5 }, () => expect.objectContaining({ ok: false, error: expect.objectContaining({ code: 'INVALID_INPUT' }) })))
  expect(rejected[5]).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } })
  const senderRejections = await desktop.evaluate(async ({ BrowserWindow, ipcMain, WebContentsView }) => {
    const owner = BrowserWindow.getAllWindows()[0]!.webContents
    const stranger = new WebContentsView().webContents
    const handlers = (ipcMain as unknown as { _invokeHandlers: Map<string, (event: unknown, value: unknown) => Promise<unknown>> })._invokeHandlers
    try {
      const results: unknown[] = []
      for (const channel of ['application-menu:show', 'application-menu:state', 'application-menu:appearance']) {
        const action = handlers.get(channel)!
        results.push(await action({ sender: stranger, senderFrame: stranger.mainFrame }, {}))
        results.push(await action({ sender: owner, senderFrame: { origin: 'learningapp://workspace', url: 'learningapp://workspace/index.html' } }, {}))
      }
      return results
    } finally { stranger.close() }
  })
  expect(senderRejections).toEqual(Array.from({ length: 6 }, () => expect.objectContaining({ ok: false, error: expect.objectContaining({ code: 'FORBIDDEN' }) })))
  await page.evaluate(async () => {
    const target = globalThis as unknown as { learning: ApplicationMenuApi; menuEvidence: ApplicationCommand[]; stopMenuEvidence: () => void }
    target.menuEvidence = []
    target.stopMenuEvidence = target.learning.onApplicationCommand(value => target.menuEvidence.push(value))
    const state = { revision: 2, canGoBack: true, canGoForward: false, navigationPending: false, sidebarVisible: true }
    await target.learning.setApplicationMenuState(state)
    await target.learning.setApplicationMenuState({ ...state, revision: 1, canGoBack: false })
  })
  await desktop.evaluate(({ BrowserWindow, Menu }) => {
    const window = BrowserWindow.getAllWindows()[0]!
    for (const command of [{ command: 'shell', revision: 2 }, { command: 'go-back', revision: 2, projectHandle: 'bad' },
      { command: 'select-recent-project', revision: 2, projectHandle: '../path' }]) window.webContents.send('application-menu:command', command)
    const item = Menu.getApplicationMenu()!.getMenuItemById('go-back')!
    item.click(undefined, window, { triggeredByAccelerator: false })
  })
  await expect.poll(() => page.evaluate(() => (globalThis as unknown as { menuEvidence: ApplicationCommand[] }).menuEvidence)).toEqual([{ command: 'go-back', revision: 2 }])
  await page.evaluate(() => {
    const target = globalThis as unknown as { stopMenuEvidence: () => void }
    target.stopMenuEvidence(); target.stopMenuEvidence()
  })
  await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.webContents.send('application-menu:command', { command: 'go-forward', revision: 2 }))
  await page.evaluate(() => (globalThis as unknown as { learning: WorkspaceApi }).learning.getWorkspace())
  expect(await page.evaluate(() => (globalThis as unknown as { menuEvidence: ApplicationCommand[] }).menuEvidence)).toEqual([{ command: 'go-back', revision: 2 }])
  await page.getByRole('link', { name: 'Skip to workspace' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#workspace$/)
  expect(await desktop.evaluate(({ Menu }) => Menu.getApplicationMenu()!.getMenuItemById('go-back')!.enabled)).toBe(true)

  // Drive the actual owning bridge and native close callback at Electron zoom 2.
  await desktop.evaluate(({ BrowserWindow, Menu }) => {
    BrowserWindow.getAllWindows()[0]!.webContents.setZoomFactor(2)
    const original = Menu.prototype.popup
    const target = globalThis as unknown as { nativePopupPosition: { x?: number; y?: number } }
    Menu.prototype.popup = function (options) {
      target.nativePopupPosition = { x: options?.x, y: options?.y }
      Menu.prototype.popup = original
      original.call(this, options)
      setTimeout(() => this.closePopup(), 100)
    }
  })
  expect(await page.evaluate(() => (globalThis as unknown as { learning: ApplicationMenuApi }).learning.showApplicationMenu({ menu: 'edit', anchor: { x: 25, y: 30 } }))).toEqual({ ok: true, data: { closed: true } })
  expect(await desktop.evaluate(() => (globalThis as unknown as { nativePopupPosition: unknown }).nativePopupPosition)).toEqual({ x: 50, y: 60 })
  await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.webContents.setZoomFactor(1))
  await page.reload()
  expect(await desktop.evaluate(({ Menu }) => Menu.getApplicationMenu()!.getMenuItemById('go-back')!.enabled)).toBe(false)
}
