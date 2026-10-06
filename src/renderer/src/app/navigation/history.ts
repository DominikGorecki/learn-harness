export const maximumNavigationEntries = 100

export type DestinationEquality<D> = (left: D, right: D) => boolean
export interface NavigationHistory<D> {
  readonly entries: readonly D[]
  /** -1 only before the authoritative initial location has bootstrapped. */
  readonly cursor: number
}
export type HistoryEffect<D> =
  | { readonly kind: 'push'; readonly destination: D }
  | { readonly kind: 'replace'; readonly destination: D }
  | { readonly kind: 'traverse'; readonly cursor: number }
  | { readonly kind: 'noop' }

export function emptyHistory<D>(): NavigationHistory<D> {
  return { entries: [], cursor: -1 }
}

export function bootstrapHistory<D>(history: NavigationHistory<D>, destination: D): NavigationHistory<D> {
  return history.entries.length ? history : { entries: [destination], cursor: 0 }
}

export function currentDestination<D>(history: NavigationHistory<D>): D | null {
  return history.cursor < 0 ? null : history.entries[history.cursor] ?? null
}

export function canGoBack<D>(history: NavigationHistory<D>): boolean {
  return history.cursor > 0
}

export function canGoForward<D>(history: NavigationHistory<D>): boolean {
  return history.cursor >= 0 && history.cursor < history.entries.length - 1
}

/** Only accepted destinations reach this reducer; it performs no resolution or IO. */
export function applyHistoryEffect<D>(history: NavigationHistory<D>, effect: HistoryEffect<D>, equal: DestinationEquality<D>): NavigationHistory<D> {
  if (effect.kind === 'noop') return history
  if (effect.kind === 'traverse') {
    if (!Number.isInteger(effect.cursor) || effect.cursor < 0 || effect.cursor >= history.entries.length || effect.cursor === history.cursor) return history
    return { ...history, cursor: effect.cursor }
  }
  const current = currentDestination(history)
  if (current === null) return history
  if (equal(current, effect.destination)) return history
  if (effect.kind === 'replace') {
    const entries = [...history.entries]
    entries[history.cursor] = effect.destination
    return { entries, cursor: history.cursor }
  }
  const entries = [...history.entries.slice(0, history.cursor + 1), effect.destination].slice(-maximumNavigationEntries)
  return { entries, cursor: entries.length - 1 }
}
