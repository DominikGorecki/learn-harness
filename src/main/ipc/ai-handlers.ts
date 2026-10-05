import type { BrowserWindow } from 'electron'
import type { AiCoordinator } from '../../core/ai/coordinator'
import { aiChannels, parseCancelAiOperation } from '../../shared/ai/activity'
import { noPayload, registerCapability } from './capability'

export function registerAiHandlers(coordinator: AiCoordinator, currentWindow: () => BrowserWindow | null, expectedOrigin: string): () => void {
  registerCapability(aiChannels.get, payload => { noPayload(payload); return coordinator.get() }, currentWindow, expectedOrigin)
  registerCapability(aiChannels.cancel, payload => coordinator.cancel(parseCancelAiOperation(payload)), currentWindow, expectedOrigin)
  return coordinator.subscribe(snapshot => {
    const window = currentWindow()
    if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) window.webContents.send(aiChannels.changed, snapshot)
  })
}
