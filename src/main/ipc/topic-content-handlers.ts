import type { BrowserWindow } from 'electron'
import type { TopicContentService } from '../../core/topic-content/service'
import { topicContentChannels, parseTopicContentIdentity, parseGetTopicContent, parseGenerateTopicContent, parseTopicContentRunRequest, parseRetryTopicContentSave, parseCompleteTopicContentImages, parseRetryTopicContentImage, parseGenerateTopicImageReplacement, parseAcceptTopicImageReplacement, parseTopicImageCandidateRequest, parseRetryTopicImageReplacementSave } from '../../shared/topic-content'
import { ApplicationError } from '../../shared/contracts'
import { registerCapability } from './capability'

export function registerTopicContentHandlers(service: TopicContentService, currentWindow: () => BrowserWindow | null, origin: string): () => void {
  const handle = <T>(channel: string, action: (payload: unknown) => T | Promise<T>) => registerCapability(channel, action, currentWindow, origin)
  handle(topicContentChannels.state, value => service.getState(parseTopicContentIdentity(value)))
  handle(topicContentChannels.get, value => service.getContent(parseGetTopicContent(value)))
  handle(topicContentChannels.generate, value => service.generate(parseGenerateTopicContent(value)))
  handle(topicContentChannels.continue, value => service.continue(parseTopicContentRunRequest(value)))
  handle(topicContentChannels.discard, value => service.discard(parseTopicContentRunRequest(value)))
  handle(topicContentChannels.retrySave, value => service.retrySave(parseRetryTopicContentSave(value)))
  handle(topicContentChannels.completeImages, value => service.completeImages(parseCompleteTopicContentImages(value)))
  handle(topicContentChannels.retryImage, value => service.retryImage(parseRetryTopicContentImage(value)))
  const replacement = () => { if (!service.replacement) throw new ApplicationError('UNAVAILABLE', 'Image replacement is unavailable.'); return service.replacement }
  handle(topicContentChannels.replacement, value => replacement().generate(parseGenerateTopicImageReplacement(value)))
  handle(topicContentChannels.acceptReplacement, value => replacement().accept(parseAcceptTopicImageReplacement(value)))
  handle(topicContentChannels.discardReplacement, value => replacement().discard(parseTopicImageCandidateRequest(value)))
  handle(topicContentChannels.retryReplacementSave, value => replacement().retrySave(parseRetryTopicImageReplacementSave(value)))
  return service.subscribe(snapshot => { const window = currentWindow(); if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) window.webContents.send(topicContentChannels.changed, snapshot) })
}
