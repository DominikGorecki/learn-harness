import { app, BrowserWindow, protocol, session } from 'electron'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { createLearningService } from '../core/learning/service'
import { createMemorySessionRepository } from './adapters/memory-session-repository'
import { registerLearningHandlers } from './ipc/handlers'
import { appEntry, appOrigin, developmentOrigin } from './security/policy'
import { registerRendererProtocol } from './security/protocol'

protocol.registerSchemesAsPrivileged([
  { scheme: 'learningapp', privileges: { standard: true, secure: true, supportFetchAPI: true } }
])
app.setName('Learning Studio')
// Automation uses an isolated writable profile, never an existing learner profile.
if (!app.isPackaged && process.env.EDU_HARNESS_TEST_DATA_DIR) {
  app.setPath('userData', process.env.EDU_HARNESS_TEST_DATA_DIR)
}

let mainWindow: BrowserWindow | null = null
const developmentUrl = !app.isPackaged ? process.env.ELECTRON_RENDERER_URL : undefined
if (developmentUrl && new URL(developmentUrl).origin !== developmentOrigin) {
  throw new Error('The development renderer must use the configured loopback origin.')
}
const expectedOrigin = developmentUrl ? developmentOrigin : appOrigin

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280, height: 840, minWidth: 900, minHeight: 640,
    title: 'Learning Studio', backgroundColor: '#faf9f6', show: false,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      partition: 'edu-harness', contextIsolation: true, sandbox: true,
      nodeIntegration: false, webSecurity: true, webviewTag: false
    }
  })
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => { mainWindow = null })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', event => event.preventDefault())
  mainWindow.webContents.on('will-redirect', event => event.preventDefault())
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault())
  await mainWindow.loadURL(developmentUrl ?? appEntry)
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore()
    mainWindow?.focus()
  })
  app.whenReady().then(async () => {
    const rendererSession = session.fromPartition('edu-harness')
    rendererSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    rendererSession.setPermissionCheckHandler(() => false)
    registerRendererProtocol(rendererSession, join(import.meta.dirname, '../renderer'))
    const learning = createLearningService({
      sessions: createMemorySessionRepository(), createId: randomUUID, now: () => new Date().toISOString()
    })
    registerLearningHandlers(learning, () => mainWindow, expectedOrigin)
    await createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow().catch(() => app.quit())
    })
  }).catch(() => {
    console.error('Learning Studio could not start.')
    app.quit()
  })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
}
