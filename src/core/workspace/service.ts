import { ApplicationError } from '../../shared/contracts'
import type { ModelChoice } from '../../shared/account'
import { parseSavedOutline } from '../../shared/workspace'
import type { ProjectDocument, ProjectSnapshot, ProjectSummary, SavedOutline, WorkspaceSnapshot } from '../../shared/workspace'
import type { LoadedProject, ProjectRegistry, ProjectStorage, RegisteredProject } from './ports'

export class WorkspaceService {
  private entries: RegisteredProject[] = []
  private loaded = new Map<string, LoadedProject>()
  private availability = new Map<string, ProjectSummary['availability']>()
  private active: ProjectSnapshot | null = null
  private issue: string | null = null
  private queue: Promise<unknown> = Promise.resolve()
  private listeners = new Set<(snapshot: WorkspaceSnapshot) => void>()
  private generationLocks = new Set<string>()

  constructor(private readonly options: {
    registry: ProjectRegistry; storage: ProjectStorage; models(): ModelChoice[]; createId(): string; now(): string
  }) {}

  async initialize(): Promise<void> {
    try { this.entries = await this.options.registry.read(); this.issue = null }
    catch (error) { this.issue = error instanceof ApplicationError ? error.message : 'The project list could not be opened.' }
    this.emit()
  }

  private summary(entry: RegisteredProject): ProjectSummary {
    return { id: entry.id, name: entry.name, folderPath: entry.path, lastOpenedAt: entry.lastOpenedAt,
      availability: this.availability.get(entry.id) ?? 'available', hasOutline: entry.hasOutline }
  }

  get(): WorkspaceSnapshot {
    return structuredClone({ projects: this.entries.map(entry => this.summary(entry)), activeProject: this.active, issue: this.issue })
  }
  subscribe(listener: (snapshot: WorkspaceSnapshot) => void): () => void {
    this.listeners.add(listener); return () => { this.listeners.delete(listener) }
  }
  private emit(): void { for (const listener of this.listeners) listener(this.get()) }
  private serial<T>(action: () => Promise<T>): Promise<T> {
    const next = this.queue.then(action, action)
    this.queue = next.then(() => undefined, () => undefined)
    return next
  }
  private entry(id: string): RegisteredProject {
    const entry = this.entries.find(entry => entry.id === id)
    if (!entry) throw new ApplicationError('NOT_FOUND', 'Open this project folder before using it.')
    return entry
  }
  private async remember(entry: RegisteredProject): Promise<void> {
    const next = [entry, ...this.entries.filter(value => value.id !== entry.id)]
    await this.options.registry.write(next)
    this.entries = next
  }
  private snapshot(entry: RegisteredProject, loaded: LoadedProject): ProjectSnapshot {
    return { ...this.summary(entry), availability: 'available', name: loaded.document?.name ?? entry.name,
      projectId: loaded.document?.projectId ?? null, writable: loaded.writable,
      issue: loaded.writable ? null : 'This project is read-only. You can read saved work; saving needs a writable folder.',
      sourceHint: loaded.sourceHint, selectedModel: loaded.document?.selectedModel ?? null, brief: loaded.document?.brief ?? '',
      outline: loaded.document?.outline ?? null, revision: loaded.document?.revision ?? 0, hasOutline: Boolean(loaded.document?.outline) }
  }
  private async activate(entry: RegisteredProject): Promise<void> {
    let loaded: LoadedProject | undefined
    let issue: ApplicationError | undefined
    try {
      loaded = await this.options.storage.load(entry.path)
      if (entry.projectId && loaded.document && entry.projectId !== loaded.document.projectId) {
        throw new ApplicationError('CONFLICT', 'This location contains a different learning project. Locate the original folder to reconnect it.')
      }
    } catch (error) { issue = error instanceof ApplicationError ? error : new ApplicationError('STORAGE', 'The project could not be opened.') }
    if (issue || !loaded) {
      const availability = issue?.code === 'NOT_FOUND' ? 'missing' : 'unreadable'
      this.availability.set(entry.id, availability)
      await this.remember(entry)
      this.loaded.delete(entry.id)
      this.active = { ...this.summary(entry), projectId: entry.projectId, writable: false, issue: issue?.message ?? 'The project could not be opened.',
        sourceHint: 'unavailable', selectedModel: null, brief: '', outline: null, revision: 0 }
    } else {
      const updated = { ...entry, name: loaded.document?.name ?? entry.name, projectId: loaded.document?.projectId ?? entry.projectId,
        hasOutline: Boolean(loaded.document?.outline), lastOpenedAt: this.options.now() }
      await this.remember(updated)
      this.availability.set(entry.id, 'available')
      this.loaded.set(entry.id, loaded)
      this.active = this.snapshot(updated, loaded)
    }
    this.emit()
  }

  open(path: string): Promise<WorkspaceSnapshot> {
    return this.serial(async () => {
      const location = await this.options.storage.canonicalPath(path)
      const entry = this.entries.find(entry => entry.path === location.path) ?? {
        id: this.options.createId(), path: location.path, name: location.name, projectId: null,
        lastOpenedAt: this.options.now(), hasOutline: false
      }
      await this.activate(entry)
      return this.get()
    })
  }
  select(id: string): Promise<WorkspaceSnapshot> {
    return this.serial(async () => { await this.activate(this.entry(id)); return this.get() })
  }
  dashboard(): Promise<WorkspaceSnapshot> {
    return this.serial(async () => { this.active = null; this.emit(); return this.get() })
  }
  locate(id: string, path: string): Promise<WorkspaceSnapshot> {
    return this.serial(async () => {
      this.mutable(id)
      const entry = this.entry(id)
      const location = await this.options.storage.canonicalPath(path)
      const duplicate = this.entries.find(value => value.path === location.path && value.id !== id)
      if (duplicate) throw new ApplicationError('CONFLICT', 'That folder is already open as another project.')
      const loaded = await this.options.storage.load(location.path)
      if (entry.projectId && loaded.document?.projectId !== entry.projectId) throw new ApplicationError('CONFLICT', 'Choose the folder containing this learning project’s original .edu state.')
      await this.activate({ ...entry, path: location.path })
      return this.get()
    })
  }
  private async updateDocument(id: string, update: (document: ProjectDocument) => ProjectDocument): Promise<WorkspaceSnapshot> {
    const entry = this.entry(id)
    const loaded = this.loaded.get(id) ?? await this.options.storage.load(entry.path)
    if (!loaded.writable) throw new ApplicationError('STORAGE', 'This project is read-only. Check its folder permissions before saving.')
    const now = this.options.now()
    const previous = loaded.document
    const document = update(previous ?? { version: 1, projectId: this.options.createId(), revision: 0, name: entry.name,
      createdAt: now, updatedAt: now, selectedModel: null, brief: '', outline: null })
    const saved = await this.options.storage.save(entry.path, { ...document, revision: (previous?.revision ?? 0) + 1, updatedAt: now }, loaded.digest)
    this.loaded.set(id, saved)
    const updated = { ...entry, name: saved.document!.name, projectId: saved.document!.projectId, hasOutline: Boolean(saved.document!.outline) }
    try { await this.remember(updated) }
    catch {
      // The portable document is already durable. Do not report that save as lost
      // just because the application-local recent-project index failed afterward.
      this.entries = [updated, ...this.entries.filter(value => value.id !== updated.id)]
      this.issue = 'Your project was saved, but the recent project list could not be updated. Check the application profile permissions.'
    }
    if (this.active?.id === id) this.active = this.snapshot(updated, saved)
    this.emit()
    return this.get()
  }
  setModel(id: string, modelId: string): Promise<WorkspaceSnapshot> {
    return this.serial(async () => {
      this.mutable(id)
      const model = this.options.models().find(model => model.id === modelId)
      if (!model) throw new ApplicationError('UNAVAILABLE', 'Connect ChatGPT and choose a currently available model.')
      return this.updateDocument(id, document => ({ ...document, selectedModel: { ...model } }))
    })
  }
  saveBrief(id: string, brief: string): Promise<WorkspaceSnapshot> {
    return this.serial(() => { this.mutable(id); return this.updateDocument(id, document => ({ ...document, brief })) })
  }
  private mutable(id: string): void {
    if (this.generationLocks.has(id)) throw new ApplicationError('BUSY', 'Finish or cancel this outline before changing its project settings.')
  }
  prepareOutline(id: string, modelId: string, brief: string, replace: boolean): Promise<{ path: string; digest: string | null; model: ModelChoice }> {
    return this.serial(async () => {
      this.mutable(id)
      const entry = this.entry(id)
      const loaded = await this.options.storage.load(entry.path)
      if (!loaded.writable) throw new ApplicationError('STORAGE', 'This project is read-only. Choose a writable folder before creating an outline.')
      const cached = this.loaded.get(id)
      if (cached && cached.digest !== loaded.digest) throw new ApplicationError('CONFLICT', 'This project changed outside the app. Reopen it before creating an outline.')
      if (loaded.document?.outline && !replace) throw new ApplicationError('CONFLICT', 'Confirm replacement before creating another outline.')
      const model = this.options.models().find(value => value.id === modelId)
      if (!model) throw new ApplicationError('UNAVAILABLE', 'Connect ChatGPT and choose an available model before creating an outline.')
      this.loaded.set(id, loaded)
      await this.updateDocument(id, document => ({ ...document, selectedModel: { ...model }, brief }))
      this.generationLocks.add(id)
      return { path: entry.path, digest: this.loaded.get(id)!.digest, model: { ...model } }
    })
  }
  releaseOutline(id: string): void { this.generationLocks.delete(id) }
  saveOutline(id: string, value: SavedOutline, digest: string | null): Promise<WorkspaceSnapshot> {
    return this.serial(async () => {
      const outline = parseSavedOutline(value)
      const loaded = this.loaded.get(id)
      if (!loaded || loaded.digest !== digest) throw new ApplicationError('CONFLICT', 'The project changed while the outline was being created. Your new outline is still available here.')
      return this.updateDocument(id, document => ({ ...document, name: outline.document.title, brief: outline.brief, outline }))
    })
  }
}
