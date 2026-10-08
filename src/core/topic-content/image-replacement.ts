import { ApplicationError } from '../../shared/contracts'
import type { ErrorCode } from '../../shared/contracts'
import type { AiCoordinator } from '../ai/coordinator'
import type { OpenRouterImageModelId } from '../../shared/openrouter'
import { parseChapterManifest, parseChapterPlan, parseTopicImageCandidate, parseTopicImageReplacementAttempt, topicContentPolicy, validateChapterPageability } from '../../shared/topic-content'
import type { AcceptTopicImageReplacementRequest, ChapterManifest, GenerateTopicImageReplacementRequest, RetryTopicImageReplacementSaveRequest, TopicContentIdentity, TopicContentSnapshot, TopicImageCandidate, TopicImageCandidateRequest, TopicImageReplacementAttempt } from '../../shared/topic-content'
import type { ReplacementImageSession, TopicContentContext, TopicContentRepository } from './ports'

interface Pending { attempt: TopicImageReplacementAttempt; candidate?: TopicImageCandidate; bytes?: Uint8Array; manifest?: ChapterManifest }
type Options = { ai: AiCoordinator; repository: TopicContentRepository; model(): OpenRouterImageModelId;
  images(): Promise<ReplacementImageSession | null>; createId(): string; now(): string;
  notify(identity: TopicContentIdentity): Promise<void>; state(identity: TopicContentIdentity): Promise<TopicContentSnapshot>;
  disposition?(callId: string, state: 'published' | 'discarded'): Promise<void> }
const key = (identity: TopicContentIdentity) => `${identity.projectId}/${identity.topicId}`
const conflict = (message = 'The original chapter or image changed. Keep the original and reopen the current image.') => new ApplicationError('CONFLICT', message)
const safe = (error: unknown) => error instanceof ApplicationError ? error : new ApplicationError('STORAGE', 'Image review could not be saved. Its accepted bytes have been preserved for Retry save.')

/** One explicit image attempt, never a chapter checkpoint or an automatic paid retry. */
export class TopicImageReplacementService {
  private active: { identity: TopicContentIdentity; candidateId: string; task: Promise<void> } | null = null
  private storage: Promise<unknown> | null = null
  private pending = new Map<string, Pending>()
  private errors = new Map<string, { code: ErrorCode; message: string }>()
  private stopped = false
  constructor(private readonly options: Options) {}
  hasPending(identity: TopicContentIdentity): boolean { return this.pending.has(key(identity)) }
  async records(context: TopicContentContext) {
    const attempts: TopicImageReplacementAttempt[] = []
    for (const id of await this.options.repository.progressIds(context, 'image-attempts')) {
      const attempt = await this.options.repository.loadReplacementAttempt(context, id)
      if (attempt) attempts.push(attempt)
    }
    if (attempts.length > 1) throw conflict('More than one image review is retained. Preserve the records and resolve their ownership before starting another action.')
    const attempt = this.pending.get(key({ projectId: context.handle, topicId: context.identity.topicId }))?.attempt ?? attempts[0] ?? null
    const candidate = attempt ? await this.options.repository.loadCandidate(context, attempt.candidateId) : null
    return { attempt, candidate }
  }
  async snapshot(context: TopicContentContext, published: ChapterManifest | null) {
    const { attempt, candidate } = await this.records(context), pending = this.pending.get(key({ projectId: context.handle, topicId: context.identity.topicId }))
    const recovery = await this.options.repository.readState(context)
    const pendingPublication = attempt && (recovery.recovery.kind === 'pending' && recovery.recovery.manifest.provenance.runId === attempt.candidateId && recovery.recovery.manifest.revisionId === attempt.revisionId || recovery.recovery.kind === 'committed' && published?.provenance.runId === attempt.candidateId && published.revisionId === attempt.revisionId)
    const publishedAttempt = attempt && published?.provenance.runId === attempt.candidateId && published.revisionId === attempt.revisionId
    let validCandidate = candidate, candidateError: { code: ErrorCode; message: string } | undefined
    if (attempt && candidate) { try { this.bindCandidate(attempt, candidate) } catch { validCandidate = null; candidateError = { code: 'CONFLICT', message: 'The candidate control record changed. Its bytes and published content have been preserved.' } } }
    const active = this.active?.identity.projectId === context.handle && this.active.identity.topicId === context.identity.topicId && this.active.candidateId === attempt?.candidateId
    return { candidate: validCandidate && published?.chapterId === validCandidate.chapterId && published.revisionId === validCandidate.expectedRevisionId ? validCandidate : null,
      ...(attempt ? { replacement: { candidateId: attempt.candidateId, chapterId: attempt.chapterId, revisionId: attempt.expectedRevisionId, imageId: attempt.imageId,
        expectedImageVersionId: attempt.expectedImageVersionId, status: publishedAttempt ? 'published' as const : pending || pendingPublication ? 'unsaved' as const : active ? 'working' as const : 'interrupted' as const,
        callId: attempt.callId, prompt: attempt.prompt, modelId: attempt.modelId, ...(pending || pendingPublication || publishedAttempt ? { pendingResultId: attempt.revisionId } : {}) } } : {}),
      error: candidateError ?? this.errors.get(key({ projectId: context.handle, topicId: context.identity.topicId })) }
  }
  private async original(context: TopicContentContext, request: { chapterId: string; revisionId: string; imageId: string; expectedImageVersionId: string }) {
    const state = await this.options.repository.readState(context), manifest = state.manifest
    if (!context.writable) throw new ApplicationError('FORBIDDEN', 'This topic is read-only. Choose a writable project to replace an image.')
    if (state.recovery.kind === 'conflict' || state.recovery.kind === 'pending') throw conflict('Resolve the retained chapter publication before starting an image replacement.')
    if (!manifest || manifest.chapterId !== request.chapterId || manifest.revisionId !== request.revisionId || manifest.images.find(image => image.imageId === request.imageId)?.asset?.versionId !== request.expectedImageVersionId) throw conflict()
    if (state.stale) throw conflict('Chapter sources or learning context changed. Generate fresh chapter content before replacing its illustrations.')
    context.baseline = { ...manifest.baseline, expectedManifestDigest: context.baseline.expectedManifestDigest }
    await this.options.repository.recordSources(context, [])
    return manifest
  }
  generate(request: GenerateTopicImageReplacementRequest): Promise<TopicContentSnapshot> {
    if (this.stopped) throw new ApplicationError('CANCELLED', 'Image work is closed.')
    if (this.pending.has(key(request))) throw conflict('Retry save or Keep original before starting another image.')
    const candidateId = this.options.createId(), revisionId = this.options.createId(), modelId = this.options.model()
    const { lease } = this.options.ai.claim({ kind: 'regenerate-topic-image', projectId: request.projectId, topicId: request.topicId, chapterId: request.chapterId,
      imageId: request.imageId, runId: candidateId, model: { id: modelId, name: modelId }, heading: 'Regenerate illustration', requestSummary: 'Create one candidate for the selected chapter illustration.' })
    let readyResolve!: () => void, readyReject!: (error: unknown) => void
    const ready = new Promise<void>((resolve, reject) => { readyResolve = resolve; readyReject = reject })
    const task = Promise.resolve().then(async () => {
      const repository = this.options.repository, context = await repository.resolve(request.projectId, request.topicId)
      const release = repository.lock(context)
      let session: ReplacementImageSession | null = null, attempt: TopicImageReplacementAttempt | null = null, previewRevision = 0
      try {
        lease.signal.throwIfAborted()
        if ((await this.records(context)).attempt || (await repository.progressIds(context, 'candidates')).length) throw conflict('Keep the retained image review before generating another candidate.')
        const manifest = await this.original(context, request)
        for (const runId of await repository.progressIds(context, 'runs')) {
          const checkpoint = await repository.loadCheckpoint(context, runId)
          if (checkpoint && ![manifest.revisionId, ...manifest.previousRevisionIds].includes(checkpoint.revisionId)) throw conflict('Resolve unfinished chapter work before replacing an image.')
        }
        if (manifest.previousRevisionIds.length >= topicContentPolicy.maximumRetainedPointers) throw new ApplicationError('UNAVAILABLE', 'Chapter revision history is full. Existing images have been preserved.')
        // The prompt and largest future asset envelope must remain pageable before any paid request.
        const plan = parseChapterPlan({ ...manifest.plan, images: manifest.plan.images.map(image => image.id === request.imageId ? { ...image, prompt: request.prompt } : image) })
        const reservedImages = manifest.images.map(image => image.imageId === request.imageId ? { ...image, status: 'planned' as const, callId: null, asset: null } : image)
        validateChapterPageability(manifest, plan, manifest.document, reservedImages, 'needs-images', true)
        if (reservedImages.reduce((sum, image) => sum + (image.asset?.bytes ?? 0), 0) + topicContentPolicy.imageBytes > topicContentPolicy.chapterMediaBytes) throw new ApplicationError('UNAVAILABLE', 'This chapter cannot reserve another bounded image without exceeding its media limit.')
        session = await this.options.images()
        lease.signal.throwIfAborted()
        if (!session) throw new ApplicationError('UNAVAILABLE', 'Validate an image key and compatible fixed model in Settings before regenerating.')
        if (session.modelId !== modelId) throw conflict('The selected image model changed during preparation. Reopen the dialog.')
        const edited = plan.images.find(image => image.id === request.imageId)!
        attempt = parseTopicImageReplacementAttempt({ schemaVersion: 1, ...context.identity, chapterId: manifest.chapterId, revisionId, outputDirectory: `${context.topicFolder}/content/${manifest.chapterId}/${revisionId}`, candidateId, imageId: request.imageId,
          expectedRevisionId: manifest.revisionId, expectedImageVersionId: request.expectedImageVersionId, expectedManifestDigest: context.baseline.expectedManifestDigest,
          sequence: 1, status: 'planned', callId: null, prompt: request.prompt, caption: edited.caption, alt: edited.alt, settings: session.settings, modelId, createdAt: this.options.now() })
        // Revalidate with actual authorized settings before dispatch, without adopting new source bytes.
        const actualPlan = parseChapterPlan({ ...plan, images: plan.images.map(image => image.id === request.imageId ? { ...image, settings: session!.settings } : image) })
        validateChapterPageability(manifest, actualPlan, manifest.document, reservedImages, 'needs-images', true)
        await repository.saveReplacementAttempt(context, attempt)
        readyResolve(); this.errors.delete(key(request)); await this.options.notify(request)
        lease.phase('generating-images')
        await session.generate(context, attempt, lease, async callId => {
          const next = parseTopicImageReplacementAttempt({ ...attempt!, sequence: attempt!.sequence + 1, status: 'requested', callId })
          await repository.saveReplacementAttempt(context, next); attempt = next
        }, async (asset, bytes) => {
          const current = attempt!
          const candidate = parseTopicImageCandidate({ schemaVersion: 1, projectId: current.projectId, topicId: current.topicId, chapterId: current.chapterId, revisionId: current.revisionId, candidateId: current.candidateId, imageId: current.imageId, expectedRevisionId: current.expectedRevisionId, expectedImageVersionId: current.expectedImageVersionId, expectedManifestDigest: current.expectedManifestDigest, prompt: current.prompt, caption: current.caption, alt: current.alt, settings: current.settings, asset, createdAt: current.createdAt })
          // Explicit projection avoids unknown attempt-only fields in the candidate contract.
          await this.saveCandidate(context, attempt!, candidate, bytes)
        }, state => {
          lease.progress({ operationId: lease.operationId, projectId: request.projectId, topicId: request.topicId, turn: 0, revision: ++previewRevision,
            preview: { kind: 'image', topicId: request.topicId, chapterId: request.chapterId, imageId: request.imageId, state, modelName: modelId } })
        })
        lease.settle('candidate')
      } catch (error) {
        const failure = safe(error); this.errors.set(key(request), { code: failure.code, message: failure.message }); readyReject(failure)
        // Never overwrite an accepted-but-unsaved candidate with cancellation/interruption state.
        if (attempt?.callId && !this.pending.has(key(request))) {
          try { await repository.saveReplacementAttempt(context, { ...attempt, sequence: attempt.sequence + 1, status: 'interrupted' }) } catch { /* Durable requested identity still forbids replay. */ }
        }
        lease.settle(lease.signal.aborted ? 'cancelled' : this.pending.has(key(request)) ? 'unsaved' : 'failed', failure.code)
      } finally { session?.dispose(); release() }
    }).catch(error => { const failure = safe(error); readyReject(failure); lease.settle(lease.signal.aborted ? 'cancelled' : 'failed', failure.code) }).finally(async () => {
      if (this.active?.candidateId === candidateId) this.active = null
      try { await this.options.notify(request) } catch { /* Removed projects cannot deliver state. */ }
    })
    this.active = { identity: request, candidateId, task }; lease.setCancellation(() => task)
    return ready.then(() => this.options.state(request))
  }
  private async saveCandidate(context: TopicContentContext, attempt: TopicImageReplacementAttempt, candidate: TopicImageCandidate, bytes: Uint8Array) {
    const identity = { projectId: context.handle, topicId: context.identity.topicId }, manifest = await this.options.repository.load(context)
    if (!manifest) throw conflict()
    const plan = parseChapterPlan({ ...manifest.plan, images: manifest.plan.images.map(image => image.id === attempt.imageId ? { ...image, prompt: attempt.prompt, settings: attempt.settings } : image) })
    try {
      const recorded = await this.options.repository.loadReplacementAttempt(context, attempt.candidateId)
      if (!recorded) throw conflict()
      if (!recorded.acceptedAsset) {
        attempt = parseTopicImageReplacementAttempt({ ...recorded, sequence: recorded.sequence + 1, acceptedAsset: candidate.asset })
        await this.options.repository.saveReplacementAttempt(context, attempt)
      } else { attempt = recorded; this.bindCandidate(attempt, candidate) }
      await this.options.repository.stageAsset(context, plan, attempt.revisionId, candidate.asset, bytes)
      await this.options.repository.saveCandidate(context, candidate)
      await this.options.repository.saveReplacementAttempt(context, { ...attempt, sequence: attempt.sequence + 1, status: 'complete' })
    } catch (error) {
      const failure = safe(error)
      if (failure.code === 'STORAGE') this.pending.set(key(identity), { attempt, candidate, bytes: bytes.slice() })
      throw failure
    }
    this.pending.delete(key(identity)); await this.options.notify(identity)
  }
  private mutation<T>(action: () => Promise<T>): Promise<T> {
    if (this.stopped) throw new ApplicationError('CANCELLED', 'Image work is closed.')
    const release = this.options.ai.reservePublication()
    const task = Promise.resolve().then(action).finally(() => { release(); if (this.storage === task) this.storage = null })
    this.storage = task; return task
  }
  private matches(attempt: TopicImageReplacementAttempt, request: TopicImageCandidateRequest) {
    if (attempt.candidateId !== request.candidateId || attempt.chapterId !== request.chapterId || attempt.expectedRevisionId !== request.revisionId || attempt.imageId !== request.imageId || attempt.expectedImageVersionId !== request.expectedImageVersionId) throw conflict()
  }
  private bindCandidate(attempt: TopicImageReplacementAttempt, candidate: TopicImageCandidate): void {
    if (candidate.projectId !== attempt.projectId || candidate.topicId !== attempt.topicId || candidate.chapterId !== attempt.chapterId || candidate.revisionId !== attempt.revisionId || candidate.candidateId !== attempt.candidateId || candidate.imageId !== attempt.imageId || candidate.expectedRevisionId !== attempt.expectedRevisionId || candidate.expectedImageVersionId !== attempt.expectedImageVersionId || candidate.expectedManifestDigest !== attempt.expectedManifestDigest || candidate.createdAt !== attempt.createdAt || candidate.prompt !== attempt.prompt || candidate.caption !== attempt.caption || candidate.alt !== attempt.alt || JSON.stringify(candidate.settings) !== JSON.stringify(attempt.settings) || !attempt.acceptedAsset || JSON.stringify(candidate.asset) !== JSON.stringify(attempt.acceptedAsset)) throw conflict('The image candidate differs from its durable accepted attempt. Its bytes and original have been preserved.')
  }
  accept(request: AcceptTopicImageReplacementRequest) { return this.mutation(async () => {
    const context = await this.options.repository.resolve(request.projectId, request.topicId), release = this.options.repository.lock(context)
    try {
      if (this.pending.has(key(request))) throw conflict('Retry save or Keep original before accepting this review.')
      const { attempt, candidate } = await this.records(context)
      if (!attempt || !candidate) throw conflict('The completed candidate is no longer available.')
      this.matches(attempt, request)
      this.bindCandidate(attempt, candidate)
      const original = await this.original(context, request)
      if (context.baseline.expectedManifestDigest !== candidate.expectedManifestDigest) throw conflict()
      const plan = parseChapterPlan({ ...original.plan, images: original.plan.images.map(image => image.id === candidate.imageId ? { ...image, prompt: candidate.prompt, settings: candidate.settings ?? image.settings, caption: request.caption, alt: request.alt } : image) })
      const manifest = parseChapterManifest({ ...original, revisionId: candidate.revisionId, outputDirectory: `${context.topicFolder}/content/${candidate.chapterId}/${candidate.revisionId}`, plan,
        images: original.images.map(image => image.imageId === candidate.imageId ? { imageId: image.imageId, status: 'complete', callId: candidate.asset.callId, asset: candidate.asset, ...(image.previousAttempts ? { previousAttempts: image.previousAttempts } : {}) } : image),
        baseline: context.baseline, provenance: { ...original.provenance, runId: candidate.candidateId }, previousRevisionIds: [original.revisionId, ...original.previousRevisionIds] })
      try { await this.options.repository.publish(context, manifest) }
      catch (error) { const failure = safe(error); if (failure.code === 'STORAGE') this.pending.set(key(request), { attempt, candidate, manifest }); throw failure }
      await this.finishPublished(context, attempt, candidate)
      return await this.options.state(request)
    } finally { release(); await this.options.notify(request) }
  }) }
  private async finishPublished(context: TopicContentContext, attempt: TopicImageReplacementAttempt, candidate: TopicImageCandidate) {
    this.pending.delete(key({ projectId: context.handle, topicId: context.identity.topicId }))
    try {
      if (candidate.asset.callId) await this.options.disposition?.(candidate.asset.callId, 'published')
      await this.options.repository.discardReplacement(context, attempt.candidateId)
      this.errors.delete(key({ projectId: context.handle, topicId: context.identity.topicId }))
    } catch { this.errors.set(key({ projectId: context.handle, topicId: context.identity.topicId }), { code: 'STORAGE', message: 'The image is published. Accounting or review cleanup needs attention; the saved chapter remains readable.' }) }
  }
  discard(request: TopicImageCandidateRequest) { return this.mutation(async () => {
    const context = await this.options.repository.resolve(request.projectId, request.topicId), release = this.options.repository.lock(context)
    try {
      const pending = this.pending.get(key(request)), { attempt } = await this.records(context)
      if (!attempt) throw conflict('This image review is no longer available.')
      this.matches(attempt, request)
      const state = await this.options.repository.readState(context)
      await this.options.repository.archiveReplacement(context, attempt.candidateId)
      if (state.recovery.kind === 'pending') {
        if (state.recovery.manifest.provenance.runId !== attempt.candidateId || state.recovery.manifest.revisionId !== attempt.revisionId) throw conflict()
        await this.options.repository.discardPublication(context, attempt.candidateId, attempt.revisionId)
      } else if (state.recovery.kind === 'committed') {
        if (state.manifest?.provenance.runId !== attempt.candidateId || state.manifest.revisionId !== attempt.revisionId) throw conflict()
        await this.options.repository.recover(context)
      } else if (state.recovery.kind === 'conflict') throw conflict('Unknown publication bytes have been preserved. Resolve that conflict before discarding image controls.')
      await this.options.repository.discardReplacement(context, attempt.candidateId)
      if (pending?.candidate?.asset.callId && pending.candidate.asset.callId !== attempt.callId) throw conflict()
      this.pending.delete(key(request)); this.errors.delete(key(request))
      try { if (attempt.callId) await this.options.disposition?.(attempt.callId, state.manifest?.revisionId === attempt.revisionId ? 'published' : 'discarded') }
      catch { this.errors.set(key(request), { code: 'STORAGE', message: 'Image review was cleared. Reported charges remain retained; accounting cleanup needs attention.' }) }
      return await this.options.state(request)
    } finally { release(); await this.options.notify(request) }
  }) }
  retrySave(request: RetryTopicImageReplacementSaveRequest) { return this.mutation(async () => {
    const context = await this.options.repository.resolve(request.projectId, request.topicId), release = this.options.repository.lock(context)
    try {
      const pending = this.pending.get(key(request)), { attempt, candidate } = await this.records(context)
      if (!attempt || request.pendingResultId !== attempt.revisionId) throw conflict('This exact pending save is no longer available.')
      this.matches(attempt, request)
      if (candidate) this.bindCandidate(attempt, candidate)
      if (pending?.manifest) {
        context.baseline = pending.manifest.baseline
        await this.options.repository.publish(context, pending.manifest)
        await this.finishPublished(context, attempt, pending.candidate!)
      } else if (pending?.candidate && pending.bytes) {
        await this.original(context, request)
        await this.saveCandidate(context, attempt, pending.candidate, pending.bytes)
      } else {
        const state = await this.options.repository.readState(context)
        if (['none', 'committed'].includes(state.recovery.kind) && state.manifest?.revisionId === attempt.revisionId && state.manifest.provenance.runId === attempt.candidateId && candidate) {
          if (state.recovery.kind === 'committed') await this.options.repository.recover(context)
          await this.finishPublished(context, attempt, candidate)
          return await this.options.state(request)
        }
        if (state.recovery.kind !== 'pending' || state.recovery.manifest.provenance.runId !== attempt.candidateId || state.recovery.manifest.revisionId !== attempt.revisionId || !candidate) throw conflict('No proven pending image publication can be retried.')
        await this.options.repository.retryPublication(context)
        await this.finishPublished(context, attempt, candidate)
      }
      if (pending?.bytes) this.errors.delete(key(request))
      return await this.options.state(request)
    } finally { release(); await this.options.notify(request) }
  }) }
  async waitForIdle() { await this.active?.task; await this.storage?.catch(() => {}) }
  async dispose() { this.stopped = true; await this.waitForIdle() }
}
