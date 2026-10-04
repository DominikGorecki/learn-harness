import { app, BrowserWindow, clipboard, protocol, safeStorage, session, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { appEntry, appOrigin, developmentOrigin } from './security/policy'
import { registerRendererProtocol } from './security/protocol'
import { AccountService } from './auth/account-service'
import { createChatGPTProvider } from './auth/chatgpt-provider'
import { createCredentialStore } from './auth/credential-store'
import { registerAccountHandlers } from './ipc/account-handlers'
import { providerEnvironment } from './auth/provider-environment'
import { WorkspaceService } from '../core/workspace/service'
import { createProjectRegistry } from './storage/project-registry'
import { createProjectStorage } from './storage/project-storage'
import { registerWorkspaceHandlers } from './ipc/workspace-handlers'
import { GenerationService } from '../core/generation/service'
import { registerGenerationHandlers } from './ipc/generation-handlers'
import { runOutlineWorker } from './generation/worker-client'

protocol.registerSchemesAsPrivileged([
  { scheme: 'learningapp', privileges: { standard: true, secure: true, supportFetchAPI: true } }
])
app.setName('Learning Studio')
// Automation uses an isolated writable profile, never an existing learner profile.
if (!app.isPackaged && process.env.EDU_HARNESS_TEST_DATA_DIR) {
  app.setPath('userData', process.env.EDU_HARNESS_TEST_DATA_DIR)
}

let mainWindow: BrowserWindow | null = null
let account: AccountService | null = null
let generation: GenerationService | null = null
const developmentUrl = !app.isPackaged ? process.env.ELECTRON_RENDERER_URL : undefined
if (developmentUrl && new URL(developmentUrl).origin !== developmentOrigin) {
  throw new Error('The development renderer must use the configured loopback origin.')
}
const expectedOrigin = developmentUrl ? developmentOrigin : appOrigin

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280, height: 840, minWidth: 600, minHeight: 480,
    title: 'Learning Studio', backgroundColor: '#ffffff', show: false,
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
    const providerEndpoints = providerEnvironment({ packaged: app.isPackaged,
      testProfile: process.env.EDU_HARNESS_TEST_DATA_DIR, fixtureOrigin: process.env.EDU_HARNESS_TEST_PROVIDER_URL })
    account = new AccountService({
      provider: createChatGPTProvider({ endpoints: providerEndpoints }),
      store: createCredentialStore(join(app.getPath('userData'), 'connection'), {
        available: () => safeStorage.isEncryptionAvailable() && (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text'),
        encrypt: value => safeStorage.encryptString(value),
        decrypt: value => safeStorage.decryptString(Buffer.from(value))
      }),
      copyToClipboard: async value => { await clipboard.writeText(value) },
      openBrowser: async value => {
        const url = new URL(value)
        const allowed = new URL(providerEndpoints.authorize)
        if (url.origin !== allowed.origin || url.pathname !== allowed.pathname || url.username || url.password) throw new Error('Invalid authorization destination')
        await shell.openExternal(url.toString())
      }
    })
    registerAccountHandlers(account, () => mainWindow, expectedOrigin)
    const workspace = new WorkspaceService({
      registry: createProjectRegistry(app.getPath('userData')), storage: createProjectStorage(),
      models: () => { const snapshot = account?.get(); return snapshot?.status === 'connected' && snapshot.modelsStatus === 'ready' ? snapshot.models : [] },
      createId: randomUUID, now: () => new Date().toISOString()
    })
    await workspace.initialize()
    registerWorkspaceHandlers(workspace, () => mainWindow, expectedOrigin)
    generation = new GenerationService({
      workspace, createId: randomUUID, now: () => new Date().toISOString(),
      onBusy: busy => account!.setInferenceBusy(busy), onAccountFailure: error => account!.recordFailure(error),
      generate: async (input, signal, onPhase) => {
        const authorized = await account!.authorizeModel(input.model.id)
        signal.throwIfAborted()
        return runOutlineWorker({ model: authorized.model, accessToken: authorized.accessToken, baseUrl: providerEndpoints.resource, brief: input.brief, path: input.path }, { signal, onPhase })
      }
    })
    registerGenerationHandlers(generation, () => mainWindow, expectedOrigin)
    await createWindow()
    void account.initialize()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow().catch(() => app.quit())
    })
  }).catch(() => {
    console.error('Learning Studio could not start.')
    app.quit()
  })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
  app.on('before-quit', () => { generation?.dispose(); account?.dispose() })
}
