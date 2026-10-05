import type { BrowserWindow } from 'electron'
import type { GenerationService } from '../../core/generation/service'
import { generationChannels, parseRunRequest, parseSaveOutline, parseStartOutline, parseRewriteOutline } from '../../shared/generation'
import { noPayload, registerCapability } from './capability'

export function registerGenerationHandlers(service: GenerationService, currentWindow: () => BrowserWindow | null, expectedOrigin: string): () => void {
  const handle = <T>(channel: string, action: (payload: unknown) => T | Promise<T>) => registerCapability(channel, action, currentWindow, expectedOrigin)
  handle(generationChannels.get, payload => { noPayload(payload); return service.get() })
  handle(generationChannels.start, payload => service.start(parseStartOutline(payload)))
  handle(generationChannels.rewrite, payload => service.rewrite(parseRewriteOutline(payload)))
  handle(generationChannels.cancel, payload => service.cancel(parseRunRequest(payload)))
  handle(generationChannels.save, payload => service.retrySave(parseSaveOutline(payload)))
  return service.subscribe(snapshot => {
    const window = currentWindow()
    if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) window.webContents.send(generationChannels.changed, snapshot)
  })
}
