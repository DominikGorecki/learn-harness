import { contextBridge, ipcRenderer } from 'electron'
import { accountChannels } from '../shared/account'
import type { AccountApi, AccountSnapshot } from '../shared/account'
import { workspaceChannels } from '../shared/workspace'
import type { WorkspaceApi, WorkspaceSnapshot } from '../shared/workspace'
import { generationChannels } from '../shared/generation'
import type { GenerationApi, GenerationSnapshot } from '../shared/generation'
import { aiChannels } from '../shared/ai/activity'
import type { AiApi, AiActivitySnapshot } from '../shared/ai/activity'
import { rendererDiagnosticChannel, rendererDiagnosticMessage, safeLogData } from '../shared/diagnostics'
import { applicationMenuChannels, parseApplicationCommand } from '../shared/application-menu'
import type { ApplicationMenuApi } from '../shared/application-menu'
import { topicContentChannels, parseTopicContentSnapshot } from '../shared/topic-content'
import type { TopicChapterApi } from '../shared/topic-content'
import { openRouterChannels, parseOpenRouterSettings } from '../shared/openrouter'
import type { OpenRouterApi } from '../shared/openrouter'

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

const learning: AccountApi & WorkspaceApi & GenerationApi & AiApi & ApplicationMenuApi & TopicChapterApi & OpenRouterApi = {
  getTopicContentState: request => ipcRenderer.invoke(topicContentChannels.state, request),
  getTopicContent: request => ipcRenderer.invoke(topicContentChannels.get, request),
  generateTopicContent: request => ipcRenderer.invoke(topicContentChannels.generate, request),
  continueTopicContent: request => ipcRenderer.invoke(topicContentChannels.continue, request),
  discardTopicContentProgress: request => ipcRenderer.invoke(topicContentChannels.discard, request),
  retryTopicContentSave: request => ipcRenderer.invoke(topicContentChannels.retrySave, request),
  completeTopicContentImages: request => ipcRenderer.invoke(topicContentChannels.completeImages, request),
  retryTopicContentImage: request => ipcRenderer.invoke(topicContentChannels.retryImage, request),
  generateTopicImageReplacement: request => ipcRenderer.invoke(topicContentChannels.replacement, request),
  acceptTopicImageReplacement: request => ipcRenderer.invoke(topicContentChannels.acceptReplacement, request),
  discardTopicImageReplacement: request => ipcRenderer.invoke(topicContentChannels.discardReplacement, request),
  retryTopicImageReplacementSave: request => ipcRenderer.invoke(topicContentChannels.retryReplacementSave, request),
  onTopicContentChanged: listener => {
    const receive = (_event: unknown, value: unknown) => { try { listener(parseTopicContentSnapshot(value)) } catch { /* Reject malformed public frames. */ } }
    ipcRenderer.on(topicContentChannels.changed, receive)
    return () => { ipcRenderer.removeListener(topicContentChannels.changed, receive) }
  },
  getOpenRouterSettings: () => ipcRenderer.invoke(openRouterChannels.settings),
  saveOpenRouterKey: request => ipcRenderer.invoke(openRouterChannels.saveKey, request),
  removeOpenRouterKey: () => ipcRenderer.invoke(openRouterChannels.removeKey),
  setOpenRouterImageModel: request => ipcRenderer.invoke(openRouterChannels.model, request),
  refreshOpenRouterMetadata: () => ipcRenderer.invoke(openRouterChannels.refresh),
  listOpenRouterCalls: request => ipcRenderer.invoke(openRouterChannels.list, request),
  getOpenRouterCall: request => ipcRenderer.invoke(openRouterChannels.call, request),
  reconcileOpenRouterCall: request => ipcRenderer.invoke(openRouterChannels.reconcile, request),
  getTopicImageConfiguration: request => ipcRenderer.invoke(openRouterChannels.quote, request),
  onOpenRouterChanged: listener => {
    const receive = (_event: unknown, value: unknown) => { try { listener(parseOpenRouterSettings(value)) } catch { /* Reject malformed public frames. */ } }
    ipcRenderer.on(openRouterChannels.changed, receive)
    return () => { ipcRenderer.removeListener(openRouterChannels.changed, receive) }
  },
  showApplicationMenu: request => ipcRenderer.invoke(applicationMenuChannels.show, request),
  setApplicationMenuState: request => ipcRenderer.invoke(applicationMenuChannels.state, request),
  setWindowAppearance: request => ipcRenderer.invoke(applicationMenuChannels.appearance, request),
  onApplicationCommand: listener => {
    const receive = (_event: unknown, value: unknown) => {
      let command
      try { command = parseApplicationCommand(value) } catch { return }
      listener(command)
    }
    ipcRenderer.on(applicationMenuChannels.command, receive)
    return () => { ipcRenderer.removeListener(applicationMenuChannels.command, receive) }
  },
  getAiActivity: () => ipcRenderer.invoke(aiChannels.get),
  cancelAiOperation: request => ipcRenderer.invoke(aiChannels.cancel, request),
  onAiActivityChanged: listener => {
    const receive = (_event: unknown, snapshot: AiActivitySnapshot) => listener(snapshot)
    ipcRenderer.on(aiChannels.changed, receive)
    return () => { ipcRenderer.removeListener(aiChannels.changed, receive) }
  },
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
