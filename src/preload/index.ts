import { contextBridge, ipcRenderer } from 'electron'
import { channels } from '../shared/contracts'
import type { LearningApi } from '../shared/contracts'
import { accountChannels } from '../shared/account'
import type { AccountApi, AccountSnapshot } from '../shared/account'

const learning: LearningApi & AccountApi = {
  listCourses: () => ipcRenderer.invoke(channels.listCourses),
  listSessions: () => ipcRenderer.invoke(channels.listSessions),
  startSession: request => ipcRenderer.invoke(channels.startSession, request),
  submitAnswer: request => ipcRenderer.invoke(channels.submitAnswer, request),
  getAccount: () => ipcRenderer.invoke(accountChannels.get),
  connectAccount: () => ipcRenderer.invoke(accountChannels.connect),
  cancelAccountConnection: () => ipcRenderer.invoke(accountChannels.cancel),
  reopenAccountBrowser: () => ipcRenderer.invoke(accountChannels.reopen),
  refreshModels: () => ipcRenderer.invoke(accountChannels.models),
  disconnectAccount: () => ipcRenderer.invoke(accountChannels.disconnect),
  onAccountChanged: listener => {
    const receive = (_event: unknown, snapshot: AccountSnapshot) => listener(snapshot)
    ipcRenderer.on(accountChannels.changed, receive)
    return () => { ipcRenderer.removeListener(accountChannels.changed, receive) }
  }
}

contextBridge.exposeInMainWorld('learning', learning)
