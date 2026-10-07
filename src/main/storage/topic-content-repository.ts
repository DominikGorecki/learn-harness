import type { WorkspaceService } from '../../core/workspace/service'
import type { PreparedTopicContent, TopicContentMutationLease } from '../../core/workspace/ports'
import type { TopicContentContext, TopicContentRepository } from '../../core/topic-content/ports'
import type { ChapterImageAsset, ChapterPlan, ChapterSource, TopicContentCheckpoint, RetryTopicContentImageRequest } from '../../shared/topic-content'
import { parseChapterBaseline } from '../../shared/topic-content'
import { ApplicationError } from '../../shared/contracts'
import { parseTopicMediaIdentity } from '../../shared/topic-content-media'
import type { TopicMediaIdentity } from '../../shared/topic-content-media'
import { createTopicContentStorage } from './topic-content'
import type { TopicContentAuthority, TopicContentStorage } from './topic-content'
import { contentConflict } from './topic-content-files'

/** Main composition seam: registry resolution and every write share the existing workspace serial queue. */
export function createTopicContentRepository(workspace: WorkspaceService, storage: TopicContentStorage = createTopicContentStorage()) {
  const owners = new WeakMap<TopicContentContext, { authority: TopicContentAuthority; lease?: TopicContentMutationLease }>()
  const owner = (context: TopicContentContext) => {
    const value = owners.get(context)
    if (!value) throw new ApplicationError('FORBIDDEN', 'This content context was not resolved by the application.')
    return value
  }
  function compatible(context: TopicContentContext, prepared: PreparedTopicContent): void {
    const previous = owner(context).authority.prepared
    if (previous.path !== prepared.path || previous.projectHandle !== prepared.projectHandle || previous.projectId !== prepared.projectId || previous.topicId !== prepared.topicId || context.handle !== previous.projectHandle || context.identity.projectId !== previous.projectId || context.identity.topicId !== previous.topicId) throw contentConflict()
  }
  function mutation<T>(context: TopicContentContext, action: (authority: TopicContentAuthority) => Promise<T>): Promise<T> {
    const value = owner(context)
    const invoke = async (prepared: PreparedTopicContent) => { compatible(context, prepared); return action(value.authority) }
    return value.lease ? value.lease.mutate(value.authority.prepared.topicId, invoke) : workspace.mutateTopicContent(value.authority.prepared.projectHandle, value.authority.prepared.topicId, invoke)
  }
  const repository: Pick<TopicContentRepository, 'resolve' | 'load' | 'loadCheckpoint' | 'saveCheckpoint' | 'publish' | 'saveCandidate' | 'discardProgress'> = {
    async resolve(handle, topicId) {
      const prepared = await workspace.readTopicContent(handle, topicId), authority = await storage.prepare(prepared)
      const context: TopicContentContext = { handle, identity: { projectId: prepared.projectId, topicId }, brief: prepared.brief, outline: prepared.outline.document, topic: prepared.topic,
        baseline: await storage.captureBaseline(authority), textModelId: prepared.selectedModel?.id ?? '', imageModelId: null, writable: prepared.writable, topicFolder: authority.folderName }
      owners.set(context, { authority })
      return context
    },
    async load(context) {
      const state = await storage.read(owner(context).authority)
      if (!state.manifest && state.issues.length) throw new ApplicationError('STORAGE', state.issues[0]!)
      return state.manifest
    },
    loadCheckpoint: (context, runId) => storage.loadCheckpoint(owner(context).authority, runId),
    saveCheckpoint: (context, checkpoint) => mutation(context, authority => storage.saveCheckpoint(authority, checkpoint)),
    publish: (context, manifest) => mutation(context, authority => storage.publish(authority, manifest)),
    saveCandidate: (context, candidate) => mutation(context, authority => storage.saveCandidate(authority, candidate)),
    discardProgress: (context, runId, revision) => mutation(context, authority => storage.discardProgress(authority, runId, revision))
  }
  return {
    ...repository,
    workerContext: (context: TopicContentContext) => owner(context).authority.prepared,
    excludedSources: (context: TopicContentContext, paths: readonly string[]) => storage.excludedSources(owner(context).authority, paths),
    retryImage: (context: TopicContentContext, checkpoint: TopicContentCheckpoint, request: RetryTopicContentImageRequest) => mutation(context, authority => storage.saveCheckpoint(authority, checkpoint, request)),
    /** Take after shared admission; release only after actual worker cleanup/domain settlement. */
    lock(context: TopicContentContext): () => void {
      const value = owner(context)
      if (value.lease) throw new ApplicationError('BUSY', 'This content context already owns a workspace mutation lease.')
      const lease = workspace.lockTopicContent(value.authority.prepared.projectHandle)
      value.lease = lease
      return () => { if (value.lease === lease) delete value.lease; lease.release() }
    },
    async inspect(handle: string, topicId: string) {
      const authority = await storage.prepare(await workspace.readTopicContent(handle, topicId))
      return storage.read(authority)
    },
    readState: (context: TopicContentContext) => storage.read(owner(context).authority),
    recover: (context: TopicContentContext) => mutation(context, authority => storage.recover(authority)),
    retryPublication: (context: TopicContentContext) => mutation(context, authority => storage.retryPublication(authority)),
    discardPublication: (context: TopicContentContext, runId: string, revisionId: string) => mutation(context, authority => storage.discardPublication(authority, runId, revisionId)),
    /** Private worker evidence: digests must describe the exact bytes delivered to inference. */
    async recordSources(context: TopicContentContext, evidence: readonly ChapterSource[]): Promise<void> {
      const previous = parseChapterBaseline(context.baseline)
      const inspected = parseChapterBaseline({ ...previous, sources: evidence }).sources
      const combined = new Map(previous.sources.map(source => [source.path, source]))
      for (const source of inspected) {
        if (combined.has(source.path) && combined.get(source.path)!.digest !== source.digest) throw contentConflict('A previously inspected source cannot be replaced by newer evidence.')
        combined.set(source.path, source)
      }
      const baseline = await storage.captureBaseline(owner(context).authority, [...combined.keys()])
      // Never adopt a newer marker or source version after inference has consumed earlier bytes.
      if (baseline.expectedManifestDigest !== previous.expectedManifestDigest || baseline.sources.some(source => combined.get(source.path)?.digest !== source.digest)) throw contentConflict('Inspected source bytes changed before their evidence was recorded.')
      context.baseline = baseline
    },
    stageAsset: (context: TopicContentContext, plan: ChapterPlan, revisionId: string, asset: ChapterImageAsset, bytes: Uint8Array) => mutation(context, authority => storage.stageAsset(authority, plan, revisionId, asset, bytes)),
    copyAcceptedImages: (context: TopicContentContext, plan: ChapterPlan, revisionId: string) => mutation(context, authority => storage.copyAcceptedImages(authority, plan, revisionId)),
    loadCandidate: (context: TopicContentContext, candidateId: string) => storage.loadCandidate(owner(context).authority, candidateId),
    discardCandidate: (context: TopicContentContext, candidateId: string, expectedRevisionId: string) => mutation(context, authority => storage.discardCandidate(authority, candidateId, expectedRevisionId)),
    progressIds: (context: TopicContentContext, kind: 'runs' | 'candidates') => storage.progressIds(owner(context).authority, kind),
    async resolveMedia(request: TopicMediaIdentity) {
      const identity = parseTopicMediaIdentity(request)
      const authority = await storage.prepare(await workspace.readTopicContent(identity.projectHandle, identity.topicId))
      return storage.resolveMedia(authority, identity)
    }
  }
}
export type TopicContentRepositoryAdapter = ReturnType<typeof createTopicContentRepository>
