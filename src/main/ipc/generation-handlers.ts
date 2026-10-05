import type { BrowserWindow } from 'electron'
import type { GenerationService } from '../../core/generation/service'
import { generationChannels, parseRunRequest, parseSaveOutline, parseStartOutline, parseRewriteOutline, parseRewriteTopic } from '../../shared/generation'
import { noPayload, registerCapability } from './capability'
import { logDiagnostic } from '../logging/logger'

export function registerGenerationHandlers(service: GenerationService, currentWindow: () => BrowserWindow | null, expectedOrigin: string): () => void {
  const handle = <T>(channel: string, action: (payload: unknown) => T | Promise<T>) => registerCapability(channel, action, currentWindow, expectedOrigin)
  handle(generationChannels.get, payload => { noPayload(payload); return service.get() })
  handle(generationChannels.start, payload => service.start(parseStartOutline(payload)))
  handle(generationChannels.rewrite, payload => service.rewrite(parseRewriteOutline(payload)))
  handle(generationChannels.rewriteTopic, payload => service.rewriteTopic(parseRewriteTopic(payload)))
  handle(generationChannels.cancel, payload => service.cancel(parseRunRequest(payload)))
  handle(generationChannels.save, payload => service.retrySave(parseSaveOutline(payload)))
  const last = new Map<string, string>()
  return service.subscribe(snapshot => {
    for (const run of snapshot.runs) {
      const state = `${run.status}:${run.errorCode}`
      if (last.get(run.id) === state) continue
      last.set(run.id, state)
      logDiagnostic(run.errorCode ? 'warn' : 'info', 'main', 'generation.changed', {
        runId: run.id, projectId: run.projectId, status: run.status, code: run.errorCode
      })
    }
    for (const id of last.keys()) if (!snapshot.runs.some(run => run.id === id)) last.delete(id)
    const window = currentWindow()
    if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) window.webContents.send(generationChannels.changed, snapshot)
  })
}
