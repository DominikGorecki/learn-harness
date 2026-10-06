import type { WorkspaceSnapshot } from '../../../../shared/workspace'
import { destinationFromWorkspace, sameDestination } from './destination'
import type { AppDestination } from './destination'
import { beginNavigation, createNavigationState, reconcileNavigation, settleNavigation } from './transaction'
import type { NavigationIntent, NavigationState, NavigationTransaction } from './transaction'
import { currentDestination } from './history'

/** Observations are synchronous; owned target events never manufacture visits. */
export class NavigationController {
  state: NavigationState<AppDestination> = createNavigationState()
  private executing: number | null = null
  constructor(private readonly changed: (state: NavigationState<AppDestination>) => void) {}
  private publish(next: NavigationState<AppDestination>) {
    if (next !== this.state) { this.state = next; this.changed(next) }
  }
  observe(snapshot: WorkspaceSnapshot) {
    const destination = destinationFromWorkspace(snapshot), pending = this.state.pending
    const current = currentDestination(this.state.history)
    if (pending && this.executing === pending.token) {
      if (!pending.destination || sameDestination(pending.destination, destination) || current && sameDestination(current, destination)) return
    }
    this.publish(reconcileNavigation(this.state, destination, sameDestination))
  }
  begin(intent: NavigationIntent<AppDestination>): NavigationTransaction<AppDestination> | null {
    const previous = this.state
    this.publish(beginNavigation(previous, intent, sameDestination))
    return this.state === previous ? null : this.state.pending
  }
  execute(token: number): boolean {
    if (this.state.pending?.token !== token) return false
    this.executing = token
    return true
  }
  refresh(destination: AppDestination): NavigationTransaction<AppDestination> | null {
    if (this.state.pending || !currentDestination(this.state.history)) return null
    const pending: NavigationTransaction<AppDestination> = { token: this.state.nextToken, kind: 'replace', destination, cursor: this.state.history.cursor }
    this.publish({ ...this.state, pending, nextToken: this.state.nextToken + 1 })
    return pending
  }
  reject(token: number) { this.finish(token, null, null) }
  finish(token: number, reply: WorkspaceSnapshot | null, latest: WorkspaceSnapshot | null): boolean {
    const pending = this.state.pending
    const destination = reply ? destinationFromWorkspace(reply) : null
    const accepted = pending?.token === token && destination !== null && latest !== null &&
      sameDestination(destination, destinationFromWorkspace(latest)) && (!pending.destination || sameDestination(pending.destination, destination))
    this.publish(settleNavigation(this.state, token, accepted ? { kind: 'accepted', destination } : { kind: 'rejected' }, sameDestination))
    if (this.executing === token) this.executing = null
    if (latest && !accepted) this.observe(latest)
    return Boolean(accepted)
  }
}
