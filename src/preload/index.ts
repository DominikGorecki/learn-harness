import { contextBridge, ipcRenderer } from 'electron'
import { accountChannels } from '../shared/account'
import type { AccountApi, AccountSnapshot } from '../shared/account'
import { workspaceChannels } from '../shared/workspace'
import type { WorkspaceApi, WorkspaceSnapshot } from '../shared/workspace'
import { generationChannels } from '../shared/generation'
import type { GenerationApi, GenerationSnapshot } from '../shared/generation'
import { rendererDiagnosticChannel, rendererDiagnosticMessage, safeLogData } from '../shared/diagnostics'

// Automatic failure telemetry carries no messages, URLs, promises or material.
const diagnosticWindow = globalThis as unknown as {
  location: { origin: string }
  addEventListener(type: string, listener: (event: { source: unknown; origin: string; data: unknown }) => void): void
}
let diagnosticCount = 0, diagnosticInterval = Date.now()
diagnosticWindow.addEventListener('message', event => {
  if (event.source !== diagnosticWindow || event.origin !== diagnosticWindow.location.origin) return
  if (!event.data || typeof event.data !== 'object') return
  const data = event.data as Record<string, unknown>
  if (data.type !== rendererDiagnosticMessage || (data.event !== 'renderer.error' && data.event !== 'renderer.rejection')) return
  if (Date.now() - diagnosticInterval >= 1000) { diagnosticCount = 0; diagnosticInterval = Date.now() }
  if (++diagnosticCount > 100) return
  ipcRenderer.send(rendererDiagnosticChannel, { event: data.event,
    ...safeLogData({ errorType: data.errorType, line: data.line, column: data.column }) })
})

const learning: AccountApi & WorkspaceApi & GenerationApi = {
  getAccount: () => ipcRenderer.invoke(accountChannels.get),
  connectAccount: () => ipcRenderer.invoke(accountChannels.connect),
  cancelAccountConnection: () => ipcRenderer.invoke(accountChannels.cancel),
  reopenAccountBrowser: () => ipcRenderer.invoke(accountChannels.reopen),
  copyAccountSignInLink: () => ipcRenderer.invoke(accountChannels.copyLink),
  refreshModels: () => ipcRenderer.invoke(accountChannels.models),
  testSolModel: () => ipcRenderer.invoke(accountChannels.testSol),
  testLunaModel: () => ipcRenderer.invoke(accountChannels.testLuna),
  cancelModelTest: () => ipcRenderer.invoke(accountChannels.cancelTest),
  disconnectAccount: () => ipcRenderer.invoke(accountChannels.disconnect),
  onAccountChanged: listener => {
    const receive = (_event: unknown, snapshot: AccountSnapshot) => listener(snapshot)
    ipcRenderer.on(accountChannels.changed, receive)
    return () => { ipcRenderer.removeListener(accountChannels.changed, receive) }
  },
  getWorkspace: () => ipcRenderer.invoke(workspaceChannels.get),
  openProject: () => ipcRenderer.invoke(workspaceChannels.open),
  selectProject: request => ipcRenderer.invoke(workspaceChannels.select, request),
  locateProject: request => ipcRenderer.invoke(workspaceChannels.locate, request),
  showDashboard: () => ipcRenderer.invoke(workspaceChannels.dashboard),
  setProjectModel: request => ipcRenderer.invoke(workspaceChannels.model, request),
  saveProjectBrief: request => ipcRenderer.invoke(workspaceChannels.brief, request),
  getGeneration: () => ipcRenderer.invoke(generationChannels.get),
  createOutline: request => ipcRenderer.invoke(generationChannels.start, request),
  rewriteOutline: request => ipcRenderer.invoke(generationChannels.rewrite, request),
  rewriteTopic: request => ipcRenderer.invoke(generationChannels.rewriteTopic, request),
  cancelOutline: request => ipcRenderer.invoke(generationChannels.cancel, request),
  retryOutlineSave: request => ipcRenderer.invoke(generationChannels.save, request),
  onGenerationChanged: listener => {
    const receive = (_event: unknown, snapshot: GenerationSnapshot) => listener(snapshot)
    ipcRenderer.on(generationChannels.changed, receive)
    return () => { ipcRenderer.removeListener(generationChannels.changed, receive) }
  },
  onWorkspaceChanged: listener => {
    const receive = (_event: unknown, snapshot: WorkspaceSnapshot) => listener(snapshot)
    ipcRenderer.on(workspaceChannels.changed, receive)
    return () => { ipcRenderer.removeListener(workspaceChannels.changed, receive) }
  }
}

contextBridge.exposeInMainWorld('learning', learning)
