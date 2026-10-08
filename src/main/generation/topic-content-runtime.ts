import { randomUUID } from 'node:crypto'
import { ApplicationError } from '../../shared/contracts'
import type { TopicContentEngine, ChapterImageSession, ReplacementImageSession } from '../../core/topic-content/ports'
import type { TopicContentRepositoryAdapter } from '../storage/topic-content-repository'
import type { AccountService } from '../auth/account-service'
import type { OpenRouterService } from '../openrouter/service'
import type { AiCoordinator } from '../../core/ai/coordinator'
import { runPiWorker } from './worker-client'
import { imageWorkerAuthority, recordImageDisposition } from './image-worker-authority'
import { collectMaterials } from './material-snapshot'
import { prepareImageProvider } from './image-provider-preflight'

export function topicContentRuntime(options: { repository: TopicContentRepositoryAdapter; account: AccountService; provider: OpenRouterService; ai: AiCoordinator; textBaseUrl: string }) {
  const engine: TopicContentEngine = {
    async execute(context, checkpoint, chapterId, lease, accept) {
      const authorized = await options.account.authorizeModel(context.textModelId, lease)
      lease.signal.throwIfAborted()
      if (!options.ai.isOwner(lease)) throw new ApplicationError('CONFLICT', 'Chapter ownership changed.')
      const prepared = options.repository.workerContext(context)
      const excludedSourcePaths: string[] = []
      await collectMaterials(prepared.path, lease.signal, undefined, async path => {
        const excluded = (await options.repository.excludedSources(context, [path])).length > 0
        if (excluded) excludedSourcePaths.push(path)
        return excluded
      })
      lease.phase('examining', { id: 'chapter-source-scope', label: 'Inspect approved source scope', state: 'running' })
      const result = await runPiWorker({ profile: 'chapter', input: { model: authorized.model, accessToken: authorized.accessToken, baseUrl: options.textBaseUrl,
        path: prepared.path, brief: context.brief, outline: context.outline, topicId: context.identity.topicId, projectId: context.identity.projectId, chapterId,
        checkpoint, excludedSourcePaths, settings: context.imageModelId ? context.imageSettings ?? null : null } }, { signal: lease.signal, onChapterSubmission: accept,
        onTransport: state => { if (state.lastByteAgeMs !== null) lease.receivedByteAge(state.lastByteAgeMs); if (state.stage !== 'ended') lease.phase(state.stage) } }).result
      if (!('kind' in result) || result.kind !== 'chapter') throw new ApplicationError('INTERNAL', 'The chapter process returned an invalid result.')
      return { paused: result.paused }
    }
  }
  async function images(): Promise<ChapterImageSession | null> {
    const provider = options.provider, prepared = await prepareImageProvider(provider)
    if (!prepared) return null
    const { lease, settings } = prepared
    return { modelId: lease.modelId, settings,
      async generate(context, checkpoint, imageId, aiLease, requested, accepted, progress) {
        const planned = checkpoint.plan.images.find(image => image.id === imageId)
        if (!planned) throw new ApplicationError('INVALID_INPUT', 'This image was not planned.')
        const prepared = options.repository.workerContext(context)
        const request = { purpose: 'chapter-image' as const, operationId: aiLease.operationId, runId: checkpoint.runId,
          context: { ...context.identity, projectName: prepared.name, topicTitle: context.topic.title }, imageSlotId: imageId, settings: planned.settings,
          activationImageRequests: checkpoint.activationImageRequests, plannedImages: checkpoint.plan.images.length, signal: aiLease.signal,
          validateOwnership: async () => {
            aiLease.signal.throwIfAborted()
            if (!options.ai.isOwner(aiLease)) throw new ApplicationError('CONFLICT', 'Chapter ownership changed.')
            const current = await options.repository.loadCheckpoint(context, checkpoint.runId)
            if (!current || current.revisionId !== checkpoint.revisionId || current.chapterId !== checkpoint.chapterId) throw new ApplicationError('CONFLICT', 'Chapter progress changed.')
            // A no-op evidence merge independently rechecks authoritative sources and manifest baseline.
            await options.repository.recordSources(context, [])
          }, checkpointRequested: requested }
        progress('waiting')
        await runPiWorker({ profile: 'fixed-image', input: { imageSlotId: imageId } }, { signal: aiLease.signal,
          ...imageWorkerAuthority({ service: provider, lease, request, prompt: planned.prompt,
            acceptAsset: async image => {
              progress('validating')
              const versionId = randomUUID(), extension = image.mime === 'image/png' ? 'png' : image.mime === 'image/jpeg' ? 'jpg' : 'webp'
              const call = provider.getCall(image.callId)
              await accepted({ imageId, versionId, path: `${checkpoint.outputDirectory}/images/${imageId}-${versionId}.${extension}`, mime: image.mime,
                width: image.width, height: image.height, bytes: image.bytes.byteLength, digest: image.digest, createdAt: new Date().toISOString(),
                modelId: lease.modelId, returnedModelId: call.latest?.returnedModelId ?? null, callId: image.callId, previousVersionId: null }, image.bytes)
            } }), onTransport: state => { if (state.lastByteAgeMs !== null) aiLease.receivedByteAge(state.lastByteAgeMs); progress(state.stage === 'ended' ? 'validating' : state.stage) } }).result
      }, dispose: () => lease.release() }
  }
  async function replacementImages(): Promise<ReplacementImageSession | null> {
    const preparedProvider = await prepareImageProvider(options.provider)
    if (!preparedProvider) return null
    const { lease, settings } = preparedProvider
    return { modelId: lease.modelId, settings, dispose: () => lease.release(),
      async generate(context, attempt, aiLease, requested, accepted, progress) {
        const prepared = options.repository.workerContext(context)
        const request = { purpose: 'image-replacement' as const, operationId: aiLease.operationId, runId: attempt.candidateId,
          context: { ...context.identity, projectName: prepared.name, topicTitle: context.topic.title }, imageSlotId: attempt.imageId, settings: attempt.settings,
          activationImageRequests: 0, plannedImages: 1, signal: aiLease.signal, checkpointRequested: requested,
          validateOwnership: async () => {
            aiLease.signal.throwIfAborted()
            if (!options.ai.isOwner(aiLease)) throw new ApplicationError('CONFLICT', 'Image replacement ownership changed.')
            const current = await options.repository.loadReplacementAttempt(context, attempt.candidateId)
            if (!current || current.chapterId !== attempt.chapterId || current.revisionId !== attempt.revisionId || current.imageId !== attempt.imageId || !['planned', 'requested'].includes(current.status)) throw new ApplicationError('CONFLICT', 'The image attempt changed.')
            await options.repository.recordSources(context, [])
          } }
        await runPiWorker({ profile: 'fixed-image', input: { imageSlotId: attempt.imageId } }, { signal: aiLease.signal,
          ...imageWorkerAuthority({ service: options.provider, lease, request, prompt: attempt.prompt, acceptAsset: async image => {
            progress('validating')
            const versionId = randomUUID(), extension = image.mime === 'image/png' ? 'png' : image.mime === 'image/jpeg' ? 'jpg' : 'webp'
            await accepted({ imageId: attempt.imageId, versionId, path: `${attempt.outputDirectory}/images/${attempt.imageId}-${versionId}.${extension}`,
              mime: image.mime, width: image.width, height: image.height, bytes: image.bytes.byteLength, digest: image.digest, createdAt: new Date().toISOString(),
              modelId: lease.modelId, returnedModelId: options.provider.getCall(image.callId).latest?.returnedModelId ?? null, callId: image.callId, previousVersionId: attempt.expectedImageVersionId }, image.bytes)
          } }), onTransport: state => { if (state.lastByteAgeMs !== null) aiLease.receivedByteAge(state.lastByteAgeMs); progress(state.stage === 'ended' ? 'validating' : state.stage) } }).result
      } }
  }
  return { engine, images, replacementImages: { model: () => options.provider.getSettings().imageModelId, prepare: replacementImages },
    disposition: (callId: string, state: 'published' | 'discarded') => recordImageDisposition(options.provider, callId, state) }
}
