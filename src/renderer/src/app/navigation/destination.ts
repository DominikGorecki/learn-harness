import type { WorkspaceSnapshot } from '../../../../shared/workspace'

/** Session locations use profile handles, never portable .edu project IDs. */
export type AppDestination =
  | { readonly kind: 'dashboard' }
  | { readonly kind: 'project'; readonly projectHandle: string }

export function destinationKey(destination: AppDestination): string {
  return destination.kind === 'dashboard' ? 'dashboard' : JSON.stringify(['project', destination.projectHandle])
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
