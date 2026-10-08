import { clampedScroll, ViewMementos } from './mementos'
import type { AppDestination } from './destination'

export function capturePresentation(store: ViewMementos, destination: AppDestination, main: HTMLElement) {
  const disclosures = Array.from(main.querySelectorAll<HTMLDetailsElement>('details[data-disclosure]'))
    .filter(element => element.open).map(element => element.dataset.disclosure!)
  store.remember(destination, clampedScroll(main.scrollTop, main.scrollHeight - main.clientHeight), disclosures)
}
export function restorePresentation(store: ViewMementos, destination: AppDestination, main: HTMLElement) {
  const value = store.get(destination)
  for (const element of main.querySelectorAll<HTMLDetailsElement>('details[data-disclosure]')) element.open = Boolean(value?.disclosures.includes(element.dataset.disclosure!))
  main.scrollTop = clampedScroll(value?.scrollTop ?? 0, main.scrollHeight - main.clientHeight)
  // Authoritative content may finish loading while a no-history editor is open.
  // Its modal focus belongs to the editor until explicit dismissal.
  if (main.ownerDocument.querySelector('dialog:modal')) return
  // Opaque lesson IDs never enter CSS selectors.
  const target = value?.focus ? Array.from(main.querySelectorAll<HTMLElement>('[data-focus-anchor]')).find(element => element.dataset.focusAnchor === value.focus) : null
  const visible = target && !target.matches(':disabled') && target.getClientRects().length > 0 && !target.closest('details:not([open]) > :not(summary)')
  const fallback = main.querySelector<HTMLElement>('[data-focus-anchor="heading"]')
  ;(visible ? target : fallback)?.focus({ preventScroll: true })
}
