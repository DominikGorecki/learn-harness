import type { BrowserWindow } from 'electron'
import type { OpenRouterService } from '../openrouter/service'
import { openRouterChannels, parseListOpenRouterCalls, parseSaveOpenRouterKey, parseSetOpenRouterImageModel, parseTopicImageConfigurationRequest } from '../../shared/openrouter'
import { identifier, strictRecord } from '../../shared/validation'
import { noPayload, registerCapability } from './capability'
export function registerOpenRouterHandlers(service: OpenRouterService, currentWindow: () => BrowserWindow | null, origin: string): () => void {
  const handle = <T>(channel: string, action: (payload: unknown) => T | Promise<T>) => registerCapability(channel, action, currentWindow, origin)
  handle(openRouterChannels.settings, value => { noPayload(value); return service.getSettings() })
  handle(openRouterChannels.saveKey, value => service.saveKey(parseSaveOpenRouterKey(value)))
  handle(openRouterChannels.removeKey, value => { noPayload(value); return service.removeKey() })
  handle(openRouterChannels.model, value => service.setImageModel(parseSetOpenRouterImageModel(value)))
  handle(openRouterChannels.refresh, value => { noPayload(value); return service.refreshMetadata() })
  handle(openRouterChannels.list, value => service.listCalls(parseListOpenRouterCalls(value)))
  handle(openRouterChannels.call, value => service.getCall(identifier(strictRecord(value, ['callId']).callId)))
  handle(openRouterChannels.reconcile, async value => { const callId = identifier(strictRecord(value, ['callId']).callId); await service.reconcile(callId); return service.getCall(callId) })
  handle(openRouterChannels.quote, value => { const request = parseTopicImageConfigurationRequest(value); return service.getImageConfiguration(request.imageCount, request.settings) })
  return service.subscribe(snapshot => { const window = currentWindow(); if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) window.webContents.send(openRouterChannels.changed, snapshot) })
}
