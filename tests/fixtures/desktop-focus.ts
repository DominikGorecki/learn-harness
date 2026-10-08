import type { ElectronApplication, Locator, Page, TestInfo } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

interface FocusState {
  trigger: HTMLElement
  events: unknown[]
  remove(): void
}

/** Observe focus without activating the window or changing the asserted target. */
export async function desktopFocusDiagnostics(desktop: ElectronApplication, page: Page, trigger: Locator, info: TestInfo, name = 'desktop-focus-diagnostic') {
  const samples: unknown[] = []
  await trigger.evaluate(element => {
    const host = globalThis as unknown as { desktopFocusDiagnostic?: FocusState }
    host.desktopFocusDiagnostic?.remove()
    const state: FocusState = { trigger: element as HTMLElement, events: [], remove: () => {} }
    const identify = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return { kind: target === window ? 'window' : 'other' }
      const headings = ['topic-heading', 'outline-heading', 'workspace-heading', 'project-heading', 'dashboard-heading']
      return { tag: target.tagName, trigger: target === state.trigger,
        heading: headings.includes(target.id) ? target.id : null,
        inDialog: Boolean(target.closest('dialog')), connected: target.isConnected }
    }
    const observe = (event: Event) => {
      if (state.events.length >= 64) state.events.shift()
      state.events.push({ at: Math.floor(performance.now()), type: event.type, target: identify(event.target), documentFocused: document.hasFocus() })
    }
    for (const type of ['focusin', 'focusout']) document.addEventListener(type, observe, true)
    for (const type of ['focus', 'blur']) window.addEventListener(type, observe)
    state.remove = () => {
      for (const type of ['focusin', 'focusout']) document.removeEventListener(type, observe, true)
      for (const type of ['focus', 'blur']) window.removeEventListener(type, observe)
    }
    host.desktopFocusDiagnostic = state
  })
  const sample = async (phase: string) => {
    const dom = await page.evaluate(() => {
      const state = (globalThis as unknown as { desktopFocusDiagnostic?: FocusState }).desktopFocusDiagnostic!
      const target = state.trigger, active = document.activeElement
      const headings = ['topic-heading', 'outline-heading', 'workspace-heading', 'project-heading', 'dashboard-heading']
      const dialogs = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')]
      const knownDialogs = ['Regenerate illustration', 'Edit topic', 'Edit your learning path', 'Settings']
      return { at: Math.floor(performance.now()), documentFocused: document.hasFocus(),
        active: { tag: active?.tagName ?? null, trigger: active === target,
          heading: active && headings.includes(active.id) ? active.id : null, inDialog: Boolean(active?.closest('dialog')) },
        trigger: { connected: target.isConnected, disabled: target.matches(':disabled'), visible: target.getClientRects().length > 0 },
        dialogs: dialogs.map(dialog => ({ name: knownDialogs.includes(dialog.getAttribute('aria-label') ?? '') ? dialog.getAttribute('aria-label') : 'other', modal: dialog.matches(':modal') })),
        presentationReady: document.querySelector('main')?.getAttribute('data-presentation-ready'), events: [...state.events] }
    })
    const native = await (await desktop.browserWindow(page)).evaluate(window => ({ focused: window.isFocused(), visible: window.isVisible(), minimized: window.isMinimized(), contentsFocused: window.webContents.isFocused() }))
    const currentTargetIsStored = await trigger.evaluate(element => element === (globalThis as unknown as { desktopFocusDiagnostic?: FocusState }).desktopFocusDiagnostic?.trigger).catch(() => null)
    samples.push({ phase, dom, native, currentTargetIsStored })
  }
  return {
    sample,
    async attach() {
      await sample('assertion-finally').catch(error => { samples.push({ phase: 'diagnostic-unavailable', kind: error instanceof Error ? error.name : 'unknown' }) })
      await page.evaluate(() => { const host = globalThis as unknown as { desktopFocusDiagnostic?: FocusState }; host.desktopFocusDiagnostic?.remove(); delete host.desktopFocusDiagnostic }).catch(() => {})
      const path = info.outputPath(`${name}.json`)
      await writeFile(path, JSON.stringify(samples))
      await info.attach(name, { path, contentType: 'application/json' })
    }
  }
}
