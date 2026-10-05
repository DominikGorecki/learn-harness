import type { AiActivityEntry, AiActivitySnapshot, AiOperation, AiOperationInput, AiOutcome, AiPhase, AiPreview, CancelAiOperationRequest } from '../../shared/ai/activity'
import { aiLimits, boundAiPreview, parseAiActivitySnapshot, parseAiOperationInput, utf8Bytes } from '../../shared/ai/activity'
import { ApplicationError } from '../../shared/contracts'
import type { ErrorCode } from '../../shared/contracts'

export interface AiProgress {
  operationId: string; projectId?: string; topicId?: string; turn: number; revision: number;
  preview: AiPreview; activity?: AiActivityEntry[]; lastByteAt?: number; abbreviated?: boolean
}
export interface AiLease {
  readonly operationId: string
  readonly signal: AbortSignal
  readonly settled: Promise<AiOutcome>
  /** Must await the actual task/worker cleanup, never await this lease's settled promise. */
  setCancellation(action: () => Promise<void>): void
  phase(phase: AiPhase, activity?: AiActivityEntry): boolean
  progress(update: AiProgress): boolean
  receivedByteAge(ageMs: number): boolean
  settle(outcome: AiOutcome, errorCode?: ErrorCode): boolean
}
export interface AiCoordinatorOptions {
  now: () => number; createId: () => string;
  schedule?: (action: () => void, delayMs: number) => unknown
  cancelScheduled?: (handle: unknown) => void
}
interface Owner {
  lease: AiLease; controller: AbortController; operation: AiOperation; started: number; lastByteAt: number | null;
  cancelAction: (() => Promise<void>) | null; cancellation: Promise<void> | null; cancelling: boolean;
  finish: (outcome: AiOutcome) => void; pending: unknown | null; lastPreviewAt: number; progressTurn: number; progressRevision: number
}
function immutable<T>(value: T): T {
  const clone = JSON.parse(JSON.stringify(value)) as T
  const freeze = (value: unknown): void => { if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) freeze(child) } }
  freeze(clone); return clone
}
export class AiCoordinator {
  private owner: Owner | null = null
  private terminal: AiOperation | null = null
  private revision = 0
  private stopped = false
  private listeners = new Set<(snapshot: AiActivitySnapshot) => void>()
  private deliveries = new Set<unknown>()
  private readonly schedule: (action: () => void, delayMs: number) => unknown
  private readonly cancelScheduled: (handle: unknown) => void
  constructor(private readonly options: AiCoordinatorOptions) {
    this.schedule = options.schedule ?? ((action, delay) => setTimeout(action, delay))
    this.cancelScheduled = options.cancelScheduled ?? (handle => clearTimeout(handle as ReturnType<typeof setTimeout>))
  }
  claim(input: AiOperationInput): { lease: AiLease; reused: boolean } {
    if (this.stopped) throw new ApplicationError('UNAVAILABLE', 'AI activity has stopped.')
    const metadata = parseAiOperationInput(input)
    if (this.owner) {
      if (!this.owner.controller.signal.aborted && metadata.kind.startsWith('test-') && metadata.kind === this.owner.operation.kind) return { lease: this.owner.lease, reused: true }
      throw new ApplicationError('BUSY', 'Another AI action is still running.')
    }
    const operationId = this.options.createId(), started = this.options.now(), controller = new AbortController()
    let finish!: (outcome: AiOutcome) => void
    const settled = new Promise<AiOutcome>(resolve => { finish = resolve })
    const operation: AiOperation = { ...metadata, operationId, sequence: 0, phase: 'preparing', outcome: null, errorCode: null,
      elapsedMs: 0, lastByteAgeMs: null, turn: 0, previewRevision: 0, preview: { kind: 'none' }, abbreviated: false,
      activity: [], omittedActivityCount: 0, canCancel: true }
    const lease: AiLease = Object.freeze({ operationId, signal: controller.signal, settled,
      setCancellation: (action: () => Promise<void>) => { if (this.owner === owner && !owner.controller.signal.aborted) owner.cancelAction = action },
      phase: (phase: AiPhase, activity?: AiActivityEntry) => this.phase(owner, phase, activity),
      progress: (update: AiProgress) => this.progress(owner, update),
      receivedByteAge: (ageMs: number) => {
        if (this.owner !== owner || owner.controller.signal.aborted || !Number.isSafeInteger(ageMs) || ageMs < 0) return false
        // Ages cross process boundaries; absolute utility timestamps never do.
        owner.lastByteAt = Math.max(owner.lastByteAt ?? owner.started, owner.started, this.options.now() - ageMs)
        return true
      },
      settle: (outcome: AiOutcome, errorCode?: ErrorCode) => this.settle(owner, outcome, errorCode) })
    const owner: Owner = { lease, operation, controller, started, lastByteAt: null, finish, cancelAction: null, cancellation: null,
      cancelling: false, pending: null, lastPreviewAt: started, progressTurn: 0, progressRevision: -1 }
    // Ownership is installed before any asynchronous authorization or notification.
    this.owner = owner; this.terminal = null; this.publish(owner)
    return { lease, reused: false }
  }
  isOwner(lease: AiLease): boolean { return this.owner?.lease === lease }
  get(): AiActivitySnapshot {
    const owner = this.owner
    const active = owner ? { ...owner.operation, elapsedMs: Math.max(0, Math.floor(this.options.now() - owner.started)),
      lastByteAgeMs: owner.lastByteAt === null ? null : Math.max(0, Math.floor(this.options.now() - owner.lastByteAt)) } : null
    return immutable(parseAiActivitySnapshot({ revision: this.revision, active, settled: this.terminal }))
  }
  subscribe(listener: (snapshot: AiActivitySnapshot) => void): () => void {
    this.listeners.add(listener); return () => { this.listeners.delete(listener) }
  }
  async cancel(request: CancelAiOperationRequest): Promise<AiActivitySnapshot> {
    const owner = this.owner
    if (!owner || request.operationId !== owner.operation.operationId) throw new ApplicationError('NOT_FOUND', 'This AI action is no longer active.')
    if (owner.operation.phase === 'saving') throw new ApplicationError('BUSY', 'Saving has begun. Wait for the save result.')
    if (!owner.cancellation) {
      if (!owner.cancelAction) throw new ApplicationError('BUSY', 'This AI action is preparing cancellation. Please try again.')
      owner.cancelling = true; owner.operation.phase = 'cancelling'; owner.operation.canCancel = false
      // Defer invocation so even a synchronous throw is caught and concurrent cancel reuses the promise.
      owner.cancellation = Promise.resolve().then(owner.cancelAction).then(() => {
        this.settle(owner, 'cancelled', 'CANCELLED', true)
      }, () => {
        // A cleanup failure does not prove worker settlement. Keep ownership until the owner explicitly settles.
        owner.cancelling = false; owner.operation.phase = 'cancelling'; this.publish(owner)
        throw new ApplicationError('INTERNAL', 'AI cancellation could not finish. Wait for the action to settle.')
      })
      // Abort listeners run synchronously and may reenter cancel: install the promise first.
      this.clearPending(owner); owner.controller.abort(); this.publish(owner)
    }
    await owner.cancellation
    return this.get()
  }
  async dispose(): Promise<void> {
    this.stopped = true
    const owner = this.owner
    if (owner) {
      if (owner.operation.phase === 'saving') await owner.lease.settled
      else { await this.cancel({ operationId: owner.operation.operationId }); await owner.lease.settled }
    }
    this.listeners.clear()
    for (const handle of this.deliveries) this.cancelScheduled(handle)
    this.deliveries.clear()
  }
  private clearPending(owner: Owner): void { if (owner.pending !== null) this.cancelScheduled(owner.pending); owner.pending = null }
  private append(owner: Owner, entries: AiActivityEntry[]): void {
    const history = [...owner.operation.activity]
    for (const entry of entries) {
      const next = { ...entry, label: entry.label.slice(0, aiLimits.labelCharacters) }
      const index = history.findIndex(item => item.id === next.id)
      if (index < 0) history.push(next); else history[index] = next
    }
    const omitted = Math.max(0, history.length - aiLimits.activityEntries)
    owner.operation.omittedActivityCount += omitted
    owner.operation.activity = history.slice(omitted)
  }
  private phase(owner: Owner, phase: AiPhase, activity?: AiActivityEntry): boolean {
    if (this.owner !== owner || owner.controller.signal.aborted || owner.operation.phase === 'saving' && phase !== 'saving' || phase === 'cancelling') return false
    if (phase === 'saving' && owner.operation.kind.startsWith('test-')) throw new ApplicationError('INVALID_INPUT', 'Model diagnostics do not save project output.')
    const previous = owner.operation
    owner.operation = { ...previous, phase, canCancel: phase !== 'saving' }
    if (activity) this.append(owner, [activity])
    try { this.fit(owner); } catch (error) { owner.operation = previous; throw error }
    this.clearPending(owner); this.publish(owner); return true
  }
  private progress(owner: Owner, update: AiProgress): boolean {
    if (this.owner !== owner || owner.controller.signal.aborted || owner.operation.phase === 'saving' || update.operationId !== owner.operation.operationId ||
      update.projectId !== owner.operation.projectId || update.topicId !== owner.operation.topicId || !Number.isSafeInteger(update.turn) || update.turn < 0 ||
      !Number.isSafeInteger(update.revision) || update.revision < 0 || update.turn < owner.progressTurn || update.turn === owner.progressTurn && update.revision <= owner.progressRevision) return false
    const bounded = boundAiPreview(update.preview)
    const previous = owner.operation
    owner.operation = { ...previous, turn: update.turn, previewRevision: update.revision, preview: bounded.preview, abbreviated: bounded.abbreviated || update.abbreviated === true }
    if (update.activity) this.append(owner, update.activity)
    try { this.fit(owner); } catch (error) { owner.operation = previous; throw error }
    if (update.lastByteAt !== undefined) {
      if (!Number.isFinite(update.lastByteAt) || update.lastByteAt < owner.started || update.lastByteAt > this.options.now()) { owner.operation = previous; return false }
      owner.lastByteAt = Math.max(owner.lastByteAt ?? owner.started, update.lastByteAt)
    }
    owner.progressTurn = update.turn; owner.progressRevision = update.revision
    if (owner.pending === null) owner.pending = this.schedule(() => {
      owner.pending = null
      if (this.owner !== owner || owner.cancelling) return
      owner.lastPreviewAt = this.options.now(); this.publish(owner)
    }, Math.max(0, aiLimits.previewIntervalMs - (this.options.now() - owner.lastPreviewAt)))
    return true
  }
  private fit(owner: Owner): void {
    // JSON escaping can multiply text size; include metadata/history in the actual wire cap.
    let budget = aiLimits.previewBytes
    while (utf8Bytes(JSON.stringify({ revision: this.revision + 1, active: owner.operation, settled: null })) > aiLimits.frameBytes && budget > 0) {
      budget = Math.floor(budget / 2)
      const result = boundAiPreview(owner.operation.preview, budget)
      owner.operation.preview = result.preview; owner.operation.abbreviated = true
    }
    parseAiActivitySnapshot({ revision: this.revision, active: owner.operation, settled: null })
  }
  private settle(owner: Owner, outcome: AiOutcome, errorCode?: ErrorCode, fromCancellation = false): boolean {
    if (this.owner !== owner || owner.cancelling && !fromCancellation) return false
    if (owner.controller.signal.aborted && !['failed', 'cancelled'].includes(outcome)) throw new ApplicationError('INVALID_INPUT', 'An aborted AI action cannot publish success.')
    if (outcome === 'saved' && owner.operation.phase !== 'saving' || outcome === 'verified' && !owner.operation.kind.startsWith('test-') ||
      owner.operation.kind.startsWith('test-') && ['saved', 'unsaved', 'needs-details'].includes(outcome) ||
      owner.operation.phase === 'saving' && ['cancelled', 'needs-details'].includes(outcome)) throw new ApplicationError('INVALID_INPUT', 'Invalid AI settlement.')
    this.clearPending(owner)
    const current = this.get().active!
    const activity = current.activity.map(entry => entry.state === 'running' && (outcome === 'failed' || outcome === 'cancelled') ? { ...entry, state: 'failed' as const } : entry)
    const operation: AiOperation = { ...current, activity, outcome, errorCode: errorCode ?? null, canCancel: false, sequence: owner.operation.sequence + 1 }
    parseAiActivitySnapshot({ revision: this.revision + 1, active: null, settled: operation })
    this.terminal = operation; this.owner = null; this.revision++; owner.finish(outcome); this.deliver()
    return true
  }
  private publish(owner: Owner): void { owner.operation.sequence++; this.revision++; this.deliver() }
  private deliver(): void {
    const snapshot = this.get(), listeners = [...this.listeners]
    if (!listeners.length) return
    // Never run subscriber work in a provider callback or await its result.
    const handle = this.schedule(() => {
      this.deliveries.delete(handle)
      for (const listener of listeners) if (this.listeners.has(listener)) {
        try { const result = listener(snapshot) as unknown; if (result && typeof (result as Promise<unknown>).catch === 'function') void (result as Promise<unknown>).catch(() => {}) } catch { /* Presentation cannot change acceptance. */ }
      }
    }, 0)
    this.deliveries.add(handle)
  }
}
