import type { MenuItemConstructorOptions } from 'electron'
import type { ApplicationCommand, ApplicationMenu, ApplicationMenuState } from '../../shared/application-menu'
import type { WorkspaceSnapshot } from '../../shared/workspace'

export interface MenuTemplateContext {
  platform: NodeJS.Platform; state: ApplicationMenuState | null; workspace: WorkspaceSnapshot
  emit(command: ApplicationCommand): void; about(): void
}
export function menuCommandEnabled(command: ApplicationCommand['command'], state: ApplicationMenuState | null): boolean {
  if (!state) return false
  if (command === 'toggle-sidebar' || command === 'show-appearance') return true
  if (state.navigationPending) return false
  return command === 'go-back' ? state.canGoBack : command === 'go-forward' ? state.canGoForward : true
}
export function applicationMenuTemplate(menu: ApplicationMenu, context: MenuTemplateContext): MenuItemConstructorOptions[] {
  const { platform, state, workspace, emit, about } = context
  const macShortcut: Partial<Record<ApplicationCommand['command'], string>> = {
    'open-project': '⌘O', 'go-back': '⌘[', 'go-forward': '⌘]', 'toggle-sidebar': '⌘B', 'show-appearance': '⌘,'
  }
  const projectLabel = (name: string): string => {
    const label = Array.from(name, character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? ' ' : character).join('').slice(0, 240)
    return platform === 'darwin' ? label : label.replaceAll('&', '&&')
  }
  // Electron 44 registerAccelerator:false is Windows/Linux-only. macOS app
  // shortcuts are label text, leaving scoped keyboard execution to the renderer.
  const appItem = (command: ApplicationCommand['command'], label: string, accelerator?: string, projectHandle?: string): MenuItemConstructorOptions => ({
    id: projectHandle ? `recent:${projectHandle}` : command,
    label: platform === 'darwin' && macShortcut[command] ? `${label}   ${macShortcut[command]}` : label,
    enabled: menuCommandEnabled(command, state),
    ...(accelerator && platform !== 'darwin' ? { accelerator, registerAccelerator: false } : {}),
    ...(command === 'toggle-sidebar' ? { type: 'checkbox', checked: state?.sidebarVisible ?? false } : {}),
    click: () => {
      if (!state) return
      emit(command === 'select-recent-project' ? { command, projectHandle: projectHandle!, revision: state.revision } : { command, revision: state.revision })
    }
  })
  const file: MenuItemConstructorOptions[] = [appItem('open-project', 'Open project…', 'CommandOrControl+O'),
    { label: 'Recent projects', submenu: workspace.projects.length ? workspace.projects.slice(0, 100).map(project =>
      appItem('select-recent-project', projectLabel(project.name), undefined, project.id)) :
      [{ label: 'No recent projects', enabled: false }] }, { type: 'separator' }, { role: 'close', label: 'Close window' }]
  const edit: MenuItemConstructorOptions[] = [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' },
    { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { type: 'separator' }, { role: 'selectAll' }]
  const view: MenuItemConstructorOptions[] = [appItem('go-back', 'Back', platform === 'darwin' ? 'Command+[' : 'Alt+Left'),
    appItem('go-forward', 'Forward', platform === 'darwin' ? 'Command+]' : 'Alt+Right'), { type: 'separator' },
    appItem('toggle-sidebar', 'Toggle sidebar', 'CommandOrControl+B'), appItem('show-appearance', 'Appearance…', 'CommandOrControl+,'),
    { type: 'separator' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }, { type: 'separator' }, { role: 'togglefullscreen' }]
  const help: MenuItemConstructorOptions[] = [{ id: 'about-learning-studio', label: 'About Learning Studio', click: about }]
  switch (menu) {
    case 'file': return file
    case 'edit': return edit
    case 'view': return view
    case 'help': return help
    case 'compact': return [{ label: 'File', submenu: file }, { label: 'Edit', submenu: edit }, { label: 'View', submenu: view }, { label: 'Help', submenu: help }]
  }
}
export function systemMenuTemplate(context: MenuTemplateContext): MenuItemConstructorOptions[] {
  const menus = applicationMenuTemplate('compact', context)
  if (context.platform !== 'darwin') return menus
  return [{ label: 'Learning Studio', submenu: [{ label: 'About Learning Studio', click: context.about }, { type: 'separator' },
    { label: 'Settings…   ⌘,', enabled: Boolean(context.state),
      click: () => { if (context.state) context.emit({ command: 'show-appearance', revision: context.state.revision }) } },
    { type: 'separator' }, { role: 'services' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
    { type: 'separator' }, { role: 'quit' }] }, ...menus.slice(0, 3), { role: 'windowMenu' }, menus[3]!]
}
