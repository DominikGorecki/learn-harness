import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { useWorkspace } from '../../features/projects/useWorkspace'
import type { WorkspaceApi, WorkspaceSnapshot } from '../../../../shared/workspace'
import type { ApiResult } from '../../../../shared/contracts'
import { NavigationController } from './controller'
import { destinationFromWorkspace, destinationKey } from './destination'
import { canGoBack, canGoForward, currentDestination } from './history'
import { createNavigationState } from './transaction'
import type { NavigationIntent } from './transaction'
import type { AppDestination } from './destination'
import { ViewMementos, supportedAnchor } from './mementos'
import { capturePresentation, restorePresentation } from './view-memento-dom'

export function useNavigation(workspace: ReturnType<typeof useWorkspace>, main: RefObject<HTMLElement | null>,
  guard: () => Promise<boolean>, available: () => boolean, close: () => void) {
  const [state, setState] = useState(createNavigationState<AppDestination>)
  const [controller] = useState(() => new NavigationController(setState))
  const [mementos] = useState(() => new ViewMementos())
  const [restorationRequest, setRestorationRequest] = useState(0)
  const restoredRequest = useRef(0)
  const restoredHistory = useRef(state.history)
  const { latest, observe, run } = workspace
  useEffect(() => observe(value => controller.observe(value)), [observe, controller])
  useEffect(() => {
    const focus = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null, element = main.current
      if (!target || !element?.contains(target)) return
      const anchor = target.closest<HTMLElement>('[data-focus-anchor]')?.dataset.focusAnchor ?? null
      const destination: AppDestination = element.dataset.projectHandle ? { kind: 'project', projectHandle: element.dataset.projectHandle } : { kind: 'dashboard' }
      mementos.track(destination, supportedAnchor(anchor) ? anchor : null)
    }
    document.addEventListener('focusin', focus)
    return () => document.removeEventListener('focusin', focus)
  }, [main, mementos])
  useLayoutEffect(() => {
    const destination = currentDestination(state.history), element = main.current
    if (!element || !destination || restoredHistory.current === state.history && restoredRequest.current === restorationRequest || element.dataset.destination !== destinationKey(destination)) return
    mementos.prune(state.history.entries)
    restorePresentation(mementos, destination, element)
    restoredHistory.current = state.history
    restoredRequest.current = restorationRequest
  }, [state.history, restorationRequest, workspace.snapshot, main, mementos])
  const navigate = async (intent: NavigationIntent<AppDestination>, action?: (api: WorkspaceApi) => Promise<ApiResult<WorkspaceSnapshot>>) => {
    if (!latest() || workspace.busy) return
    const transaction = action && intent.kind === 'replace' ? controller.refresh(intent.destination) : controller.begin(intent)
    if (!transaction) return
    close()
    try {
      if (!await guard() || !available() || !controller.execute(transaction.token)) { controller.reject(transaction.token); return }
      const before = latest(), element = main.current
      if (before && element) capturePresentation(mementos, destinationFromWorkspace(before), element)
      const target = transaction.destination
      const reply = await run(api => action ? action(api) : !target ? api.openProject() : target.kind === 'dashboard' ? api.showDashboard() : api.selectProject({ projectId: target.projectHandle }))
      const accepted = controller.finish(transaction.token, reply, latest())
      if (accepted && action) setRestorationRequest(value => value + 1)
    } catch { controller.reject(transaction.token) }
  }
  return { state, ready: state.history.cursor >= 0, pending: Boolean(state.pending), back: canGoBack(state.history), forward: canGoForward(state.history),
    open: () => void navigate({ kind: 'push', destination: null }),
    dashboard: () => void navigate({ kind: 'push', destination: { kind: 'dashboard' } }),
    select: (projectHandle: string) => void navigate({ kind: 'push', destination: { kind: 'project', projectHandle } }),
    goBack: () => void navigate({ kind: 'traverse', offset: -1 }), goForward: () => void navigate({ kind: 'traverse', offset: 1 }),
    refresh: (projectHandle: string, locate = false) => void navigate({ kind: 'replace', destination: { kind: 'project', projectHandle } }, api => locate ? api.locateProject({ projectId: projectHandle }) : api.selectProject({ projectId: projectHandle })) }
}
