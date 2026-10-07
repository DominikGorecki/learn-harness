import { applyHistoryEffect, bootstrapHistory, currentDestination, emptyHistory } from './history'
import type { DestinationEquality, NavigationHistory } from './history'

export type NavigationIntent<D> =
  | { readonly kind: 'push'; readonly destination: D | null }
  | { readonly kind: 'replace'; readonly destination: D }
  | { readonly kind: 'traverse'; readonly offset: -1 | 1 }

export interface NavigationTransaction<D> {
  readonly token: number
  readonly kind: 'push' | 'replace' | 'traverse'
  /** null is permitted only for a chooser whose destination is not yet known. */
  readonly destination: D | null
  readonly cursor: number
}

export interface NavigationState<D> {
  readonly history: NavigationHistory<D>
  readonly pending: NavigationTransaction<D> | null
  readonly nextToken: number
}

export type NavigationOutcome<D> =
  | { readonly kind: 'accepted'; readonly destination: D }
  | { readonly kind: 'canonicalized'; readonly requested: D; readonly destination: D }
  | { readonly kind: 'canceled' | 'rejected' | 'stale' }

export function createNavigationState<D>(): NavigationState<D> {
  return { history: emptyHistory<D>(), pending: null, nextToken: 1 }
}

export function bootstrapNavigation<D>(state: NavigationState<D>, destination: D): NavigationState<D> {
  const history = bootstrapHistory(state.history, destination)
  return history === state.history ? state : { ...state, history }
}

/**
 * Keep the token through guard confirmation and awaited cleanup; do not queue intents.
 * Reject a Saving-blocked intent rather than automatically resuming it after saving.
 */
export function beginNavigation<D>(state: NavigationState<D>, intent: NavigationIntent<D>, equal: DestinationEquality<D>): NavigationState<D> {
  const current = currentDestination(state.history)
  if (state.pending || current === null) return state
  const cursor = intent.kind === 'traverse' ? state.history.cursor + intent.offset : state.history.cursor
  const destination = intent.kind === 'traverse' ? state.history.entries[cursor] ?? null : intent.destination
  if (intent.kind === 'traverse' && destination === null) return state
  if (intent.kind !== 'traverse' && destination !== null && equal(current, destination)) return state
  return { ...state, nextToken: state.nextToken + 1, pending: { token: state.nextToken, kind: intent.kind, destination, cursor } }
}

/**
 * The owner must correlate resolution with the token and latest authoritative state.
 * A returned API snapshot alone cannot authorize acceptance when newer state differs.
 * Workspace subscriptions can precede the API reply and are not themselves visits.
 */
export function settleNavigation<D>(state: NavigationState<D>, token: number, outcome: NavigationOutcome<D>, equal: DestinationEquality<D>): NavigationState<D> {
  const pending = state.pending
  if (!pending || pending.token !== token) return state
  const settled = { ...state, pending: null }
  if (outcome.kind !== 'accepted' && outcome.kind !== 'canonicalized') return settled
  if (pending.destination !== null && !equal(pending.destination, outcome.kind === 'canonicalized' ? outcome.requested : outcome.destination)) return settled
  if (outcome.kind === 'canonicalized' && pending.kind === 'traverse') {
    const entries = [...state.history.entries]
    entries[pending.cursor] = outcome.destination
    return { ...settled, history: { entries, cursor: pending.cursor } }
  }
  const history = applyHistoryEffect(state.history, pending.kind === 'traverse'
    ? { kind: 'traverse', cursor: pending.cursor }
    : { kind: pending.kind, destination: outcome.destination }, equal)
  return { ...settled, history }
}

/**
 * Reconcile only non-owned authoritative changes after ownership correlation.
 * Never call for the expected subscription emitted by an active owned transition.
 * Content updates at the same identity preserve the pending token and Forward.
 */
export function reconcileNavigation<D>(state: NavigationState<D>, destination: D, equal: DestinationEquality<D>): NavigationState<D> {
  if (currentDestination(state.history) === null) return bootstrapNavigation(state, destination)
  const history = applyHistoryEffect(state.history, { kind: 'replace', destination }, equal)
  return history === state.history ? state : { ...state, history, pending: null }
}
