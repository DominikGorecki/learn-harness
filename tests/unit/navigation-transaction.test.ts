import { describe, expect, it } from 'vitest'
import { sameDestination } from '../../src/renderer/src/app/navigation/destination'
import type { AppDestination } from '../../src/renderer/src/app/navigation/destination'
import { beginNavigation, bootstrapNavigation, createNavigationState, reconcileNavigation, settleNavigation } from '../../src/renderer/src/app/navigation/transaction'
import type { NavigationState } from '../../src/renderer/src/app/navigation/transaction'

const dashboard: AppDestination = { kind: 'dashboard' }
const project = (projectHandle: string): AppDestination => ({ kind: 'project', projectHandle })
function initial() { return bootstrapNavigation(createNavigationState<AppDestination>(), dashboard) }
function visit(state: NavigationState<AppDestination>, destination: AppDestination) {
  const started = beginNavigation(state, { kind: 'push', destination }, sameDestination)
  return settleNavigation(started, started.pending!.token, { kind: 'accepted', destination }, sameDestination)
}
function backFromB() {
  const state = visit(visit(initial(), project('a')), project('b'))
  const started = beginNavigation(state, { kind: 'traverse', offset: -1 }, sameDestination)
  return settleNavigation(started, started.pending!.token, { kind: 'accepted', destination: project('a') }, sameDestination)
}

describe('navigation transaction ownership', () => {
  it('requires bootstrap and serializes guard/transition work without queuing repeats', () => {
    const unready = createNavigationState<AppDestination>()
    expect(beginNavigation(unready, { kind: 'push', destination: project('a') }, sameDestination)).toBe(unready)
    const state = initial()
    expect(bootstrapNavigation(state, project('late'))).toBe(state)
    const started = beginNavigation(state, { kind: 'push', destination: project('a') }, sameDestination)
    expect(started.history).toBe(state.history)
    expect(beginNavigation(started, { kind: 'push', destination: project('b') }, sameDestination)).toBe(started)
    expect(beginNavigation(started, { kind: 'traverse', offset: -1 }, sameDestination)).toBe(started)
    const accepted = settleNavigation(started, started.pending!.token, { kind: 'accepted', destination: project('a') }, sameDestination)
    expect(accepted.history.entries).toEqual([dashboard, project('a')])
    expect(accepted.pending).toBeNull()
  })

  it.each(['canceled', 'rejected', 'stale'] as const)('preserves cursor and Forward on %s guard/API/ownership outcome', kind => {
    const state = backFromB()
    const started = beginNavigation(state, { kind: 'push', destination: project('c') }, sameDestination)
    const settled = settleNavigation(started, started.pending!.token, { kind }, sameDestination)
    expect(settled.history).toBe(state.history)
    expect(settled.pending).toBeNull()
  })

  it('keeps a newer pending token intact after a late or duplicate settlement', () => {
    const first = beginNavigation(initial(), { kind: 'push', destination: project('a') }, sameDestination)
    const oldToken = first.pending!.token
    const canceled = settleNavigation(first, oldToken, { kind: 'canceled' }, sameDestination)
    const second = beginNavigation(canceled, { kind: 'push', destination: project('b') }, sameDestination)
    expect(second.pending!.token).not.toBe(oldToken)
    expect(settleNavigation(second, oldToken, { kind: 'accepted', destination: project('a') }, sameDestination)).toBe(second)
    const accepted = settleNavigation(second, second.pending!.token, { kind: 'accepted', destination: project('b') }, sameDestination)
    expect(settleNavigation(accepted, second.pending!.token, { kind: 'accepted', destination: project('b') }, sameDestination)).toBe(accepted)
  })

  it('rejects resolved destinations that do not match explicit selection or traversal', () => {
    const state = backFromB()
    for (const intent of [{ kind: 'push', destination: project('c') }, { kind: 'traverse', offset: 1 }] as const) {
      const started = beginNavigation(state, intent, sameDestination)
      const settled = settleNavigation(started, started.pending!.token, { kind: 'accepted', destination: project('wrong') }, sameDestination)
      expect(settled.history).toBe(state.history)
      expect(settled.pending).toBeNull()
    }
  })

  it('treats unchanged accepted chooser results as cancellation/no-op with Forward retained', () => {
    const state = backFromB()
    expect(beginNavigation(state, { kind: 'push', destination: project('a') }, sameDestination)).toBe(state)
    const chooser = beginNavigation(state, { kind: 'push', destination: null }, sameDestination)
    const unchanged = settleNavigation(chooser, chooser.pending!.token, { kind: 'accepted', destination: project('a') }, sameDestination)
    expect(unchanged.history).toBe(state.history)
    expect(unchanged.pending).toBeNull()
    const opened = beginNavigation(unchanged, { kind: 'push', destination: null }, sameDestination)
    expect(settleNavigation(opened, opened.pending!.token, { kind: 'accepted', destination: project('c') }, sameDestination).history.entries).toEqual([dashboard, project('a'), project('c')])
  })

  it('traverses a saved target cursor without appending and ignores unavailable directions', () => {
    const state = backFromB()
    const started = beginNavigation(state, { kind: 'traverse', offset: 1 }, sameDestination)
    expect(started.pending).toMatchObject({ destination: project('b'), cursor: 2 })
    const forward = settleNavigation(started, started.pending!.token, { kind: 'accepted', destination: project('b') }, sameDestination)
    expect(forward.history.entries).toBe(state.history.entries)
    expect(forward.history.cursor).toBe(2)
    expect(beginNavigation(forward, { kind: 'traverse', offset: 1 }, sameDestination)).toBe(forward)
    expect(beginNavigation(initial(), { kind: 'traverse', offset: -1 }, sameDestination)).toEqual(initial())
  })

  it('reconciles same-location content without visits and only invalidates non-owned identity changes', () => {
    const state = backFromB()
    const started = beginNavigation(state, { kind: 'push', destination: project('c') }, sameDestination)
    expect(reconcileNavigation(started, project('a'), sameDestination)).toBe(started)
    // The owning target subscription is deliberately not reconciled before its reply.
    const accepted = settleNavigation(started, started.pending!.token, { kind: 'accepted', destination: project('c') }, sameDestination)
    expect(accepted.history.entries).toEqual([dashboard, project('a'), project('c')])
    const external = reconcileNavigation(started, dashboard, sameDestination)
    expect(external.history).toEqual({ entries: [dashboard, dashboard, project('b')], cursor: 1 })
    expect(external.pending).toBeNull()
    expect(settleNavigation(external, started.pending!.token, { kind: 'accepted', destination: project('c') }, sameDestination)).toBe(external)
  })

  it('supports explicit replacement and initialization reconciliation without fabricated visits', () => {
    const reconciled = reconcileNavigation(createNavigationState<AppDestination>(), dashboard, sameDestination)
    expect(reconciled).toEqual(initial())
    const state = backFromB()
    const started = beginNavigation(state, { kind: 'replace', destination: project('canonical') }, sameDestination)
    expect(settleNavigation(started, started.pending!.token, { kind: 'accepted', destination: project('canonical') }, sameDestination).history).toEqual({ entries: [dashboard, project('canonical'), project('b')], cursor: 1 })
  })
})
