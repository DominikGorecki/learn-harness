import { ApplicationError } from '../../shared/contracts'
import type { ModelChoice } from '../../shared/account'
import type { EnginePhase, GenerationSnapshot, OutlineEngineResult, OutlineRun, RunRequest, SaveOutlineRequest, StartOutlineRequest, RewriteOutlineRequest, RewriteTopicRequest } from '../../shared/generation'
import type { SavedOutline } from '../../shared/workspace'
import { parseSavedOutline } from '../../shared/workspace'
import { parseCoverage, parseOutline, localizeTopicOutline } from '../../shared/outline'
import type { ProjectChanges } from '../workspace/ports'
import { parseProjectFileEdits } from '../../shared/project-files'
import { boundedText } from '../../shared/validation'
import type { WorkspaceService } from '../workspace/service'
import type { AiCoordinator, AiLease } from '../ai/coordinator'
import { observeNotification } from '../notifications'

export class GenerationService {
  private runs = new Map<string, OutlineRun>()
  private contexts = new Map<string, { digest: string | null; changes?: ProjectChanges }>()
  private active: { id: string; lease: AiLease | null; task: Promise<void> } | null = null
  private task: Promise<void> | null = null
  private taskLease: AiLease | null = null
  private stopped = false
  private listeners = new Set<(snapshot: GenerationSnapshot) => void>()
  constructor(private readonly options: {
    workspace: WorkspaceService; ai: AiCoordinator; createId(): string; now(): string; beforeStart?(): void; onAccountFailure(error: ApplicationError): void;
    generate(input: { model: ModelChoice; brief: string; path: string; currentOutline: SavedOutline | null; changes?: string; topicId?: string; topicWriteRoot?: string }, signal: AbortSignal, onPhase: (phase: EnginePhase) => void, lease: AiLease): Promise<OutlineEngineResult>
  }) {}
  get(): GenerationSnapshot { return structuredClone({ runs: [...this.runs.values()], activeRunId: this.active?.id ?? null }) }
  subscribe(listener: (snapshot: GenerationSnapshot) => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private emit(): void { for (const listener of this.listeners) observeNotification(() => listener(this.get())) }
  private update(run: OutlineRun, values: Partial<OutlineRun>): void { Object.assign(run, values); this.emit() }
  rewrite(request: RewriteOutlineRequest): GenerationSnapshot {
    if (this.runs.get(request.projectId)?.status === 'unsaved') throw new ApplicationError('CONFLICT', 'Save your generated outline before requesting changes to it.')
    return this.start({ projectId: request.projectId, modelId: request.modelId, brief: '', replace: true }, request.changes)
  }
  rewriteTopic(request: RewriteTopicRequest): GenerationSnapshot {
    if (this.runs.get(request.projectId)?.status === 'unsaved') throw new ApplicationError('CONFLICT', 'Save your generated outline before requesting changes to it.')
    return this.start({ projectId: request.projectId, modelId: request.modelId, brief: '', replace: true }, request.changes, request.topicId)
  }
  start(request: StartOutlineRequest, changes?: string, topicId?: string): GenerationSnapshot {
    if (this.stopped) throw new ApplicationError('UNAVAILABLE', 'Outline creation has stopped.')
    if (this.active) throw new ApplicationError('BUSY', 'An outline is already being created. Finish or cancel it before starting another.')
    if (!this.options.workspace.get().projects.some(project => project.id === request.projectId)) throw new ApplicationError('NOT_FOUND', 'Open this project before creating an outline.')
    const previous = this.runs.get(request.projectId)
    if (previous?.status === 'unsaved' && !request.replace) throw new ApplicationError('CONFLICT', 'Save your generated outline or confirm replacing it before starting again.')
    this.options.beforeStart?.() // Transitional account guards run before any domain state is replaced.
    const run: OutlineRun = { id: this.options.createId(), projectId: request.projectId, brief: request.brief, modelId: request.modelId,
      status: 'preparing', message: 'Preparing your learning project…', errorCode: null, result: null, question: null, coverage: null, ...(topicId ? { topicId } : {}) }
    const selected = this.options.workspace.get().activeProject?.selectedModel
    const { lease } = this.options.ai.claim({ kind: topicId ? 'rewrite-topic' : changes !== undefined ? 'rewrite-outline' : 'create-outline',
      runId: run.id, projectId: run.projectId, ...(topicId ? { topicId } : {}),
      model: selected?.id === request.modelId ? selected : { id: request.modelId, name: request.modelId },
      heading: topicId ? 'Rewriting this topic' : changes !== undefined ? 'Rewriting your learning outline' : 'Creating your learning outline',
      requestSummary: (changes ?? request.brief).slice(0, 512) })
    // Own an exact completion promise before notification can synchronously cancel.
    let begin!: () => void
    const ready = new Promise<void>(resolve => { begin = resolve })
    const task = ready.then(() => this.execute(run, request, lease, changes, topicId))
    lease.setCancellation(() => task)
    this.runs.set(request.projectId, run)
    this.contexts.delete(request.projectId)
    this.active = { id: run.id, lease, task }
    this.task = task; this.taskLease = lease
    begin()
    this.emit()
    return this.get()
  }
  private async execute(run: OutlineRun, request: StartOutlineRequest, lease: AiLease, changes?: string, topicId?: string): Promise<void> {
    const signal = lease.signal
    let locked = false, validating = false
    try {
      signal.throwIfAborted()
      const context = await this.options.workspace.prepareOutline(run.projectId, request.modelId, request.brief, request.replace, changes !== undefined, topicId)
      locked = true
      const topicUpdate = topicId ? { topicId, folder: context.topicFolder ?? null } : undefined
      const topicWriteRoot = topicId ? context.topicFolder?.folder ?? topicId : undefined
      this.contexts.set(run.projectId, { digest: context.digest })
      signal.throwIfAborted()
      this.update(run, { brief: context.brief })
      signal.throwIfAborted()
      const outcome = await this.options.generate({ model: context.model, brief: context.brief, path: context.path, currentOutline: context.currentOutline, changes, ...(topicId ? { topicId, topicWriteRoot } : {}) }, signal, phase => {
        if (!signal.aborted && this.active?.id === run.id && lease.phase(phase)) this.update(run, { status: phase, message: phase === 'examining' ? 'Exploring your project material…' : phase === 'planning' ? topicId ? 'Rewriting this topic…' : changes !== undefined ? 'Rewriting your learning outline…' : 'Building your learning outline…' : 'Checking the lessons and module plans…' })
      }, lease)
      signal.throwIfAborted()
      validating = true
      if (!lease.phase('validating', { id: 'domain-validation', label: 'Checking lessons and publication scope', state: 'running' })) signal.throwIfAborted()
      this.update(run, { status: 'validating', message: 'Checking the lessons and module plans…' })
      signal.throwIfAborted()
      const coverage = parseCoverage(outcome.coverage ?? { files: [], limitations: ['This outline was created from your learning description. No project files were read.'] })
      this.update(run, { coverage })
      signal.throwIfAborted()
      if (outcome.kind === 'needs-details') {
        const message = boundedText(outcome.reason, 'Reason', 2000), question = boundedText(outcome.question, 'Question', 2000)
        lease.phase('validating', { id: 'domain-validation', label: 'Checking lessons and publication scope', state: 'completed' })
        validating = false
        this.update(run, { status: 'needs-details', message, question })
        return
      }
      const document = topicId ? localizeTopicOutline(context.currentOutline!.document, parseOutline(outcome.document), topicId) : outcome.document
      const result = parseSavedOutline({ generatedAt: this.options.now(), model: context.model, brief: context.brief, document,
        inferredBrief: changes !== undefined ? context.currentOutline!.inferredBrief : context.brief.trim() ? null : `${outcome.document.title}: ${outcome.document.scope}`, coverage })
      const sources = new Set(coverage.files.filter(file => file.status === 'read').map(file => file.path))
      if (result.document.lessons.some(lesson => lesson.sources.some(path => !sources.has(path)))) throw new ApplicationError('INVALID_INPUT', 'The outline refers to material that was not read. Please try again.')
      const projectChanges = { edits: parseProjectFileEdits(outcome.projectEdits ?? [], topicWriteRoot), topic: topicUpdate }
      this.contexts.set(run.projectId, { digest: context.digest, changes: projectChanges })
      signal.throwIfAborted()
      lease.phase('validating', { id: 'domain-validation', label: 'Checking lessons and publication scope', state: 'completed' })
      validating = false
      if (!lease.phase('saving', { id: 'domain-save', label: 'Saving your outline', state: 'running' })) throw new ApplicationError('CANCELLED', 'Outline creation cancelled. Your previous outline is unchanged.')
      this.update(run, { status: 'saving', message: 'Saving your outline…', result })
      try {
        await this.options.workspace.saveOutline(run.projectId, result, context.digest, false, projectChanges)
        lease.phase('saving', { id: 'domain-save', label: 'Saving your outline', state: 'completed' })
        this.update(run, { status: 'saved', message: topicId ? 'Topic saved. Other topics and outline sections are unchanged.' : 'Outline saved to your project.' })
      } catch (error) { lease.phase('saving', { id: 'domain-save', label: 'Saving your outline', state: 'failed' }); this.saveFailure(run, error) }
    } catch (error) {
      const safe = signal.aborted ? new ApplicationError('CANCELLED', 'Outline creation cancelled. Your previous outline is unchanged.') :
        error instanceof ApplicationError ? error : new ApplicationError('INTERNAL', 'Outline creation could not finish. Your previous outline is unchanged.')
      if (validating && !signal.aborted) lease.phase('validating', { id: 'domain-validation', label: 'Checking lessons and publication scope', state: 'failed' })
      this.update(run, { status: safe.code === 'CANCELLED' ? 'cancelled' : 'failed', message: safe.message, errorCode: safe.code })
      if (['AUTH_REQUIRED', 'PLAN_PERMISSION_REQUIRED', 'ACCESS_RESTRICTED', 'USAGE_LIMIT'].includes(safe.code)) observeNotification(() => this.options.onAccountFailure(safe))
    } finally {
      if (locked) this.options.workspace.releaseOutline(run.projectId)
      if (this.active?.id === run.id) this.active = null
      lease.settle(run.status === 'saved' || run.status === 'unsaved' || run.status === 'needs-details' || run.status === 'cancelled' ? run.status : 'failed', run.errorCode ?? undefined)
      this.emit()
    }
  }
  private saveFailure(run: OutlineRun, error: unknown): void {
    this.update(run, { status: 'unsaved', errorCode: error instanceof ApplicationError ? error.code : 'STORAGE',
      message: `Your outline is ready but could not be saved. ${error instanceof ApplicationError ? error.message : 'Check the folder and try saving again.'}` })
  }
  private find(request: RunRequest): OutlineRun {
    const run = this.runs.get(request.projectId)
    if (!run || run.id !== request.runId) throw new ApplicationError('NOT_FOUND', 'This outline request is no longer current.')
    return run
  }
  async cancel(request: RunRequest): Promise<GenerationSnapshot> {
    const run = this.find(request)
    if (run.status === 'saving') throw new ApplicationError('BUSY', 'The outline is being saved. Wait for the save to finish.')
    if (this.active?.id === run.id && this.active.lease) await this.options.ai.cancel({ operationId: this.active.lease.operationId })
    return this.get()
  }
  async retrySave(request: SaveOutlineRequest): Promise<GenerationSnapshot> {
    if (this.stopped) throw new ApplicationError('UNAVAILABLE', 'Outline saving has stopped.')
    if (this.active) throw new ApplicationError('BUSY', 'Wait for the current outline operation to finish.')
    const run = this.find(request)
    const context = this.contexts.get(run.projectId)
    if (run.status !== 'unsaved' || !run.result || !context) throw new ApplicationError('UNAVAILABLE', 'There is no unsaved outline to retry.')
    if (request.replaceChanged && run.errorCode !== 'CONFLICT') throw new ApplicationError('INVALID_INPUT', 'Only a detected save conflict can use replacement recovery.')
    const result = run.result
    let begin!: () => void
    const ready = new Promise<void>(resolve => { begin = resolve })
    const task = ready.then(async () => {
      try {
        await this.options.workspace.saveOutline(run.projectId, result, context.digest, request.replaceChanged, context.changes)
        this.update(run, { status: 'saved', message: 'Outline saved to your project.' })
      } catch (error) { this.saveFailure(run, error) }
      finally { if (this.active?.id === run.id) this.active = null; this.emit() }
    })
    this.active = { id: run.id, lease: null, task }; this.task = task; this.taskLease = null
    begin(); this.update(run, { status: 'saving', message: 'Saving your outline…', errorCode: null })
    await task
    return this.get()
  }
  async waitForIdle(): Promise<void> { const task = this.task, lease = this.taskLease; await task; if (lease) await lease.settled }
  dispose(): void {
    this.stopped = true
    if (this.active?.lease && this.options.ai.get().active?.phase !== 'saving') void this.options.ai.cancel({ operationId: this.active.lease.operationId }).catch(() => {})
    this.listeners.clear()
  }
}
