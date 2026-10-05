import { ApplicationError } from '../../shared/contracts'
import type { ModelChoice } from '../../shared/account'
import type { EnginePhase, GenerationSnapshot, OutlineEngineResult, OutlineRun, RunRequest, SaveOutlineRequest, StartOutlineRequest, RewriteOutlineRequest } from '../../shared/generation'
import type { SavedOutline } from '../../shared/workspace'
import { parseSavedOutline } from '../../shared/workspace'
import { parseCoverage } from '../../shared/outline'
import { boundedText } from '../../shared/validation'
import type { WorkspaceService } from '../workspace/service'

export class GenerationService {
  private runs = new Map<string, OutlineRun>()
  private contexts = new Map<string, { digest: string | null }>()
  private active: { id: string; controller: AbortController } | null = null
  private task: Promise<void> | null = null
  private listeners = new Set<(snapshot: GenerationSnapshot) => void>()
  constructor(private readonly options: {
    workspace: WorkspaceService; createId(): string; now(): string; onBusy(busy: boolean): void; onAccountFailure(error: ApplicationError): void;
    generate(input: { model: ModelChoice; brief: string; path: string; currentOutline: SavedOutline | null; changes?: string }, signal: AbortSignal, onPhase: (phase: EnginePhase) => void): Promise<OutlineEngineResult>
  }) {}
  get(): GenerationSnapshot { return structuredClone({ runs: [...this.runs.values()], activeRunId: this.active?.id ?? null }) }
  subscribe(listener: (snapshot: GenerationSnapshot) => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private emit(): void { for (const listener of this.listeners) listener(this.get()) }
  private update(run: OutlineRun, values: Partial<OutlineRun>): void { Object.assign(run, values); this.emit() }
  rewrite(request: RewriteOutlineRequest): GenerationSnapshot {
    if (this.runs.get(request.projectId)?.status === 'unsaved') throw new ApplicationError('CONFLICT', 'Save your generated outline before requesting changes to it.')
    return this.start({ projectId: request.projectId, modelId: request.modelId, brief: '', replace: true }, request.changes)
  }
  start(request: StartOutlineRequest, changes?: string): GenerationSnapshot {
    if (this.active) throw new ApplicationError('BUSY', 'An outline is already being created. Finish or cancel it before starting another.')
    if (!this.options.workspace.get().projects.some(project => project.id === request.projectId)) throw new ApplicationError('NOT_FOUND', 'Open this project before creating an outline.')
    const previous = this.runs.get(request.projectId)
    if (previous?.status === 'unsaved' && !request.replace) throw new ApplicationError('CONFLICT', 'Save your generated outline or confirm replacing it before starting again.')
    const controller = new AbortController()
    const run: OutlineRun = { id: this.options.createId(), projectId: request.projectId, brief: request.brief, modelId: request.modelId,
      status: 'preparing', message: 'Preparing your learning project…', errorCode: null, result: null, question: null, coverage: null }
    this.runs.set(request.projectId, run)
    this.contexts.delete(request.projectId)
    this.active = { id: run.id, controller }
    this.options.onBusy(true)
    this.emit()
    this.task = this.execute(run, request, controller.signal, changes)
    return this.get()
  }
  private async execute(run: OutlineRun, request: StartOutlineRequest, signal: AbortSignal, changes?: string): Promise<void> {
    let locked = false
    try {
      const context = await this.options.workspace.prepareOutline(run.projectId, request.modelId, request.brief, request.replace, changes !== undefined)
      locked = true
      this.contexts.set(run.projectId, { digest: context.digest })
      signal.throwIfAborted()
      this.update(run, { brief: context.brief })
      const outcome = await this.options.generate({ model: context.model, brief: context.brief, path: context.path, currentOutline: context.currentOutline, changes }, signal, phase => {
        if (!signal.aborted && this.active?.id === run.id) this.update(run, { status: phase, message: phase === 'examining' ? 'Exploring your project material…' : phase === 'planning' ? changes !== undefined ? 'Rewriting your learning outline…' : 'Building your learning outline…' : 'Checking the lessons and module plans…' })
      })
      signal.throwIfAborted()
      const coverage = parseCoverage(outcome.coverage ?? { files: [], limitations: ['This outline was created from your learning description. No project files were read.'] })
      this.update(run, { coverage })
      if (outcome.kind === 'needs-details') {
        this.update(run, { status: 'needs-details', message: boundedText(outcome.reason, 'Reason', 2000), question: boundedText(outcome.question, 'Question', 2000) })
        return
      }
      const result = parseSavedOutline({ generatedAt: this.options.now(), model: context.model, brief: context.brief, document: outcome.document,
        inferredBrief: changes !== undefined ? context.currentOutline!.inferredBrief : context.brief.trim() ? null : `${outcome.document.title}: ${outcome.document.scope}`, coverage })
      const sources = new Set(coverage.files.filter(file => file.status === 'read').map(file => file.path))
      if (result.document.lessons.some(lesson => lesson.sources.some(path => !sources.has(path)))) throw new ApplicationError('INVALID_INPUT', 'The outline refers to material that was not read. Please try again.')
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
  async cancel(request: RunRequest): Promise<GenerationSnapshot> {
    const run = this.find(request)
    if (run.status === 'saving') throw new ApplicationError('BUSY', 'The outline is being saved. Wait for the save to finish.')
    if (this.active?.id === run.id) { this.active.controller.abort(); await this.task }
    return this.get()
  }
  async retrySave(request: SaveOutlineRequest): Promise<GenerationSnapshot> {
    if (this.active) throw new ApplicationError('BUSY', 'Wait for the current outline operation to finish.')
    const run = this.find(request)
    const context = this.contexts.get(run.projectId)
    if (run.status !== 'unsaved' || !run.result || !context) throw new ApplicationError('UNAVAILABLE', 'There is no unsaved outline to retry.')
    if (request.replaceChanged && run.errorCode !== 'CONFLICT') throw new ApplicationError('INVALID_INPUT', 'Only a detected save conflict can use replacement recovery.')
    this.active = { id: run.id, controller: new AbortController() }
    this.update(run, { status: 'saving', message: 'Saving your outline…', errorCode: null })
    try {
      await this.options.workspace.saveOutline(run.projectId, run.result, context.digest, request.replaceChanged)
      this.update(run, { status: 'saved', message: 'Outline saved to your project.' })
    } catch (error) { this.saveFailure(run, error) }
    finally { this.active = null; this.emit() }
    return this.get()
  }
  async waitForIdle(): Promise<void> { await this.task }
  dispose(): void { this.active?.controller.abort(); this.listeners.clear() }
}
