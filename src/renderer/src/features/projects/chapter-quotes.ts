import type { TopicContentPage, TopicContentSnapshot } from '../../../../shared/topic-content'
import type { ImageGenerationSettings } from '../../../../shared/openrouter'
export interface ChapterQuoteRequest { label: string; imageCount: number; settings?: ImageGenerationSettings }
/** Counts/settings only; main owns pricing compatibility and decimal arithmetic. */
export function chapterQuoteRequests(chapter: TopicContentPage | null, state: TopicContentSnapshot | null): ChapterQuoteRequest[] {
  const requests: ChapterQuoteRequest[] = [{ label: 'Fresh generation · One planned image', imageCount: 1 }, { label: 'Fresh generation · Up to six planned images', imageCount: 6 }]
  const slots = state?.progress?.imageSlots ?? chapter?.images.map(slot => ({ ...slot, settings: chapter.plan.images.find(image => image.id === slot.imageId)?.settings })) ?? []
  const grouped = new Map<string, ChapterQuoteRequest>()
  for (const slot of slots) {
    if (slot.status === 'complete' || !slot.settings) continue
    if (slot.status !== 'planned') { requests.push({ label: `Explicit retry · Image ${slot.imageId}`, imageCount: 1, settings: slot.settings }); continue }
    const key = JSON.stringify(slot.settings), previous = grouped.get(key)
    if (previous) previous.imageCount++
    else grouped.set(key, { label: 'Saved plan · Remaining planned images', imageCount: 1, settings: slot.settings })
  }
  return [...requests, ...grouped.values()]
}
