import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { useWorkspace } from '../../features/projects/useWorkspace'
import type { WorkspaceApi, WorkspaceSnapshot } from '../../../../shared/workspace'
import type { ApiResult } from '../../../../shared/contracts'
import { NavigationController } from './controller'
import { destinationKey, sameProjectReading } from './destination'
import { canGoBack, canGoForward, currentDestination } from './history'
import type { NavigationHistory } from './history'
import { createNavigationState } from './transaction'
import type { NavigationIntent } from './transaction'
import type { AppDestination } from './destination'
import { ViewMementos, supportedAnchor } from './mementos'
import { capturePresentation, restorePresentation } from './view-memento-dom'

export function useNavigation(workspace: ReturnType<typeof useWorkspace>, main: RefObject<HTMLElement | null>,
  guard: (target: AppDestination | null) => Promise<boolean>, available: (target: AppDestination | null) => boolean, close: () => void) {
  const [state, setState] = useState(createNavigationState<AppDestination>)
  const [controller] = useState(() => new NavigationController(setState))
  const [mementos] = useState(() => new ViewMementos())
  const [restorationRequest, setRestorationRequest] = useState(0)
  const restoredRequest = useRef(0)
  const restoredHistory = useRef(state.history)
  const requestedRestoration = useRef(restorationRequest)
  useLayoutEffect(() => { requestedRestoration.current = restorationRequest }, [restorationRequest])
  const userScroll = useRef<{ history: typeof state.history; key: string; element: HTMLElement; height: number; viewport: number } | null>(null)
  const flushScroll = useCallback((history: NavigationHistory<AppDestination>, destination: AppDestination, element: HTMLElement) => {
    const changed = userScroll.current
    // A new content extent can clamp scroll without another learner gesture.
    // Keep the previously observed desired position in that case.
    if (changed?.history === history && changed.key === destinationKey(destination) && changed.element === element && changed.height === element.scrollHeight && changed.viewport === element.clientHeight) mementos.merge(destination, { scrollTop: element.scrollTop })
  }, [mementos])
  const userDisclosure = useRef<{ history: typeof state.history; key: string; anchor: string; element: HTMLDetailsElement } | null>(null)
  const flushDisclosure = useCallback((history: NavigationHistory<AppDestination>, destination: AppDestination) => {
    const changed = userDisclosure.current
    if (changed?.history === history && changed.key === destinationKey(destination)) {
      mementos.merge(destination, { disclosure: { anchor: changed.anchor, open: changed.element.open } })
      userDisclosure.current = null
    }
  }, [mementos])
  const { latest, observe, run } = workspace
  useEffect(() => observe(value => controller.observe(value)), [observe, controller])
  useEffect(() => {
    const currentView = () => {
      const element = main.current, history = controller.state.history, destination = currentDestination(history)
      if (!element || !destination || element.dataset.destination !== destinationKey(destination)) return null
      return { element, destination, history, pending: restoredHistory.current !== history || restoredRequest.current !== requestedRestoration.current }
    }
    const focus = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null, view = currentView()
      if (!target || !view?.element.contains(target)) return
      const anchor = target.closest<HTMLElement>('[data-focus-anchor]')?.dataset.focusAnchor ?? null
      mementos.track(view.destination, supportedAnchor(anchor) ? anchor : null)
      if (view.pending) mementos.merge(view.destination, { focus: anchor })
    }
    const toggle = (event: Event) => {
      const target = event.target, view = currentView()
      const changed = userDisclosure.current
      if (view?.pending && changed?.history === view.history && target === changed.element) {
        mementos.merge(view.destination, { disclosure: { anchor: changed.anchor, open: changed.element.open } })
        userDisclosure.current = null
      }
    }
    const disclosureIntent = (event: Event) => {
      const view = currentView(), summary = event.target instanceof Element ? event.target.closest('summary') : null
      const details = summary?.parentElement
      if (view?.pending && details instanceof HTMLDetailsElement && view.element.contains(details) && supportedAnchor(details.dataset.disclosure ?? null)) userDisclosure.current = { history: view.history, key: destinationKey(view.destination), anchor: details.dataset.disclosure!, element: details }
    }
    const scrolling = (event: Event) => {
      const view = currentView()
      if (view?.pending && event.target instanceof Node && view.element.contains(event.target)) {
        userScroll.current = { history: view.history, key: destinationKey(view.destination), element: view.element, height: view.element.scrollHeight, viewport: view.element.clientHeight }
      }
    }
    const key = (event: KeyboardEvent) => {
      const target = event.target
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select'))) return
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) scrolling(event)
      if (['Enter', ' '].includes(event.key)) disclosureIntent(event)
    }
    const pointer = (event: PointerEvent) => {
      const view = currentView()
      if (!view?.pending || event.target !== view.element) return
      const bounds = view.element.getBoundingClientRect()
      if (view.element.scrollHeight > view.element.clientHeight && event.clientX >= bounds.left + view.element.clientLeft + view.element.clientWidth && event.clientX <= bounds.right) scrolling(event)
    }
    const scroll = () => {
      const view = currentView()
      if (view?.pending) flushScroll(view.history, view.destination, view.element)
    }
    document.addEventListener('focusin', focus)
    document.addEventListener('toggle', toggle, true)
    document.addEventListener('click', disclosureIntent, true)
    document.addEventListener('wheel', scrolling, { passive: true })
    document.addEventListener('touchmove', scrolling, { passive: true })
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', pointer)
    main.current?.addEventListener('scroll', scroll)
    const element = main.current
    return () => {
      document.removeEventListener('focusin', focus); document.removeEventListener('toggle', toggle, true)
      document.removeEventListener('click', disclosureIntent, true)
      document.removeEventListener('wheel', scrolling); document.removeEventListener('touchmove', scrolling)
      document.removeEventListener('keydown', key); element?.removeEventListener('scroll', scroll)
      document.removeEventListener('pointerdown', pointer)
    }
  }, [main, mementos, controller, flushScroll])
  useLayoutEffect(() => {
    const destination = currentDestination(state.history), element = main.current
    if (!element || !destination || element.dataset.presentationReady === 'false' || restoredHistory.current === state.history && restoredRequest.current === restorationRequest || element.dataset.destination !== destinationKey(destination)) return
    mementos.prune(state.history.entries)
    flushDisclosure(state.history, destination)
    flushScroll(state.history, destination, element)
    userScroll.current = null; userDisclosure.current = null
    restoredHistory.current = state.history
    restoredRequest.current = restorationRequest
    restorePresentation(mementos, destination, element)
  }, [state.history, restorationRequest, workspace.snapshot, main, mementos, flushDisclosure, flushScroll])
  const navigate = async (intent: NavigationIntent<AppDestination>, action?: (api: WorkspaceApi) => Promise<ApiResult<WorkspaceSnapshot>>) => {
    if (!latest() || workspace.busy) return
    const transaction = action && intent.kind === 'replace' ? controller.refresh(intent.destination) : controller.begin(intent)
    if (!transaction) return
    close()
    try {
      const target = transaction.destination
      if (!await guard(action ? null : target) || !available(action ? null : target) || !controller.execute(transaction.token)) { controller.reject(transaction.token); return }
      const before = latest(), element = main.current
      const current = currentDestination(controller.state.history)
      if (before && element && current && element.dataset.destination === destinationKey(current)) {
        flushDisclosure(controller.state.history, current)
        if (element.dataset.presentationReady !== 'false' && restoredHistory.current === controller.state.history && restoredRequest.current === requestedRestoration.current) capturePresentation(mementos, current, element)
        else flushScroll(controller.state.history, current, element)
      }
      const reply = !action && sameProjectReading(target, before) ? latest() : await run(api => action ? action(api) : !target ? api.openProject() : target.kind === 'dashboard' ? api.showDashboard() : api.selectProject({ projectId: target.projectHandle }))
      const accepted = controller.finish(transaction.token, reply, latest())
      if (accepted && action) setRestorationRequest(value => value + 1)
      return accepted
    } catch { controller.reject(transaction.token) }
  }
  return { state, destination: currentDestination(state.history), notice: controller.notice, ready: state.history.cursor >= 0, pending: Boolean(state.pending), back: canGoBack(state.history), forward: canGoForward(state.history),
    presentationReady: (key: string) => {
      const destination = currentDestination(controller.state.history)
      if (destination && destinationKey(destination) === key && main.current?.dataset.destination === key && restoredHistory.current !== controller.state.history) setRestorationRequest(value => value + 1)
    },
    open: () => void navigate({ kind: 'push', destination: null }),
    dashboard: () => void navigate({ kind: 'push', destination: { kind: 'dashboard' } }),
    select: (projectHandle: string) => navigate({ kind: 'push', destination: { kind: 'project', projectHandle } }),
    topic: (projectHandle: string, topicId: string) => void navigate({ kind: 'push', destination: { kind: 'topic', projectHandle, topicId } }),
    goBack: () => void navigate({ kind: 'traverse', offset: -1 }), goForward: () => void navigate({ kind: 'traverse', offset: 1 }),
    refresh: (projectHandle: string, locate = false) => void navigate({ kind: 'replace', destination: { kind: 'project', projectHandle } }, api => locate ? api.locateProject({ projectId: projectHandle }) : api.selectProject({ projectId: projectHandle })) }
}
