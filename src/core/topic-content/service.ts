import { ApplicationError } from '../../shared/contracts'
import type { ErrorCode } from '../../shared/contracts'
import type { AiOutcome } from '../../shared/ai/activity'
import { parseChapterDocument, parseChapterManifest, parseChapterPlan, parseTopicContentCheckpoint, parseTopicContentPage, parseTopicContentSnapshot, topicContentPolicy } from '../../shared/topic-content'
import type { ChapterManifest, TopicContentCheckpoint, TopicContentSnapshot, TopicContentIdentity, TopicContentRequest, GenerateTopicContentRequest, TopicContentRunRequest, CompleteTopicContentImagesRequest, RetryTopicContentImageRequest, RetryTopicContentSaveRequest } from '../../shared/topic-content'
import type { AiCoordinator, AiLease } from '../ai/coordinator'
import type { ChapterImageSession, ChapterSubmission, TopicContentContext, TopicContentEngine, TopicContentRepository } from './ports'
import { observeNotification } from '../notifications'

type StartRequest = GenerateTopicContentRequest | TopicContentRunRequest | CompleteTopicContentImagesRequest | RetryTopicContentImageRequest
type Intent = 'generate' | 'continue' | 'complete' | 'retry-image'
interface Pending { manifest?: ChapterManifest; checkpoint: TopicContentCheckpoint; asset?: { metadata: import('../../shared/topic-content').ChapterImageAsset; bytes: Uint8Array } }
export class TopicContentService {
  private active: { lease: AiLease; task: Promise<void> } | null = null
  private storageTask: Promise<unknown> | null = null
  private stopped = false
  private revision = 0
  private readonly listeners = new Set<(state: TopicContentSnapshot) => void>()
  private readonly pending = new Map<string, Pending>()
  private readonly errors = new Map<string, { code: ErrorCode; message: string }>()
  constructor(private readonly options: { ai: AiCoordinator; repository: TopicContentRepository; engine: TopicContentEngine;
    images(context: TopicContentContext): Promise<ChapterImageSession | null>;
    disposition?(callId: string, state: 'published' | 'discarded'): Promise<void>; createId(): string; now(): string }) {}
  private key(identity: TopicContentIdentity): string { return `${identity.projectId}/${identity.topicId}` }
  subscribe(listener: (state: TopicContentSnapshot) => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private async emit(identity: TopicContentIdentity): Promise<void> {
    const state = await this.getState(identity)
    for (const listener of this.listeners) observeNotification(() => listener(state))
  }
  private async progress(context: TopicContentContext, published: ChapterManifest | null): Promise<TopicContentCheckpoint | null> {
    const entries: TopicContentCheckpoint[] = []
    for (const id of await this.options.repository.progressIds(context, 'runs')) {
      try { const entry = await this.options.repository.loadCheckpoint(context, id); if (entry && ![published?.revisionId, ...(published?.previousRevisionIds ?? [])].includes(entry.revisionId)) entries.push(entry) }
      catch { /* Corrupt progress never prevents published reading. */ }
    }
    return entries.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ?? null
  }
  async getState(identity: TopicContentIdentity): Promise<TopicContentSnapshot> {
    const context = await this.options.repository.resolve(identity.projectId, identity.topicId), state = await this.options.repository.readState(context)
    const pending = this.pending.get(this.key(identity)), checkpoint = pending?.checkpoint ?? await this.progress(context, state.manifest)
    const recovery = state.recovery.kind === 'pending' ? state.recovery.manifest : null
    const error = this.errors.get(this.key(identity))
    const active = this.options.ai.get().active
    const ownsProgress = active?.projectId === identity.projectId && active.topicId === identity.topicId && active.runId === checkpoint?.runId
    return parseTopicContentSnapshot({ revision: ++this.revision, projectId: identity.projectId, topicId: identity.topicId,
      published: state.manifest ? { chapterId: state.manifest.chapterId, revisionId: state.manifest.revisionId, status: state.manifest.status } : null,
      progress: checkpoint ? { chapterId: checkpoint.chapterId, runId: checkpoint.runId, checkpointRevision: checkpoint.checkpointRevision,
        status: pending || recovery ? 'unsaved' : checkpoint.status === 'working' && !ownsProgress ? 'interrupted' : checkpoint.status, mode: checkpoint.mode,
        completedSectionIds: checkpoint.sections.map(section => section.id), pendingImageIds: checkpoint.images.filter(image => image.status !== 'complete').map(image => image.imageId),
        unresolvedImageIds: checkpoint.images.filter(image => image.status === 'requested' || image.status === 'unresolved').map(image => image.imageId),
        imageSlots: checkpoint.images.map(({ imageId, status, callId }) => ({ imageId, status, callId })), ...(pending || recovery ? { pendingResultId: pending?.checkpoint.revisionId ?? recovery!.revisionId } : {}) } : null,
      candidate: null, stale: state.stale, missingImageIds: state.missingImageIds,
      errorCode: error?.code ?? (state.issues.length || state.recovery.kind === 'conflict' ? 'STORAGE' : null),
      message: error?.message ?? state.issues[0] ?? (state.recovery.kind === 'conflict' ? state.recovery.message : null) })
  }
  async getContent(request: TopicContentRequest) {
    const context = await this.options.repository.resolve(request.projectId, request.topicId), manifest = await this.options.repository.load(context)
    if (!manifest) return null
    const start = request.sectionCursor ? manifest.plan.sections.findIndex(section => section.id === request.sectionCursor) : 0
    if (start < 0) throw new ApplicationError('INVALID_INPUT', 'The section cursor is unavailable.')
    const sections = manifest.document.sections.slice(start, start + (request.sectionLimit ?? topicContentPolicy.readerSectionsPerPage))
    return parseTopicContentPage({ identity: { projectId: manifest.projectId, topicId: manifest.topicId, chapterId: manifest.chapterId, revisionId: manifest.revisionId },
      plan: manifest.plan, ...manifest.document, sections, images: manifest.images, status: manifest.status, nextSectionCursor: manifest.plan.sections[start + sections.length]?.id ?? null })
  }
  generate(request: GenerateTopicContentRequest): Promise<TopicContentSnapshot> { return this.start('generate', request) }
  continue(request: TopicContentRunRequest): Promise<TopicContentSnapshot> { return this.start('continue', request) }
  completeImages(request: CompleteTopicContentImagesRequest): Promise<TopicContentSnapshot> { return this.start('complete', request) }
  retryImage(request: RetryTopicContentImageRequest): Promise<TopicContentSnapshot> { return this.start('retry-image', request) }
  private start(intent: Intent, request: StartRequest): Promise<TopicContentSnapshot> {
    if (this.stopped) throw new ApplicationError('CANCELLED', 'Chapter work is closed.')
    if (this.storageTask) throw new ApplicationError('BUSY', 'Chapter storage is still settling.')
    if (this.pending.has(this.key(request))) throw new ApplicationError('CONFLICT', 'Retry saving or explicitly discard the pending result before another generation.')
    const chapterId = intent === 'generate' ? this.options.createId() : (request as TopicContentRunRequest).chapterId
    const runId = intent === 'generate' || intent === 'complete' ? this.options.createId() : (request as TopicContentRunRequest).runId
    const revisionId = this.options.createId()
    const { lease } = this.options.ai.claim({ kind: 'generate-topic-content', projectId: request.projectId, topicId: request.topicId, chapterId, runId,
      model: { id: 'chapter', name: 'Chapter authoring' }, heading: intent === 'complete' ? 'Complete chapter illustrations' : 'Write topic chapter', requestSummary: 'Create validated educational content for the saved topic.' })
    let readyResolve!: () => void, readyReject!: (error: unknown) => void
    const ready = new Promise<void>((resolve, reject) => { readyResolve = resolve; readyReject = reject })
    const task = Promise.resolve().then(() => this.execute(intent, request, chapterId, runId, revisionId, lease, readyResolve)).then(outcome => { lease.settle(outcome) }).catch(error => {
      const safe = error instanceof ApplicationError ? error : new ApplicationError('INTERNAL', 'Chapter work could not finish. Validated progress has been preserved.')
      this.errors.set(this.key(request), { code: safe.code, message: safe.message }); readyReject(safe)
      lease.settle(lease.signal.aborted ? 'cancelled' : 'failed', safe.code)
    }).finally(async () => { if (this.active?.lease === lease) this.active = null; try { await this.emit(request) } catch { /* Removed projects remain unreadable. */ } })
    this.active = { lease, task }
    lease.setCancellation(() => task)
    return ready.then(() => this.getState(request))
  }
  private async execute(intent: Intent, request: StartRequest, chapterId: string, runId: string, revisionId: string, lease: AiLease, ready: () => void): Promise<AiOutcome> {
    const repository = this.options.repository, context = await repository.resolve(request.projectId, request.topicId)
    lease.signal.throwIfAborted()
    if (!context.writable) throw new ApplicationError('FORBIDDEN', 'This topic is read-only. Choose a writable project before generating content.')
    const release = repository.lock(context)
    let images: ChapterImageSession | null = null, checkpoint: TopicContentCheckpoint | null = null, textTurns = 0, activationTurns = 0, previewRevision = 0
    const save = async (next: TopicContentCheckpoint) => {
      const parsed = parseTopicContentCheckpoint({ ...next, checkpointRevision: (checkpoint?.checkpointRevision ?? 0) + 1, baseline: context.baseline, updatedAt: this.options.now() })
      try { await repository.saveCheckpoint(context, parsed) }
      catch (error) { if (!(error instanceof ApplicationError) || error.code === 'STORAGE') this.pending.set(this.key(request), { checkpoint: parsed }); throw error }
      checkpoint = parsed
      lease.progress({ operationId: lease.operationId, projectId: request.projectId, topicId: request.topicId, turn: parsed.activationTextTurns, revision: ++previewRevision,
        preview: { kind: 'chapter', topicId: request.topicId, chapterId, title: parsed.plan.title, sections: parsed.plan.sections.map(section => ({ id: section.id, title: section.title, text: parsed.sections.find(value => value.id === section.id)?.markdown.slice(0, 1600) })) } })
      await this.emit(request)
    }
    const complete = (value: TopicContentCheckpoint) => Boolean(value.introduction && value.synthesis && value.sourceNotes.length && value.sections.length === value.plan.sections.length)
    const generateImage = async (imageId: string) => {
      lease.signal.throwIfAborted()
      if (!checkpoint || !complete(checkpoint) || !images || checkpoint.mode !== 'illustrated') throw new ApplicationError('INVALID_INPUT', 'Illustrations require complete prose and an authorized provider.')
      const slot = checkpoint.images.find(image => image.imageId === imageId)
      if (!slot || slot.status !== 'planned') throw new ApplicationError('INVALID_INPUT', 'This slot requires an explicit retry, or is already complete.')
      lease.phase('generating-images')
      try {
        await images.generate(context, checkpoint, imageId, lease, async callId => {
          await save({ ...checkpoint!, imageRequests: checkpoint!.imageRequests + 1, activationImageRequests: checkpoint!.activationImageRequests + 1,
            images: checkpoint!.images.map(image => image.imageId === imageId ? { ...image, status: 'requested', callId } : image) })
        }, async (asset, bytes) => {
          try { await repository.stageAsset(context, checkpoint!.plan, checkpoint!.revisionId, asset, bytes) }
          catch (error) {
            if (!(error instanceof ApplicationError) || error.code === 'STORAGE') this.pending.set(this.key(request), {
              checkpoint: parseTopicContentCheckpoint({ ...checkpoint!, checkpointRevision: checkpoint!.checkpointRevision + 1, updatedAt: this.options.now(), images: checkpoint!.images.map(image => image.imageId === imageId ? { ...image, status: 'complete', asset } : image) }),
              asset: { metadata: asset, bytes: bytes.slice() } })
            throw error
          }
          await save({ ...checkpoint!, images: checkpoint!.images.map(image => image.imageId === imageId ? { ...image, status: 'complete', asset } : image) })
        }, state => {
          lease.progress({ operationId: lease.operationId, projectId: request.projectId, topicId: request.topicId, turn: checkpoint!.activationTextTurns, revision: ++previewRevision,
            preview: { kind: 'image', topicId: request.topicId, chapterId, imageId, state, modelName: images!.modelId } })
        })
      } catch (error) {
        if (this.pending.has(this.key(request))) throw error
        if (checkpoint && !lease.signal.aborted) await save({ ...checkpoint, images: checkpoint.images.map(image => image.imageId === imageId && image.status === 'requested' ? { ...image, status: 'unresolved' } : image) })
        if (lease.signal.aborted || error instanceof ApplicationError && ['STORAGE', 'CONFLICT', 'FORBIDDEN'].includes(error.code)) throw error
      }
    }
    try {
      if ((await repository.readState(context)).recovery.kind === 'conflict') throw new ApplicationError('CONFLICT', 'The chapter publication recovery record is unknown or changed. Preserve it and resolve the conflict before generating more content.')
      const published = await repository.load(context)
      if (intent === 'generate') {
        const generation = request as GenerateTopicContentRequest
        if (generation.replace ? !published || generation.expectedRevisionId !== published.revisionId : published !== null) throw new ApplicationError('CONFLICT', 'The current chapter changed. Refresh before replacing it.')
        if (await this.progress(context, published)) throw new ApplicationError('CONFLICT', 'Resume or discard the existing chapter progress first.')
      } else if (intent === 'complete') {
        if (await this.progress(context, published)) throw new ApplicationError('CONFLICT', 'Resume or discard the existing chapter progress first.')
        const completion = request as CompleteTopicContentImagesRequest
        if (!published || published.chapterId !== completion.chapterId || published.revisionId !== completion.revisionId || published.status === 'illustrated') throw new ApplicationError('CONFLICT', 'The current chapter no longer needs these illustrations.')
        if ((await repository.readState(context)).stale) throw new ApplicationError('CONFLICT', 'The published chapter sources or learning context changed. Generate fresh prose first.')
        images = await this.options.images(context)
        if (!images) throw new ApplicationError('UNAVAILABLE', 'Validate a usable image key and compatible fixed image model before completing illustrations.')
        context.baseline = { ...published.baseline, expectedManifestDigest: context.baseline.expectedManifestDigest }
        const copied = await repository.copyAcceptedImages(context, published.plan, revisionId)
        checkpoint = parseTopicContentCheckpoint({ schemaVersion: 1, ...context.identity, chapterId, revisionId, outputDirectory: `${context.topicFolder}/content/${chapterId}/${revisionId}`, runId, mode: 'illustrated', status: 'working', checkpointRevision: 1,
          plan: published.plan, ...published.document, images: published.images.map(image => image.asset ? { ...image, asset: copied.find(asset => asset.imageId === image.imageId)! } : image),
          baseline: context.baseline, provenance: { ...published.provenance, runId }, textTurns: 0, imageRequests: published.images.filter(image => image.callId).length,
          activationTextTurns: 0, activationImageRequests: 0, updatedAt: this.options.now() })
        // A checkpoint deliberately excludes manifest-only fields.
        try { await repository.saveCheckpoint(context, checkpoint) }
        catch (error) { if (!(error instanceof ApplicationError) || error.code === 'STORAGE') this.pending.set(this.key(request), { checkpoint }); throw error }
      } else {
        const continuation = request as TopicContentRunRequest
        checkpoint = await repository.loadCheckpoint(context, runId)
        if (!checkpoint || checkpoint.chapterId !== chapterId || checkpoint.checkpointRevision !== continuation.checkpointRevision || checkpoint.revisionId === published?.revisionId) throw new ApplicationError('CONFLICT', 'The saved chapter progress changed. Refresh before continuing.')
        context.baseline = checkpoint.baseline
        context.textModelId = checkpoint.provenance.textModelId
        if (intent === 'retry-image') {
          const retry = request as RetryTopicContentImageRequest, slot = checkpoint.images.find(image => image.imageId === retry.imageId)
          if (!slot || slot.callId !== retry.priorCallId || !['failed', 'requested', 'unresolved'].includes(slot.status) || !retry.acknowledgeUncertainCharge) throw new ApplicationError('CONFLICT', 'Explicitly acknowledge the uncertain previous charge before retrying this slot.')
          const next = parseTopicContentCheckpoint({ ...checkpoint, checkpointRevision: checkpoint.checkpointRevision + 1, activationTextTurns: 0, activationImageRequests: 0, status: 'working', updatedAt: this.options.now(), images: checkpoint.images.map(image => image.imageId === retry.imageId ? { ...image, status: 'planned', callId: null, previousAttempts: [...(image.previousAttempts ?? []), { callId: image.callId, status: image.status === 'failed' ? 'failed' : 'unresolved', uncertaintyAcknowledged: retry.acknowledgeUncertainCharge }] } : image) })
          await repository.retryImage(context, next, retry); checkpoint = next
        } else await save({ ...checkpoint, activationTextTurns: 0, activationImageRequests: 0, status: 'working' })
        textTurns = checkpoint.textTurns
      }
      const mode = checkpoint?.mode ?? (request as GenerateTopicContentRequest).mode
      if (mode === 'illustrated' && !images) images = await this.options.images(context)
      context.imageModelId = images?.modelId ?? null
      context.imageSettings = images?.settings ?? { n: 1, aspectRatio: '1:1' }
      this.errors.delete(this.key(request)); ready()
      const accept = async (submission: ChapterSubmission): Promise<TopicContentCheckpoint | null> => {
        lease.signal.throwIfAborted()
        if (submission.kind === 'turn') {
          if (activationTurns >= topicContentPolicy.textTurnsPerActivation) throw new ApplicationError('INVALID_INPUT', 'The activation turn budget is exhausted.')
          activationTurns++; textTurns++
          if (checkpoint) await save({ ...checkpoint, textTurns, activationTextTurns: activationTurns })
        } else if (submission.kind === 'sources') {
          lease.phase('examining', { id: 'chapter-sources', label: 'Read approved learning sources', state: 'running' })
          await repository.recordSources(context, submission.sources)
          if (checkpoint) await save(checkpoint)
        } else if (submission.kind === 'plan') {
          lease.phase('planning', { id: 'chapter-plan', label: 'Validate objectives and illustration plan', state: 'running' })
          if (checkpoint) throw new ApplicationError('INVALID_INPUT', 'The accepted chapter plan is immutable.')
          const plan = parseChapterPlan(submission.plan, { ...context.identity, objectives: context.topic.objectives })
          if (plan.chapterId !== chapterId || !plan.images.length || new Set(plan.images.map(image => image.purpose)).size !== plan.images.length || plan.images.some(image => image.skillVersion !== 'educational-images-v1' || JSON.stringify(image.settings) !== JSON.stringify(context.imageSettings))) throw new ApplicationError('INVALID_INPUT', 'Plan useful distinct images using the authorized settings and guidance.')
          await save({ schemaVersion: 1, ...context.identity, chapterId, revisionId, outputDirectory: `${context.topicFolder}/content/${chapterId}/${revisionId}`, runId, checkpointRevision: 1, mode, status: 'working', plan, sections: [], introduction: null, synthesis: null, sourceNotes: [], images: plan.images.map(image => ({ imageId: image.id, status: 'planned', callId: null, asset: null })), baseline: context.baseline,
            provenance: { runId, textModelId: context.textModelId, imageModelId: images?.modelId ?? null, createdAt: this.options.now() }, textTurns, imageRequests: 0, activationTextTurns: activationTurns, activationImageRequests: 0, updatedAt: this.options.now() })
        } else if (submission.kind === 'image') await generateImage(submission.imageId)
        else {
          if (!checkpoint) throw new ApplicationError('INVALID_INPUT', 'Submit a plan first.')
          if (submission.kind === 'section') {
            lease.phase('writing', { id: 'chapter-sections', label: 'Accept authored chapter sections', state: 'running' })
            if (!checkpoint.plan.sections.some(section => section.id === submission.section.id) || checkpoint.sections.some(section => section.id === submission.section.id)) throw new ApplicationError('INVALID_INPUT', 'Submit one new planned section.')
            await save({ ...checkpoint, sections: checkpoint.plan.sections.flatMap(section => section.id === submission.section.id ? [submission.section] : checkpoint!.sections.filter(value => value.id === section.id)) })
          } else {
            lease.phase('validating', { id: 'chapter-summary', label: 'Validate introduction and synthesis', state: 'running' })
            parseChapterDocument({ introduction: submission.introduction, synthesis: submission.synthesis, sourceNotes: submission.sourceNotes, sections: checkpoint.sections }, checkpoint.plan)
            await save({ ...checkpoint, introduction: submission.introduction, synthesis: submission.synthesis, sourceNotes: submission.sourceNotes })
          }
        }
        return checkpoint
      }
      const result = !checkpoint || !complete(checkpoint) ? await this.options.engine.execute(context, checkpoint, chapterId, lease, accept) : null
      lease.signal.throwIfAborted()
      if (result?.paused || !checkpoint || !complete(checkpoint)) {
        if (checkpoint) await save({ ...checkpoint, status: 'paused' })
        return 'paused'
      }
      if (mode === 'illustrated' && images) for (const slot of checkpoint.images.filter(image => image.status === 'planned')) await generateImage(slot.imageId)
      lease.signal.throwIfAborted()
      if (intent !== 'generate' && checkpoint.images.some(image => ['requested', 'unresolved', 'failed'].includes(image.status))) {
        await save({ ...checkpoint, status: 'paused' }); return 'paused'
      }
      // Requested/unresolved/failed slots never become implicit paid retries, even in a cloned revision.
      lease.phase('validating', { id: 'chapter-validation', label: 'Validate complete chapter and saved source evidence', state: 'running' })
      const manifest = parseChapterManifest({ schemaVersion: 1, ...context.identity, chapterId, revisionId: checkpoint.revisionId, outputDirectory: checkpoint.outputDirectory,
        status: mode === 'text-only' ? 'text-only' : checkpoint.images.every(image => image.status === 'complete') ? 'illustrated' : 'needs-images', plan: checkpoint.plan,
        document: { introduction: checkpoint.introduction, sections: checkpoint.sections, synthesis: checkpoint.synthesis, sourceNotes: checkpoint.sourceNotes }, images: checkpoint.images,
        baseline: context.baseline, provenance: { ...checkpoint.provenance, imageModelId: images?.modelId ?? checkpoint.provenance.imageModelId }, previousRevisionIds: published ? [published.revisionId, ...published.previousRevisionIds] : [] })
      lease.phase('saving')
      try { await repository.publish(context, manifest) }
      catch (error) {
        if (error instanceof ApplicationError && error.code !== 'STORAGE') throw error
        this.pending.set(this.key(request), { manifest, checkpoint }); this.errors.set(this.key(request), { code: 'STORAGE', message: 'The chapter is ready but could not be published. Retry saving without another AI request.' }); return 'unsaved'
      }
      this.pending.delete(this.key(request))
      await this.disposition(manifest.images, 'published', request)
      return manifest.status === 'needs-images' ? 'incomplete' : 'saved'
    } catch (error) {
      if (this.pending.has(this.key(request)) && !lease.signal.aborted) {
        this.errors.set(this.key(request), { code: 'STORAGE', message: 'Validated content could not be checkpointed. Retry saving without another provider request.' })
        ready(); lease.phase('saving'); return 'unsaved'
      }
      if (checkpoint && lease.signal.aborted && !this.pending.has(this.key(request))) { try { await save({ ...checkpoint, status: 'cancelled' }) } catch { /* Earlier durable checkpoint remains authoritative. */ } }
      throw error
    } finally { images?.dispose(); release() }
  }
  private async disposition(images: TopicContentCheckpoint['images'], state: 'published' | 'discarded', identity: TopicContentIdentity): Promise<void> {
    try { for (const image of images) if (image.asset) await this.options.disposition?.(image.asset.callId, state) }
    catch { this.errors.set(this.key(identity), { code: 'STORAGE', message: 'Chapter storage finished, but its local activity publication status could not be updated. Recorded billing is preserved.' }) }
  }
  private storageMutation<T>(action: () => Promise<T>): Promise<T> {
    if (this.stopped) throw new ApplicationError('CANCELLED', 'Chapter work is closed.')
    if (this.active || this.storageTask || this.options.ai.get().active) throw new ApplicationError('BUSY', 'Wait for AI and storage cleanup first.')
    const release = this.options.ai.reservePublication()
    const task = Promise.resolve().then(action)
    this.storageTask = task
    void task.finally(() => { if (this.storageTask === task) this.storageTask = null; release() }).catch(() => {})
    return task
  }
  discard(request: TopicContentRunRequest): Promise<TopicContentSnapshot> { return this.storageMutation(async () => {
    const context = await this.options.repository.resolve(request.projectId, request.topicId), durable = await this.options.repository.loadCheckpoint(context, request.runId), pending = this.pending.get(this.key(request))
    const checkpoint = pending?.checkpoint ?? durable
    if (this.options.ai.get().active) throw new ApplicationError('BUSY', 'Another AI action started.')
    if (!checkpoint || checkpoint.runId !== request.runId || checkpoint.chapterId !== request.chapterId || checkpoint.checkpointRevision !== request.checkpointRevision) throw new ApplicationError('CONFLICT', 'Progress changed.')
    await this.options.repository.discardPublication(context, checkpoint.runId, checkpoint.revisionId)
    if (durable) await this.options.repository.discardProgress(context, request.runId, durable.checkpointRevision)
    this.pending.delete(this.key(request)); this.errors.delete(this.key(request))
    await this.disposition(checkpoint.images, 'discarded', request)
    await this.emit(request); return this.getState(request)
  }) }
  retrySave(request: RetryTopicContentSaveRequest): Promise<TopicContentSnapshot> { return this.storageMutation(async () => {
    const context = await this.options.repository.resolve(request.projectId, request.topicId), release = this.options.repository.lock(context)
    try {
      if (this.options.ai.get().active) throw new ApplicationError('BUSY', 'Another AI action started.')
      const pending = this.pending.get(this.key(request)), state = await this.options.repository.readState(context)
      const manifest = pending?.manifest ?? (state.recovery.kind === 'pending' ? state.recovery.manifest : null)
      const checkpoint = pending?.checkpoint ?? await this.options.repository.loadCheckpoint(context, request.runId)
      if (!checkpoint || !pending && !manifest || (pending?.checkpoint.revisionId ?? manifest!.revisionId) !== request.pendingResultId || checkpoint.runId !== request.runId || checkpoint.chapterId !== request.chapterId || checkpoint.checkpointRevision !== request.checkpointRevision) throw new ApplicationError('CONFLICT', 'The pending save changed.')
      if (pending?.asset) await this.options.repository.stageAsset(context, checkpoint.plan, checkpoint.revisionId, pending.asset.metadata, pending.asset.bytes)
      if (pending?.manifest) await this.options.repository.publish(context, pending.manifest)
      else if (pending) await this.options.repository.saveCheckpoint(context, checkpoint)
      else await this.options.repository.retryPublication(context)
      this.pending.delete(this.key(request)); this.errors.delete(this.key(request))
      if (manifest) await this.disposition(manifest.images, 'published', request)
      await this.emit(request); return this.getState(request)
    } finally { release() }
  }) }
  async waitForIdle(): Promise<void> { await this.active?.task; await this.storageTask?.catch(() => {}) }
  async dispose(): Promise<void> { this.stopped = true; await this.waitForIdle(); this.listeners.clear() }
}
