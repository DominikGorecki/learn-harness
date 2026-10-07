import { ApplicationError } from '../../shared/contracts'
import type { createOpenRouterService, ImageProviderLease, PrepareImageCallRequest } from '../openrouter/service'
import type { WorkerRunOptions } from './worker-lifecycle'
import type { DecodedImage } from './image-worker-contract'

/** Discarding a completion run never unpublishes an asset still accepted by its previous manifest. */
export async function recordImageDisposition(service: Pick<ReturnType<typeof createOpenRouterService>, 'getCall' | 'setDisposition'>,
  callId: string, disposition: 'published' | 'discarded'): Promise<void> {
  if (disposition === 'discarded' && service.getCall(callId).latest?.disposition === 'published') return
  await service.setDisposition(callId, disposition)
}

/** Main-only adapter: the worker proposes only the slot, never credentials or options.
 * The caller retains its AI/provider leases until task.result settles after exit and writes.
 */
export function imageWorkerAuthority(options: {
  service: ReturnType<typeof createOpenRouterService>; lease: ImageProviderLease;
  request: PrepareImageCallRequest; prompt: string;
  acceptAsset(image: DecodedImage): Promise<void>
}): Pick<WorkerRunOptions, 'onImageIntent' | 'onImageTerminal' | 'onImageAsset'> {
  let callId: string | null = null
  return {
    async onImageIntent(slot) {
      if (callId || slot !== options.request.imageSlotId) throw new ApplicationError('FORBIDDEN', 'The image slot is not authorized.')
      const approved = await options.service.prepareImageCall(options.lease, options.request)
      callId = approved.callId
      return { callId: approved.callId, imageSlotId: approved.imageSlotId, key: approved.key, connectionEpoch: approved.connectionEpoch, modelId: approved.modelId,
        baseUrl: approved.baseUrl, settings: approved.settings, provider: approved.provider, prompt: options.prompt }
    },
    async onImageTerminal(id, terminal) {
      if (id !== callId) throw new ApplicationError('FORBIDDEN', 'Image billing correlation changed.')
      await options.service.recordTerminal(id, terminal)
    },
    async onImageAsset(image) {
      if (image.callId !== callId || image.imageSlotId !== options.request.imageSlotId) throw new ApplicationError('FORBIDDEN', 'Illustration correlation changed.')
      await options.request.validateOwnership()
      if (options.request.signal.aborted) throw new ApplicationError('CANCELLED', 'Image acceptance cancelled.')
      await options.acceptAsset(image)
      await options.service.setDisposition(image.callId, 'checkpointed')
    }
  }
}
