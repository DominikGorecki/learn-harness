import { boundAiPreview } from '../../../../shared/ai/activity'
import type { AiActivitySnapshot, AiOperation, AiPreview, AiPreviewLesson } from '../../../../shared/ai/activity'
import type { OutlineRun } from '../../../../shared/generation'
import type { AccountSnapshot } from '../../../../shared/account'

/** Queries and subscriptions share one monotonic public revision/owner sequence. */
export function newerActivity(current: AiActivitySnapshot | null, next: AiActivitySnapshot): AiActivitySnapshot {
  if (!current) return next
  const previous = current.active ?? current.settled
  const incoming = next.active ?? next.settled
  if (next.revision <= current.revision || previous && incoming && incoming.operationId === previous.operationId && incoming.sequence < previous.sequence) return current
  return next
}

export function aiAdmissionUnavailable(snapshot: AiActivitySnapshot | null): boolean { return !snapshot || Boolean(snapshot.active) }
export function modelTestAdmission(value: AccountSnapshot | null): AccountSnapshot | null { return value?.modelTestStatus === 'testing' ? value : null }
export function projectNavigationState(owner: AiOperation | null, run: OutlineRun | null | undefined, pending: boolean) {
  const projectOwner = owner?.projectId ? owner : null
  const saving = run?.status === 'saving' || projectOwner?.phase === 'saving'
  const busy = pending || Boolean(projectOwner || run)
  return { busy, saving, canProceed: !pending && !saving && (!projectOwner || projectOwner.canCancel) && (!run || Boolean(projectOwner)) }
}

/** Storage retry has no AI lease; the domain run supersedes its historical unsaved outcome. */
export function presentationOutcome(operation: AiOperation, run: OutlineRun | null) {
  if (operation.outcome === 'unsaved' && run && run.id === operation.runId) {
    if (run.status === 'saving') return 'saving' as const
    if (run.status === 'saved') return 'saved' as const
  }
  return operation.outcome ?? operation.phase
}

export function recoveryPreview(run: OutlineRun): { preview: AiPreview; abbreviated: boolean } {
  if (!run.result) return { preview: { kind: 'none' }, abbreviated: false }
  const outline = run.result.document
  let abbreviated = outline.lessons.length > 40
  const projectLesson = (lesson: typeof outline.lessons[number]): AiPreviewLesson => {
    abbreviated ||= lesson.objectives.length > 12 || lesson.modules.length > 12
    return { id: lesson.id, title: lesson.title, question: lesson.question, overview: lesson.overview, objectives: lesson.objectives.slice(0, 12),
      modules: lesson.modules.slice(0, 12).map(({ title, purpose, method, task }) => ({ title, purpose, method, task })) }
  }
  const selected = run.topicId ? outline.lessons.find(lesson => lesson.id === run.topicId) : null
  const preview: AiPreview = run.topicId ? { kind: 'topic', topicId: run.topicId, ...(selected ? { lesson: projectLesson(selected) } : {}) } :
    { kind: 'outline', title: outline.title, overview: outline.overview, lessons: outline.lessons.slice(0, 40).map(projectLesson) }
  const bounded = boundAiPreview(preview)
  return { preview: bounded.preview, abbreviated: abbreviated || bounded.abbreviated }
}

/** Acceptance returns promptly; owner confirmation independently releases the local guard. */
export class AiStartGate {
  private pending = false
  private awaitingReply = false
  private baseline = -1
  private observed = -1
  private changed: (pending: boolean) => void = () => {}
  observe(snapshot: AiActivitySnapshot) {
    if (snapshot.active || snapshot.settled) this.observed = Math.max(this.observed, snapshot.revision)
    if (this.pending && !this.awaitingReply && this.observed > this.baseline) this.release()
  }
  private release() { this.pending = false; this.changed(false) }
  async run<T>(action: () => Promise<T | null>, confirm: () => Promise<void>, active: () => boolean, revision: number, changed: (pending: boolean) => void): Promise<T | null> {
    if (this.pending || active()) return null
    this.pending = true; this.awaitingReply = true; this.baseline = revision; this.changed = changed; changed(true)
    try {
      const value = await action()
      this.awaitingReply = false
      if (value === null) this.release()
      else { if (this.observed > this.baseline) this.release(); void confirm() }
      return value
    } catch (error) { this.awaitingReply = false; this.release(); throw error }
  }
}

export const phaseLabels = {
  preparing: 'Preparing the request', waiting: 'Waiting for a reply', receiving: 'Receiving a draft',
  examining: 'Examining project material', planning: 'Drafting the outline', validating: 'Checking the result',
  saving: 'Saving to your project', cancelling: 'Cancelling and cleaning up', saved: 'Saved to your project',
  verified: 'Model access verified', unsaved: 'Validated result · Not saved', 'needs-details': 'More direction needed',
  failed: 'Request failed', cancelled: 'Request cancelled'
} as const
