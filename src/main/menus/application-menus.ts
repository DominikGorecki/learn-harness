import { app, dialog, Menu } from 'electron'
import type { BrowserWindow } from 'electron'
import type { WorkspaceService } from '../../core/workspace/service'
import { ApplicationError } from '../../shared/contracts'
import type { ApplicationCommand, ApplicationMenuState, ShowApplicationMenuRequest } from '../../shared/application-menu'
import { applicationMenuChannels } from '../../shared/application-menu'
import { applicationMenuTemplate, menuCommandEnabled, systemMenuTemplate } from './templates'
import { popupAnchor } from './chrome'

export class ApplicationMenus {
  private state: ApplicationMenuState | null = null
  private popup: { menu: Menu; finish(): void } | null = null
  constructor(private readonly workspace: WorkspaceService, private readonly currentWindow: () => BrowserWindow | null,
    private readonly platform: NodeJS.Platform = process.platform) {}

  private context() {
    return { platform: this.platform, state: this.state, workspace: this.workspace.get(),
      emit: (command: ApplicationCommand) => this.emit(command), about: () => this.about() }
  }
  refresh(): void { Menu.setApplicationMenu(Menu.buildFromTemplate(systemMenuTemplate(this.context()))) }
  attach(window: BrowserWindow): void {
    this.reset()
    window.webContents.on('did-start-navigation', details => { if (details.isMainFrame && !details.isSameDocument) this.reset() })
    window.once('closed', () => this.reset())
  }
  reset(): void {
    this.state = null
    this.popup?.menu.closePopup()
    this.popup?.finish()
    this.refresh()
  }
  setState(state: ApplicationMenuState): { revision: number } {
    if (!this.state || state.revision > this.state.revision) { this.state = state; this.refresh() }
    return { revision: this.state.revision }
  }
  private emit(command: ApplicationCommand): void {
    const window = this.currentWindow(), state = this.state
    if (!window || window.isDestroyed() || window.webContents.isDestroyed() || !state || !menuCommandEnabled(command.command, state)) return
    if (command.command === 'select-recent-project' && !this.workspace.get().projects.some(project => project.id === command.projectHandle)) return
    // Re-check live availability and stamp the current advisory revision at activation.
    // Old queued events may be discarded by the renderer after a subsequent state update.
    window.webContents.send(applicationMenuChannels.command, { ...command, revision: state.revision })
  }
  private about(): void {
    const window = this.currentWindow()
    if (!window || window.isDestroyed()) return
    void dialog.showMessageBox(window, { type: 'info', title: 'About Learning Studio', message: app.getName(),
      detail: `Version ${app.getVersion()}`, buttons: ['OK'], noLink: true })
  }
  show(request: ShowApplicationMenuRequest): Promise<{ closed: true }> {
    const window = this.currentWindow()
    if (!window || window.isDestroyed() || window.webContents.isDestroyed()) throw new ApplicationError('UNAVAILABLE', 'The application window is unavailable.')
    if (this.popup) throw new ApplicationError('BUSY', 'An application menu is already open.')
    const menu = Menu.buildFromTemplate(applicationMenuTemplate(request.menu, this.context()))
    const position = popupAnchor(request.anchor, window.getContentSize(), window.webContents.getZoomFactor())
    return new Promise((resolve, reject) => {
      const finish = () => {
        if (this.popup?.menu !== menu) return
        this.popup = null
        resolve({ closed: true })
      }
      this.popup = { menu, finish }
      try { menu.popup({ window, frame: window.webContents.mainFrame, ...position, callback: finish }) }
      catch (error) { this.popup = null; reject(error) }
    })
  }
}
