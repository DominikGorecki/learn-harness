import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow, IpcMainInvokeEvent, MenuItemConstructorOptions, PopupOptions } from 'electron'
import type { WorkspaceService } from '../../src/core/workspace/service'
import type { WorkspaceSnapshot } from '../../src/shared/workspace'
import { applicationMenuChannels, parseApplicationCommand, parseApplicationMenuState, parseShowApplicationMenu, parseWindowAppearance } from '../../src/shared/application-menu'
import { ApplicationMenus } from '../../src/main/menus/application-menus'
import { applicationMenuTemplate, systemMenuTemplate } from '../../src/main/menus/templates'
import { applyWindowAppearance, integratedChromeOptions, popupAnchor } from '../../src/main/menus/chrome'
import { registerApplicationMenuHandlers } from '../../src/main/ipc/application-menu-handlers'
import { appOrigin } from '../../src/main/security/policy'

const fake = vi.hoisted(() => ({ templates: [] as MenuItemConstructorOptions[][], popups: [] as PopupOptions[],
  handlers: new Map<string, (event: IpcMainInvokeEvent, payload: unknown) => Promise<unknown>>(), close: vi.fn(), about: vi.fn() }))
vi.mock('electron', () => ({ app: { getName: () => 'Learning Studio', getVersion: () => '0.1.0' }, dialog: { showMessageBox: fake.about },
  Menu: { setApplicationMenu: vi.fn(), buildFromTemplate: (template: MenuItemConstructorOptions[]) => {
    fake.templates.push(template)
    return { popup: (options: PopupOptions) => fake.popups.push(options), closePopup: fake.close }
  } }, ipcMain: { handle: (channel: string, handler: (event: IpcMainInvokeEvent, payload: unknown) => Promise<unknown>) => fake.handlers.set(channel, handler) } }))

const ready = { revision: 1, canGoBack: true, canGoForward: false, navigationPending: false, sidebarVisible: true }
function flatten(items: MenuItemConstructorOptions[]): MenuItemConstructorOptions[] {
  return items.flatMap(item => [item, ...(Array.isArray(item.submenu) ? flatten(item.submenu as MenuItemConstructorOptions[]) : [])])
}
function activate(item: MenuItemConstructorOptions): void { item.click?.({} as never, undefined, {} as never) }
function fixture() {
  let snapshot: WorkspaceSnapshot = { activeProject: null, issue: null, projects: [{ id: 'profile-handle', name: 'A & B', folderPath: '/private', lastOpenedAt: '', availability: 'missing', hasOutline: false }] }
  const mainFrame = { origin: appOrigin, url: `${appOrigin}/index.html` }
  const callbacks = new Map<string, (...args: unknown[]) => void>()
  const send = vi.fn()
  const webContents = { mainFrame, isDestroyed: () => false, send, getZoomFactor: () => 2,
    on: (event: string, callback: (...args: unknown[]) => void) => callbacks.set(event, callback) }
  const overlay = vi.fn(() => { throw new Error('not activated') })
  const window = { webContents, isDestroyed: () => false, getContentSize: () => [600, 480], setTitleBarOverlay: overlay,
    once: (event: string, callback: (...args: unknown[]) => void) => callbacks.set(event, callback) } as unknown as BrowserWindow
  const workspace = { get: () => snapshot } as WorkspaceService
  const menus = new ApplicationMenus(workspace, () => window, 'win32')
  menus.attach(window)
  return { menus, window, send, callbacks, overlay, event: { sender: webContents, senderFrame: mainFrame } as unknown as IpcMainInvokeEvent,
    removeRecent: () => { snapshot = { ...snapshot, projects: [] } } }
}
beforeEach(() => { fake.templates.length = 0; fake.popups.length = 0; fake.handlers.clear(); vi.clearAllMocks() })

describe('strict application menu contracts', () => {
  it('bounds menu coordinates, nested fields, revisions, flags and appearance', () => {
    expect(parseShowApplicationMenu({ menu: 'compact', anchor: { x: -10.5, y: 20 } })).toEqual({ menu: 'compact', anchor: { x: -10.5, y: 20 } })
    for (const value of [null, {}, { menu: 'shell', anchor: { x: 0, y: 0 } }, { menu: 'file', anchor: { x: NaN, y: 0 } },
      { menu: 'file', anchor: { x: Infinity, y: 0 } }, { menu: 'file', anchor: { x: 100_001, y: 0 } },
      { menu: 'file', anchor: { x: 0, y: 0, path: '/private' } }, { menu: 'file', anchor: { x: 0, y: 0 }, role: 'quit' }]) expect(() => parseShowApplicationMenu(value)).toThrow()
    expect(parseApplicationMenuState(ready)).toEqual(ready)
    for (const value of [{ ...ready, revision: 0 }, { ...ready, revision: 1.5 }, { ...ready, revision: Infinity },
      { ...ready, revision: Number.MAX_SAFE_INTEGER + 1 }, { ...ready, canGoBack: 1 }, { ...ready, navigationPending: undefined }, { ...ready, projectHandle: 'profile-handle' }]) expect(() => parseApplicationMenuState(value)).toThrow()
    expect(parseWindowAppearance({ mode: 'dark' })).toEqual({ mode: 'dark' })
    for (const value of [{ mode: 'system' }, { mode: 'light', color: '#fff' }, undefined]) expect(() => parseWindowAppearance(value)).toThrow()
  })
  it('accepts only fixed commands and known-shape profile handles', () => {
    expect(parseApplicationCommand({ command: 'select-recent-project', revision: 1, projectHandle: 'profile-handle' })).toEqual({ command: 'select-recent-project', revision: 1, projectHandle: 'profile-handle' })
    for (const value of [{ command: 'quit', revision: 1 }, { command: 'go-back', revision: 1, projectHandle: 'x' },
      { command: 'go-back', revision: 0 }, { command: 'go-back', revision: 1, event: {} },
      { command: 'select-recent-project', revision: 1 }, { command: 'select-recent-project', revision: 1, projectHandle: '../path' }]) expect(() => parseApplicationCommand(value)).toThrow()
  })
})
describe('native templates and lifecycle', () => {
  it('keeps native editing, zoom and window roles with app accelerators as labels only', () => {
    const f = fixture(); f.menus.setState(ready)
    const items = flatten(fake.templates.at(-1)!)
    expect(items.filter(item => item.role).map(item => item.role)).toEqual(expect.arrayContaining(['close', 'undo', 'redo', 'cut', 'copy', 'paste', 'selectAll', 'zoomIn', 'zoomOut', 'resetZoom', 'togglefullscreen']))
    expect(items.filter(item => item.accelerator).every(item => item.registerAccelerator === false)).toBe(true)
    expect(items.find(item => item.id === 'recent:profile-handle')?.label).toBe('A && B')
    expect(items.find(item => item.id === 'go-forward')?.enabled).toBe(false)
    activate(items.find(item => item.id === 'open-project')!)
    expect(f.send).toHaveBeenCalledWith(applicationMenuChannels.command, { command: 'open-project', revision: 1 })
  })
  it('uses macOS application, services, quit and window conventions', () => {
    const context = { platform: 'darwin' as const, state: ready, workspace: { projects: [{ id: 'arts', name: 'Arts & Design', folderPath: '/private', lastOpenedAt: '', availability: 'available' as const, hasOutline: false }], activeProject: null, issue: null }, emit: vi.fn(), about: vi.fn() }
    const template = systemMenuTemplate(context), items = flatten(template)
    expect(template.map(item => item.label ?? item.role)).toEqual(['Learning Studio', 'File', 'Edit', 'View', 'windowMenu', 'Help'])
    expect(items.filter(item => item.role).map(item => item.role)).toEqual(expect.arrayContaining(['services', 'hide', 'hideOthers', 'unhide', 'quit']))
    expect(items.find(item => item.id === 'go-back')?.label).toBe('Back   ⌘[')
    expect(items.filter(item => item.accelerator)).toEqual([])
    expect(items.find(item => item.id === 'recent:arts')?.label).toBe('Arts & Design')
    const linuxItems = flatten(applicationMenuTemplate('compact', { ...context, platform: 'linux' }))
    expect(linuxItems.find(item => item.id === 'go-back')).toMatchObject({ accelerator: 'Alt+Left', registerAccelerator: false })
    expect(linuxItems.find(item => item.id === 'recent:arts')?.label).toBe('Arts && Design')
    context.workspace.projects[0]!.name = 'x'.repeat(239) + '&'
    expect(flatten(applicationMenuTemplate('file', { ...context, platform: 'win32' })).find(item => item.id === 'recent:arts')?.label).toBe('x'.repeat(239) + '&&')
    expect(flatten(applicationMenuTemplate('file', context)).find(item => item.id === 'recent:arts')?.label).toBe('x'.repeat(239) + '&')
    for (const menu of ['file', 'edit', 'view', 'help', 'compact'] as const) expect(applicationMenuTemplate(menu, context).length).toBeGreaterThan(0)
  })
  it('derives live availability and membership without trusting stale templates or revisions', () => {
    const f = fixture()
    expect(flatten(fake.templates.at(-1)!).find(item => item.id === 'open-project')?.enabled).toBe(false)
    f.menus.setState(ready)
    const stale = flatten(fake.templates.at(-1)!)
    expect(f.menus.setState({ ...ready, revision: 3, navigationPending: true })).toEqual({ revision: 3 })
    expect(f.menus.setState({ ...ready, revision: 2 })).toEqual({ revision: 3 })
    activate(stale.find(item => item.id === 'open-project')!)
    expect(f.send).not.toHaveBeenCalled()
    activate(stale.find(item => item.id === 'show-appearance')!)
    expect(f.send).toHaveBeenLastCalledWith(applicationMenuChannels.command, { command: 'show-appearance', revision: 3 })
    f.menus.setState({ ...ready, revision: 4 }); f.removeRecent(); f.send.mockClear()
    activate(stale.find(item => item.id === 'recent:profile-handle')!)
    expect(f.send).not.toHaveBeenCalled()
  })
  it('converts zoomed anchors, rejects overlapping popups and resolves dismissal once', async () => {
    const f = fixture()
    const result = f.menus.show({ menu: 'edit', anchor: { x: 20.5, y: 300 } })
    expect(fake.popups[0]).toMatchObject({ window: f.window, x: 41, y: 479 })
    expect(() => f.menus.show({ menu: 'view', anchor: { x: 0, y: 0 } })).toThrow('already open')
    fake.popups[0]!.callback!()
    await expect(result).resolves.toEqual({ closed: true })
    fake.popups[0]!.callback!()
    expect(popupAnchor({ x: -4, y: 5 }, [600, 480], 2)).toEqual({ x: 0, y: 10 })
  })
  it('settles popup ownership and disables commands on reload and close', async () => {
    const f = fixture(); f.menus.setState(ready)
    const pending = f.menus.show({ menu: 'view', anchor: { x: 10, y: 10 } })
    f.callbacks.get('did-start-navigation')!({ isMainFrame: true, isSameDocument: false })
    await expect(pending).resolves.toEqual({ closed: true })
    expect(fake.close).toHaveBeenCalledOnce()
    expect(flatten(fake.templates.at(-1)!).find(item => item.id === 'go-back')?.enabled).toBe(false)
    f.menus.setState(ready)
    const next = f.menus.show({ menu: 'view', anchor: { x: 10, y: 10 } })
    f.callbacks.get('closed')!()
    await expect(next).resolves.toEqual({ closed: true })
  })
  it('preserves readiness and popup ownership through same-document or child-frame navigation', async () => {
    const f = fixture(); f.menus.setState(ready)
    const pending = f.menus.show({ menu: 'view', anchor: { x: 10, y: 10 } })
    f.callbacks.get('did-start-navigation')!({ isMainFrame: true, isSameDocument: true })
    f.callbacks.get('did-start-navigation')!({ isMainFrame: false, isSameDocument: false })
    expect(fake.close).not.toHaveBeenCalled()
    expect(flatten(fake.templates.at(-1)!).find(item => item.id === 'go-back')?.enabled).toBe(true)
    fake.popups[0]!.callback!()
    await expect(pending).resolves.toEqual({ closed: true })
  })
  it('keeps fixed native overlay options and tolerates unavailable presentation updates', () => {
    const f = fixture()
    expect(integratedChromeOptions('win32', 'dark')).toEqual({ titleBarStyle: 'hidden', titleBarOverlay: { color: '#1c2424', symbolColor: '#f3f3f3', height: 40 } })
    expect(integratedChromeOptions('darwin', 'light')).toEqual({ titleBarStyle: 'hidden' })
    expect(applyWindowAppearance(f.window, 'light')).toBe(false)
    expect(f.overlay).toHaveBeenCalledWith({ color: '#eaf4f5', symbolColor: '#222426', height: 40 })
  })
  it('authorizes every actual registered capability before parsing or changing menu state', async () => {
    const f = fixture(); registerApplicationMenuHandlers(f.menus, () => f.window, appOrigin)
    for (const channel of Object.values(applicationMenuChannels).filter(channel => channel !== applicationMenuChannels.command)) {
      const handler = fake.handlers.get(channel)!
      for (const hostile of [{ ...f.event, sender: {} }, { ...f.event, senderFrame: { origin: appOrigin, url: `${appOrigin}/index.html` } },
        { ...f.event, senderFrame: { origin: 'https://evil.example', url: `${appOrigin}/index.html` } }]) await expect(handler(hostile as IpcMainInvokeEvent, {})).resolves.toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
      await expect(handler(f.event, { unexpected: true })).resolves.toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
    }
    await expect(fake.handlers.get(applicationMenuChannels.state)!(f.event, ready)).resolves.toEqual({ ok: true, data: { revision: 1 } })
  })
})
