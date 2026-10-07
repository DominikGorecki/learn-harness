import type { WorkspaceSnapshot } from '../../../../shared/workspace'

/** Session locations use profile handles, never portable .edu project IDs. */
export type AppDestination =
  | { readonly kind: 'dashboard' }
  | { readonly kind: 'project'; readonly projectHandle: string }
  | { readonly kind: 'topic'; readonly projectHandle: string; readonly topicId: string }

export function destinationKey(destination: AppDestination): string {
  return destination.kind === 'dashboard' ? 'dashboard' : JSON.stringify(destination.kind === 'topic' ? ['topic', destination.projectHandle, destination.topicId] : ['project', destination.projectHandle])
}

export function sameDestination(left: AppDestination, right: AppDestination): boolean {
  return destinationKey(left) === destinationKey(right)
}

/** Known missing/unreadable projects still resolve to their project recovery view. */
export function destinationFromWorkspace(snapshot: WorkspaceSnapshot): AppDestination {
  return snapshot.activeProject
    ? { kind: 'project', projectHandle: snapshot.activeProject.id }
    : { kind: 'dashboard' }
}

/** Resolve reading only against the currently selected authoritative saved document. */
export function resolveDestination(target: AppDestination, snapshot: WorkspaceSnapshot): { destination: AppDestination; notice: string | null } | null {
  const project = snapshot.activeProject
  if (target.kind === 'dashboard') return project ? null : { destination: target, notice: null }
  if (project?.id !== target.projectHandle) return null
  if (target.kind === 'project') return { destination: target, notice: null }
  if (project.availability === 'available' && project.outline?.document.lessons.some(lesson => lesson.id === target.topicId)) return { destination: target, notice: null }
  return { destination: { kind: 'project', projectHandle: project.id }, notice: project.availability === 'available' ? 'This topic is no longer in the saved outline. You are viewing the current learning path.' : null }
}
export function sameProjectReading(target: AppDestination | null, snapshot: WorkspaceSnapshot | null): boolean {
  return Boolean(target && target.kind !== 'dashboard' && snapshot?.activeProject?.id === target.projectHandle && snapshot.activeProject.availability === 'available' && snapshot.activeProject.outline)
}
