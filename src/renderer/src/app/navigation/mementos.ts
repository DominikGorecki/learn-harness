import { destinationKey } from './destination'
import type { AppDestination } from './destination'
import { maximumNavigationEntries } from './history'

export interface ViewMemento { scrollTop: number; disclosures: string[]; focus: string | null }
const maximumAnchors = 80 // Existing lessons plus bounded chapter sections/images and topic plan.
const fixedAnchors = new Set(['heading', 'goal', 'path-edit', 'context:scope', 'context:additions', 'context:coverage', 'folder', 'chapter-generation'])
export function supportedAnchor(value: string | null): value is string {
  return value !== null && value.length <= 512 && (fixedAnchors.has(value) || value === 'topic-plan' || value.startsWith('chapter-section:') || value.startsWith('chapter-toc:') || value.startsWith('chapter-image:') || value.startsWith('lesson:') || value.startsWith('summary:') || value.startsWith('edit:') || value.startsWith('open:') || value.startsWith('module:'))
}
export function clampedScroll(value: number, maximum: number): number {
  return Math.max(0, Math.min(Number.isFinite(maximum) ? Math.max(0, maximum) : 0, Number.isFinite(value) ? value : 0))
}
/** No drafts/content are held here; eviction follows retained history only. */
export class ViewMementos {
  private readonly values = new Map<string, ViewMemento>()
  private readonly focuses = new Map<string, string>()
  track(destination: AppDestination, focus: string | null) {
    if (supportedAnchor(focus)) this.focuses.set(destinationKey(destination), focus)
    else this.focuses.delete(destinationKey(destination))
    if (this.focuses.size > maximumNavigationEntries) this.focuses.delete(this.focuses.keys().next().value!)
  }
  remember(destination: AppDestination, scrollTop: number, disclosures: string[]) {
    const key = destinationKey(destination)
    this.values.set(key, { scrollTop: clampedScroll(scrollTop, Number.MAX_SAFE_INTEGER), disclosures: disclosures.filter(supportedAnchor).slice(0, maximumAnchors), focus: this.focuses.get(key) ?? null })
    if (this.values.size > maximumNavigationEntries) this.values.delete(this.values.keys().next().value!)
  }
  /** Merge deliberate interactions with a view whose authoritative presentation is pending. */
  merge(destination: AppDestination, change: { focus?: string | null; scrollTop?: number; disclosure?: { anchor: string; open: boolean } }) {
    const key = destinationKey(destination), previous = this.values.get(key) ?? { scrollTop: 0, disclosures: [], focus: null }
    let disclosures = previous.disclosures
    if (change.disclosure && supportedAnchor(change.disclosure.anchor)) {
      disclosures = disclosures.filter(anchor => anchor !== change.disclosure!.anchor)
      if (change.disclosure.open) disclosures = [...disclosures, change.disclosure.anchor].slice(-maximumAnchors)
    }
    this.values.set(key, { disclosures,
      scrollTop: change.scrollTop === undefined ? previous.scrollTop : clampedScroll(change.scrollTop, Number.MAX_SAFE_INTEGER),
      focus: change.focus === undefined ? previous.focus : supportedAnchor(change.focus) ? change.focus : null })
    if (this.values.size > maximumNavigationEntries) this.values.delete(this.values.keys().next().value!)
  }
  prune(destinations: readonly AppDestination[]) {
    const retained = new Set(destinations.map(destinationKey))
    for (const key of this.values.keys()) if (!retained.has(key)) this.values.delete(key)
    for (const key of this.focuses.keys()) if (!retained.has(key)) this.focuses.delete(key)
  }
  get(destination: AppDestination) { return this.values.get(destinationKey(destination)) ?? null }
}
