import type { ElectronApplication, Page } from '@playwright/test'
import type { ApplicationCommand, ApplicationMenuApi } from '../../src/shared/application-menu'
import type { WorkspaceApi } from '../../src/shared/workspace'

export async function workspaceSnapshot(page: Page) {
  const value = await page.evaluate(() => (globalThis as unknown as { learning: WorkspaceApi }).learning.getWorkspace())
  if (!value.ok) throw new Error('Expected the authoritative workspace')
  return value.data
}

export async function menuCommand(desktop: ElectronApplication, command: 'go-back' | 'go-forward') {
  await desktop.evaluate(({ Menu, BrowserWindow }, command) => {
    const item = Menu.getApplicationMenu()!.getMenuItemById(command)!
    if (!item.enabled) throw new Error(`Expected enabled ${command}`)
    item.click(undefined, BrowserWindow.getAllWindows()[0]!, { triggeredByAccelerator: false })
  }, command)
}

/** Revision 1 cannot replace a ready owner's equal/newer advisory state. */
export async function menuRevision(page: Page) {
  const value = await page.evaluate(() => (globalThis as unknown as { learning: ApplicationMenuApi }).learning.setApplicationMenuState({
    revision: 1, canGoBack: false, canGoForward: false, navigationPending: false, sidebarVisible: true
  }))
  if (!value.ok) throw new Error('Expected the current native menu revision')
  return value.data.revision
}

/** Deliver fixed valid-shaped events through the actual preload consumer. */
export async function deliverCommand(desktop: ElectronApplication, command: ApplicationCommand) {
  await desktop.evaluate(({ BrowserWindow }, command) => BrowserWindow.getAllWindows()[0]!.webContents.send('application-menu:command', command), command)
}

/** Inject an owning IPC ApiResult before mutation; this is not backend admission evidence. */
export async function rejectNextSelection(desktop: ElectronApplication, code: 'BUSY' | 'INTERNAL') {
  await desktop.evaluate(({ ipcMain }, code) => {
    type Handler = (event: unknown, payload: unknown) => Promise<unknown>
    const handlers = (ipcMain as unknown as { _invokeHandlers: Map<string, Handler> })._invokeHandlers
    const original = handlers.get('workspace:select')!, authorize = handlers.get('workspace:get')!
    const host = globalThis as unknown as { restoreNavigationFault?: () => void; navigationFaultCalls: number }
    host.navigationFaultCalls = 0
    host.restoreNavigationFault = () => { handlers.set('workspace:select', original); delete host.restoreNavigationFault }
    handlers.set('workspace:select', async (event, payload) => {
      const allowed = await authorize(event, undefined) as { ok: boolean }
      if (!allowed.ok) return allowed
      host.navigationFaultCalls++
      host.restoreNavigationFault!()
      void payload
      return { ok: false, error: { code, message: `Test-owned ${code} navigation rejection.` } }
    })
  }, code)
}

export async function restoreNavigationFault(desktop: ElectronApplication) {
  await desktop.evaluate(() => (globalThis as unknown as { restoreNavigationFault?: () => void }).restoreNavigationFault?.())
}

/** Hold one real chooser resolution, with only an owned test folder as its result. */
export async function holdChooser(desktop: ElectronApplication, folder: string) {
  await desktop.evaluate(({ dialog }, folder) => {
    const original = dialog.showOpenDialog
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const host = globalThis as unknown as { navigationChooser?: { calls: number; release(): void; restore(): void } }
    host.navigationChooser = { calls: 0, release, restore: () => { dialog.showOpenDialog = original; release() } }
    dialog.showOpenDialog = async () => {
      host.navigationChooser!.calls++
      await gate
      return { canceled: false, filePaths: [folder] }
    }
  }, folder)
}
export async function chooserCalls(desktop: ElectronApplication) {
  return desktop.evaluate(() => (globalThis as unknown as { navigationChooser?: { calls: number } }).navigationChooser?.calls ?? 0)
}
export async function releaseChooser(desktop: ElectronApplication) {
  await desktop.evaluate(() => {
    const host = globalThis as unknown as { navigationChooser?: { restore(): void } }
    host.navigationChooser?.restore(); delete host.navigationChooser
  })
}
