import { describe, expect, it } from 'vitest'
import { NavigationController } from '../../src/renderer/src/app/navigation/controller'
import { canGoForward } from '../../src/renderer/src/app/navigation/history'
import { clampedScroll, supportedAnchor, ViewMementos } from '../../src/renderer/src/app/navigation/mementos'
import { keyboardCommand } from '../../src/renderer/src/app/navigation/commands'
import type { WorkspaceSnapshot, ProjectSnapshot } from '../../src/shared/workspace'

const destination = (projectHandle: string) => ({ kind: 'project' as const, projectHandle })
function snapshot(id: string | null, revision = 1): WorkspaceSnapshot {
  const activeProject: ProjectSnapshot | null = id ? { id, projectId: 'portable', name: 'Example', folderPath: '/sample',
    lastOpenedAt: '', availability: 'available', hasOutline: false, writable: true, issue: null, sourceHint: 'empty', selectedModel: null, brief: `revision ${revision}`, outline: null, revision } : null
  return { activeProject, projects: activeProject ? [activeProject] : [], issue: null }
}
function controller() { const owner = new NavigationController(() => {}); owner.observe(snapshot(null)); return owner }
function visit(owner: NavigationController, id: string) {
  const token = owner.begin({ kind: 'push', destination: destination(id) })!.token
  owner.execute(token); owner.observe(snapshot(id)); expect(owner.finish(token, snapshot(id), snapshot(id))).toBe(true)
}
describe('authoritative navigation controller', () => {
  it('holds the token across expected subscription and accepts a stale content reply against latest same identity exactly once', () => {
    const owner = controller(), token = owner.begin({ kind: 'push', destination: destination('A') })!.token
    owner.execute(token); owner.observe(snapshot('A', 1)); owner.observe(snapshot('A', 2))
    expect(owner.state.history.entries).toHaveLength(1)
    expect(owner.state.pending?.token).toBe(token)
    expect(owner.finish(token, snapshot('A', 1), snapshot('A', 2))).toBe(true)
    expect(owner.finish(token, snapshot('A'), snapshot('A'))).toBe(false)
    expect(owner.state.history.entries).toHaveLength(2)
  })
  it('reconciles newer unowned identity with replace and rejects the old completion', () => {
    const owner = controller(), token = owner.begin({ kind: 'push', destination: destination('A') })!.token
    owner.execute(token); owner.observe(snapshot('A')); owner.observe(snapshot('B'))
    expect(owner.state.pending).toBeNull()
    expect(owner.finish(token, snapshot('A'), snapshot('B'))).toBe(false)
    expect(owner.state.history.entries).toEqual([destination('B')])
  })
  it('defers chooser observations and preserves Forward on unchanged selection, rejection and rapid repeats', () => {
    const owner = controller(); visit(owner, 'A'); visit(owner, 'B')
    const back = owner.begin({ kind: 'traverse', offset: -1 })!; owner.execute(back.token); owner.finish(back.token, snapshot('A'), snapshot('A'))
    expect(owner.begin({ kind: 'push', destination: destination('A') })).toBeNull()
    const chooser = owner.begin({ kind: 'push', destination: null })!; owner.execute(chooser.token)
    owner.observe(snapshot('A')); expect(owner.begin({ kind: 'traverse', offset: 1 })).toBeNull()
    owner.finish(chooser.token, snapshot('A'), snapshot('A'))
    const failed = owner.begin({ kind: 'push', destination: destination('C') })!; owner.reject(failed.token)
    expect(owner.state.history.cursor).toBe(1); expect(canGoForward(owner.state.history)).toBe(true)
  })
  it('refreshes same identity and preserves the branch even for known missing recovery', () => {
    const owner = controller(); visit(owner, 'A'); visit(owner, 'B')
    const back = owner.begin({ kind: 'traverse', offset: -1 })!; owner.execute(back.token); owner.finish(back.token, snapshot('A'), snapshot('A'))
    const refresh = owner.refresh(destination('A'))!; owner.execute(refresh.token)
    const missing = snapshot('A'); missing.activeProject!.availability = 'missing'
    owner.observe(missing); expect(owner.finish(refresh.token, missing, missing)).toBe(true)
    expect(owner.state.history.cursor).toBe(1); expect(canGoForward(owner.state.history)).toBe(true)
  })
})
describe('bounded context and shortcut policies', () => {
  it('clamps finite reading context, limits anchor vocabulary and prunes only mementos', () => {
    expect(clampedScroll(NaN, 100)).toBe(0); expect(clampedScroll(Infinity, 100)).toBe(0)
    expect(clampedScroll(200, 100)).toBe(100); expect(clampedScroll(-1, 100)).toBe(0)
    expect(supportedAnchor('context:scope')).toBe(true); expect(supportedAnchor('arbitrary')).toBe(false)
    const store = new ViewMementos(), project = destination('A')
    store.track(project, 'summary:quoted"id')
    store.track(project, null)
    store.remember(project, Infinity, []); expect(store.get(project)).toEqual({ scrollTop: 0, disclosures: [], focus: null })
    store.prune([{ kind: 'dashboard' }]); expect(store.get(project)).toBeNull()
  })
  it('scopes arrows/sidebar to nonediting focus and ignores IME or nonapp modifier combinations', () => {
    const key = { key: 'ArrowLeft', altKey: true, metaKey: false, ctrlKey: false, shiftKey: false, isComposing: false }
    expect(keyboardCommand(key, false, false)).toBe('go-back')
    expect(keyboardCommand(key, false, true)).toBeNull()
    expect(keyboardCommand({ ...key, isComposing: true }, false, false)).toBeNull()
    expect(keyboardCommand({ ...key, ctrlKey: true }, false, false)).toBeNull()
    expect(keyboardCommand({ ...key, key: '[', altKey: false, metaKey: true }, true, false)).toBe('go-back')
  })
})
