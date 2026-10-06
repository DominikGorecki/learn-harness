import { describe, expect, it } from 'vitest'
import { destinationFromWorkspace, destinationKey, sameDestination } from '../../src/renderer/src/app/navigation/destination'
import type { AppDestination } from '../../src/renderer/src/app/navigation/destination'
import { applyHistoryEffect, bootstrapHistory, canGoBack, canGoForward, currentDestination, emptyHistory, maximumNavigationEntries } from '../../src/renderer/src/app/navigation/history'
import type { ProjectSnapshot, WorkspaceSnapshot } from '../../src/shared/workspace'

const dashboard: AppDestination = { kind: 'dashboard' }
const project = (projectHandle: string): AppDestination => ({ kind: 'project', projectHandle })
const equal = (left: string, right: string) => left === right
const push = (history: ReturnType<typeof emptyHistory<string>>, destination: string) => applyHistoryEffect(history, { kind: 'push', destination }, equal)

function workspace(overrides: Partial<ProjectSnapshot> = {}): WorkspaceSnapshot {
  const activeProject: ProjectSnapshot = {
    id: 'profile-handle', projectId: 'portable-id', name: 'Subject', folderPath: 'C:/project',
    lastOpenedAt: '2026-10-06T12:00:00Z', availability: 'available', hasOutline: false,
    writable: true, issue: null, sourceHint: 'empty', selectedModel: null, brief: '', outline: null, revision: 1, ...overrides
  }
  return { activeProject, projects: [activeProject], issue: null }
}

describe('session navigation history', () => {
  it('bootstraps exactly once from the authoritative initial location', () => {
    const empty = emptyHistory<string>()
    expect(currentDestination(empty)).toBeNull()
    expect(canGoBack(empty)).toBe(false)
    expect(canGoForward(empty)).toBe(false)
    expect(push(empty, 'unresolved')).toBe(empty)
    const initial = bootstrapHistory(empty, 'dashboard')
    expect(initial).toEqual({ entries: ['dashboard'], cursor: 0 })
    expect(bootstrapHistory(initial, 'late-query')).toBe(initial)
  })

  it('traverses without appending and preserves Forward when selecting the current location', () => {
    const history = push(push(bootstrapHistory(emptyHistory<string>(), 'dashboard'), 'a'), 'b')
    const back = applyHistoryEffect(history, { kind: 'traverse', cursor: 1 }, equal)
    expect(currentDestination(back)).toBe('a')
    expect(canGoBack(back)).toBe(true)
    expect(canGoForward(back)).toBe(true)
    expect(push(back, 'a')).toBe(back)
    expect(applyHistoryEffect(back, { kind: 'noop' }, equal)).toBe(back)
    expect(applyHistoryEffect(back, { kind: 'traverse', cursor: 2 }, equal)).toEqual(history)
    expect(history.entries).toEqual(['dashboard', 'a', 'b'])
  })

  it('drops only the forward branch when a different direct visit is accepted', () => {
    const history = push(push(bootstrapHistory(emptyHistory<string>(), 'dashboard'), 'a'), 'b')
    const back = applyHistoryEffect(history, { kind: 'traverse', cursor: 1 }, equal)
    const branched = push(back, 'c')
    expect(branched).toEqual({ entries: ['dashboard', 'a', 'c'], cursor: 2 })
    expect(canGoForward(branched)).toBe(false)
    expect(history.entries).toEqual(['dashboard', 'a', 'b'])
  })

  it('evicts the oldest entries at the 100-entry bound and keeps a valid cursor', () => {
    let history = bootstrapHistory(emptyHistory<string>(), '0')
    for (let index = 1; index <= 102; index++) history = push(history, String(index))
    expect(history.entries).toHaveLength(maximumNavigationEntries)
    expect(history.entries[0]).toBe('3')
    expect(currentDestination(history)).toBe('102')
    expect(history.cursor).toBe(99)
    const first = applyHistoryEffect(history, { kind: 'traverse', cursor: 0 }, equal)
    expect(canGoBack(first)).toBe(false)
    expect(canGoForward(first)).toBe(true)
  })

  it('replaces canonical identity without adding visits or clearing Forward', () => {
    const history = push(push(bootstrapHistory(emptyHistory<string>(), 'dashboard'), 'a'), 'b')
    const back = applyHistoryEffect(history, { kind: 'traverse', cursor: 1 }, equal)
    expect(applyHistoryEffect(back, { kind: 'replace', destination: 'a' }, equal)).toBe(back)
    expect(applyHistoryEffect(back, { kind: 'replace', destination: 'canonical-a' }, equal)).toEqual({ entries: ['dashboard', 'canonical-a', 'b'], cursor: 1 })
    for (const cursor of [-1, 3, 0.5, NaN, Infinity]) {
      expect(applyHistoryEffect(back, { kind: 'traverse', cursor }, equal)).toBe(back)
    }
  })

  it('supports future destination identity supplied by its owner without shipping extra variants', () => {
    type TestDestination = AppDestination | { kind: 'test-only-topic'; projectHandle: string; topicId: string }
    const identity = (value: TestDestination) => value.kind === 'test-only-topic' ? JSON.stringify([value.kind, value.projectHandle, value.topicId]) : destinationKey(value)
    const matches = (left: TestDestination, right: TestDestination) => identity(left) === identity(right)
    const topic: TestDestination = { kind: 'test-only-topic', projectHandle: 'a', topicId: 'lesson-1' }
    let history = bootstrapHistory(emptyHistory<TestDestination>(), dashboard)
    history = applyHistoryEffect(history, { kind: 'push', destination: project('a') }, matches)
    history = applyHistoryEffect(history, { kind: 'push', destination: topic }, matches)
    expect(currentDestination(applyHistoryEffect(history, { kind: 'traverse', cursor: 1 }, matches))).toEqual(project('a'))
    expect(applyHistoryEffect(history, { kind: 'push', destination: { ...topic } }, matches)).toBe(history)
  })
})

describe('current destination identity', () => {
  it('uses profile handles rather than portable IDs, titles, paths or content revisions', () => {
    const original = destinationFromWorkspace(workspace())
    expect(original).toEqual(project('profile-handle'))
    const changed = destinationFromWorkspace(workspace({ name: 'Renamed', folderPath: 'D:/moved', revision: 99, projectId: 'portable-id' }))
    expect(sameDestination(original, changed)).toBe(true)
    expect(sameDestination(original, project('portable-id'))).toBe(false)
    expect(sameDestination(original, dashboard)).toBe(false)
    expect(destinationKey(project('a:project'))).not.toBe(destinationKey(project('a')))
  })

  it('resolves known missing/unreadable recovery views and the dashboard', () => {
    for (const availability of ['missing', 'unreadable'] as const) {
      expect(destinationFromWorkspace(workspace({ availability, projectId: null, issue: 'Unavailable' }))).toEqual(project('profile-handle'))
    }
    expect(destinationFromWorkspace({ projects: [], activeProject: null, issue: null })).toEqual(dashboard)
  })
})
