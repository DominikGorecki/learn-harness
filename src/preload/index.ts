import { contextBridge, ipcRenderer } from 'electron'
import { accountChannels } from '../shared/account'
import type { AccountApi, AccountSnapshot } from '../shared/account'
import { workspaceChannels } from '../shared/workspace'
import type { WorkspaceApi, WorkspaceSnapshot } from '../shared/workspace'

const learning: AccountApi & WorkspaceApi = {
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
  },
  getWorkspace: () => ipcRenderer.invoke(workspaceChannels.get),
  openProject: () => ipcRenderer.invoke(workspaceChannels.open),
  selectProject: request => ipcRenderer.invoke(workspaceChannels.select, request),
  locateProject: request => ipcRenderer.invoke(workspaceChannels.locate, request),
  showDashboard: () => ipcRenderer.invoke(workspaceChannels.dashboard),
  setProjectModel: request => ipcRenderer.invoke(workspaceChannels.model, request),
  saveProjectBrief: request => ipcRenderer.invoke(workspaceChannels.brief, request),
  onWorkspaceChanged: listener => {
    const receive = (_event: unknown, snapshot: WorkspaceSnapshot) => listener(snapshot)
    ipcRenderer.on(workspaceChannels.changed, receive)
    return () => { ipcRenderer.removeListener(workspaceChannels.changed, receive) }
  }
}

contextBridge.exposeInMainWorld('learning', learning)
