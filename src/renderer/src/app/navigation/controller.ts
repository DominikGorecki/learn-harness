import type { WorkspaceSnapshot } from '../../../../shared/workspace'
import { destinationFromWorkspace, resolveDestination, sameDestination } from './destination'
import type { AppDestination } from './destination'
import { beginNavigation, createNavigationState, reconcileNavigation, settleNavigation } from './transaction'
import type { NavigationIntent, NavigationState, NavigationTransaction } from './transaction'
import { currentDestination } from './history'

/** Observations are synchronous; owned target events never manufacture visits. */
export class NavigationController {
  state: NavigationState<AppDestination> = createNavigationState()
  private executing: number | null = null
  notice: string | null = null
  constructor(private readonly changed: (state: NavigationState<AppDestination>) => void) {}
  private publish(next: NavigationState<AppDestination>) {
    if (next !== this.state) { this.state = next; this.changed(next) }
  }
  observe(snapshot: WorkspaceSnapshot) {
    const base = destinationFromWorkspace(snapshot), pending = this.state.pending
    const current = currentDestination(this.state.history)
    if (pending && this.executing === pending.token) {
      if (!pending.destination || resolveDestination(pending.destination, snapshot) || current && resolveDestination(current, snapshot)) return
    }
    const resolved = current ? resolveDestination(current, snapshot) : null
    if (resolved?.notice) this.notice = resolved.notice
    else if (!resolved) this.notice = null
    const next = reconcileNavigation(this.state, resolved?.destination ?? base, sameDestination)
    // Same-project content changes do not revoke an intent waiting at its guard.
    const sameIdentity = current && sameDestination(current.kind === 'topic' ? { kind: 'project', projectHandle: current.projectHandle } : current, base)
    this.publish(pending && sameIdentity ? { ...next, pending } : next)
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
    const target = pending?.destination ?? (reply ? destinationFromWorkspace(reply) : null)
    const resolved = target && latest ? resolveDestination(target, latest) : null
    const accepted = pending?.token === token && reply !== null && latest !== null && resolved !== null &&
      sameDestination(destinationFromWorkspace(reply), destinationFromWorkspace(latest))
    if (accepted) this.notice = resolved.notice
    this.publish(settleNavigation(this.state, token, accepted
      ? pending.destination && !sameDestination(pending.destination, resolved.destination)
        ? { kind: 'canonicalized', requested: pending.destination, destination: resolved.destination }
        : { kind: 'accepted', destination: resolved.destination }
      : { kind: 'rejected' }, sameDestination))
    if (this.executing === token) this.executing = null
    if (latest && !accepted) this.observe(latest)
    return Boolean(accepted)
  }
}
