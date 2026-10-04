import { dialog } from 'electron'
import type { BrowserWindow } from 'electron'
import type { WorkspaceService } from '../../core/workspace/service'
import { parseBriefRequest, parseModelRequest, parseProjectRequest, workspaceChannels } from '../../shared/workspace'
import { noPayload, registerCapability } from './capability'

export function registerWorkspaceHandlers(workspace: WorkspaceService, currentWindow: () => BrowserWindow | null, expectedOrigin: string): () => void {
  const choose = async () => {
    const window = currentWindow()
    if (!window || window.isDestroyed()) return null
    const result = await dialog.showOpenDialog(window, {
      title: 'Open a learning project', buttonLabel: 'Open project', properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : result.filePaths[0] ?? null
  }
  const handle = <T>(channel: string, action: (payload: unknown) => T | Promise<T>) => registerCapability(channel, action, currentWindow, expectedOrigin)
  handle(workspaceChannels.get, payload => { noPayload(payload); return workspace.get() })
  handle(workspaceChannels.open, async payload => {
    noPayload(payload)
    const path = await choose()
    return path ? workspace.open(path) : workspace.get()
  })
  handle(workspaceChannels.select, payload => workspace.select(parseProjectRequest(payload).projectId))
  handle(workspaceChannels.locate, async payload => {
    const { projectId } = parseProjectRequest(payload)
    const path = await choose()
    return path ? workspace.locate(projectId, path) : workspace.get()
  })
  handle(workspaceChannels.dashboard, payload => { noPayload(payload); return workspace.dashboard() })
  handle(workspaceChannels.model, payload => {
    const { projectId, modelId } = parseModelRequest(payload)
    return workspace.setModel(projectId, modelId)
  })
  handle(workspaceChannels.brief, payload => {
    const { projectId, brief } = parseBriefRequest(payload)
    return workspace.saveBrief(projectId, brief)
  })
  return workspace.subscribe(snapshot => {
    const window = currentWindow()
    if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) window.webContents.send(workspaceChannels.changed, snapshot)
  })
}
