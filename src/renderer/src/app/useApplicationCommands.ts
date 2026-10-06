import { useEffect, useRef } from 'react'
import type { useNavigation } from './navigation/useNavigation'
import { keyboardCommand, macPlatform } from './navigation/commands'
import type { ApplicationMenuState } from '../../../shared/application-menu'

export function useApplicationCommands(navigation: ReturnType<typeof useNavigation>, sidebarVisible: boolean,
  toggle: () => void, settings: () => void) {
  const revision = useRef(0)
  const acknowledged = useRef(0)
  const composition = useRef(false)
  const { ready, back, forward, pending, open, select, goBack, goForward } = navigation
  useEffect(() => {
    if (!ready) return
    const state: ApplicationMenuState = { revision: ++revision.current, canGoBack: back, canGoForward: forward, navigationPending: pending, sidebarVisible }
    void window.learning.setApplicationMenuState(state).then(result => {
      if (result.ok && result.data.revision === state.revision) acknowledged.current = state.revision
    })
  }, [ready, back, forward, pending, sidebarVisible])
  useEffect(() => {
    const blocked = () => !ready || composition.current || Boolean(document.querySelector('dialog[open]'))
    const dispatch = (command: string, handle?: string) => {
      if (blocked()) return
      if (command === 'show-appearance') settings()
      else if (command === 'toggle-sidebar') toggle()
      else if (!pending) {
        if (command === 'open-project') open()
        if (command === 'go-back' && back) goBack()
        if (command === 'go-forward' && forward) goForward()
        if (command === 'select-recent-project' && handle) select(handle)
      }
    }
    const stop = window.learning.onApplicationCommand(value => {
      if (value.revision !== acknowledged.current || value.revision !== revision.current) return
      dispatch(value.command, 'projectHandle' in value ? value.projectHandle : undefined)
    })
    const keyboard = (event: KeyboardEvent) => {
      if (blocked() || event.defaultPrevented) return
      const editing = Boolean((event.target as HTMLElement | null)?.closest('input,textarea,select,[contenteditable="true"]'))
      const command = keyboardCommand(event, macPlatform(), editing)
      if (command) { event.preventDefault(); dispatch(command) }
    }
    const start = () => { composition.current = true }, end = () => { composition.current = false }
    window.addEventListener('keydown', keyboard)
    window.addEventListener('compositionstart', start)
    window.addEventListener('compositionend', end)
    return () => { stop(); window.removeEventListener('keydown', keyboard); window.removeEventListener('compositionstart', start); window.removeEventListener('compositionend', end) }
  }, [ready, back, forward, pending, open, select, goBack, goForward, toggle, settings])
}
