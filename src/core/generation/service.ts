import { ApplicationError } from '../../shared/contracts'
import type { ModelChoice } from '../../shared/account'
import type { EnginePhase, GenerationSnapshot, OutlineEngineResult, OutlineRun, RunRequest, StartOutlineRequest } from '../../shared/generation'
import { parseSavedOutline } from '../../shared/workspace'
import type { WorkspaceService } from '../workspace/service'

export class GenerationService {
  private runs = new Map<string, OutlineRun>()
  private contexts = new Map<string, { digest: string | null }>()
  private active: { id: string; controller: AbortController } | null = null
  private task: Promise<void> | null = null
  private listeners = new Set<(snapshot: GenerationSnapshot) => void>()
  constructor(private readonly options: {
    workspace: WorkspaceService; createId(): string; now(): string; onBusy(busy: boolean): void; onAccountFailure(error: ApplicationError): void;
    generate(input: { model: ModelChoice; brief: string; path: string }, signal: AbortSignal, onPhase: (phase: EnginePhase) => void): Promise<OutlineEngineResult>
  }) {}
  get(): GenerationSnapshot { return structuredClone({ runs: [...this.runs.values()], activeRunId: this.active?.id ?? null }) }
  subscribe(listener: (snapshot: GenerationSnapshot) => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private emit(): void { for (const listener of this.listeners) listener(this.get()) }
  private update(run: OutlineRun, values: Partial<OutlineRun>): void { Object.assign(run, values); this.emit() }
  start(request: StartOutlineRequest): GenerationSnapshot {
    if (this.active) throw new ApplicationError('BUSY', 'An outline is already being created. Finish or cancel it before starting another.')
    if (!request.brief.trim()) throw new ApplicationError('INVALID_INPUT', 'Add a topic or a question to start your outline.')
    if (!this.options.workspace.get().projects.some(project => project.id === request.projectId)) throw new ApplicationError('NOT_FOUND', 'Open this project before creating an outline.')
    const previous = this.runs.get(request.projectId)
    if (previous?.status === 'unsaved' && !request.replace) throw new ApplicationError('CONFLICT', 'Save your generated outline or confirm replacing it before starting again.')
    const controller = new AbortController()
    const run: OutlineRun = { id: this.options.createId(), projectId: request.projectId, brief: request.brief, modelId: request.modelId,
      status: 'preparing', message: 'Preparing your learning project…', errorCode: null, result: null, question: null }
    this.runs.set(request.projectId, run)
    this.contexts.delete(request.projectId)
    this.active = { id: run.id, controller }
    this.options.onBusy(true)
    this.emit()
    this.task = this.execute(run, request, controller.signal)
    return this.get()
  }
  private async execute(run: OutlineRun, request: StartOutlineRequest, signal: AbortSignal): Promise<void> {
    let locked = false
    try {
      const context = await this.options.workspace.prepareOutline(run.projectId, request.modelId, request.brief, request.replace)
      locked = true
      this.contexts.set(run.projectId, { digest: context.digest })
      signal.throwIfAborted()
      const outcome = await this.options.generate({ model: context.model, brief: request.brief, path: context.path }, signal, phase => {
        if (!signal.aborted && this.active?.id === run.id) this.update(run, { status: phase, message: phase === 'planning' ? 'Building your learning outline…' : 'Checking the lessons and module plans…' })
      })
      signal.throwIfAborted()
      if (outcome.kind === 'needs-details') {
        this.update(run, { status: 'needs-details', message: outcome.reason, question: outcome.question })
        return
      }
      const result = parseSavedOutline({ generatedAt: this.options.now(), model: context.model, brief: request.brief, document: outcome.document,
        coverage: { files: [], limitations: ['This outline was created from your learning description. No project files were read.'] } })
      this.update(run, { status: 'saving', message: 'Saving your outline…', result })
      try {
        await this.options.workspace.saveOutline(run.projectId, result, context.digest)
        this.update(run, { status: 'saved', message: 'Outline saved to your project.' })
      } catch (error) { this.saveFailure(run, error) }
    } catch (error) {
      const safe = signal.aborted ? new ApplicationError('CANCELLED', 'Outline creation cancelled. Your previous outline is unchanged.') :
        error instanceof ApplicationError ? error : new ApplicationError('INTERNAL', 'Outline creation could not finish. Your previous outline is unchanged.')
      this.update(run, { status: safe.code === 'CANCELLED' ? 'cancelled' : 'failed', message: safe.message, errorCode: safe.code })
      if (['AUTH_REQUIRED', 'PLAN_PERMISSION_REQUIRED', 'ACCESS_RESTRICTED', 'USAGE_LIMIT'].includes(safe.code)) this.options.onAccountFailure(safe)
    } finally {
      if (locked) this.options.workspace.releaseOutline(run.projectId)
      this.active = null
      this.options.onBusy(false)
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
  cancel(request: RunRequest): GenerationSnapshot {
    const run = this.find(request)
    if (run.status === 'saving') throw new ApplicationError('BUSY', 'The outline is being saved. Wait for the save to finish.')
    if (this.active?.id === run.id) this.active.controller.abort()
    return this.get()
  }
  async retrySave(request: RunRequest): Promise<GenerationSnapshot> {
    if (this.active) throw new ApplicationError('BUSY', 'Wait for the current outline operation to finish.')
    const run = this.find(request)
    const context = this.contexts.get(run.projectId)
    if (run.status !== 'unsaved' || !run.result || !context) throw new ApplicationError('UNAVAILABLE', 'There is no unsaved outline to retry.')
    this.active = { id: run.id, controller: new AbortController() }
    this.update(run, { status: 'saving', message: 'Saving your outline…', errorCode: null })
    try {
      await this.options.workspace.saveOutline(run.projectId, run.result, context.digest)
      this.update(run, { status: 'saved', message: 'Outline saved to your project.' })
    } catch (error) { this.saveFailure(run, error) }
    finally { this.active = null; this.emit() }
    return this.get()
  }
  async waitForIdle(): Promise<void> { await this.task }
  dispose(): void { this.active?.controller.abort(); this.listeners.clear() }
}
