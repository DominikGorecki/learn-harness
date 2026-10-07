import type { TopicContentPage } from '../../../../shared/topic-content'
import { topicContentPolicy } from '../../../../shared/topic-content'

/** Reader assembly refuses mixed revisions, duplicate sections and unbounded pagination. */
export function assembleChapter(pages: readonly TopicContentPage[]): TopicContentPage {
  const first = pages[0]
  if (!first || pages.length > 6) throw new Error('Unsupported chapter pages')
  const sections = pages.flatMap(page => {
    if (JSON.stringify(page.identity) !== JSON.stringify(first.identity) || JSON.stringify(page.plan) !== JSON.stringify(first.plan) || page.sections.length > topicContentPolicy.readerSectionsPerPage) throw new Error('Changed chapter')
    for (const field of ['introduction', 'synthesis', 'sourceNotes', 'images', 'status'] as const) if (JSON.stringify(page[field]) !== JSON.stringify(first[field])) throw new Error('Changed chapter context')
    return page.sections
  })
  if (sections.length !== first.plan.sections.length || sections.length > topicContentPolicy.maximumSections || sections.some((section, index) => section.id !== first.plan.sections[index]?.id) || pages.at(-1)?.nextSectionCursor) throw new Error('Incomplete chapter')
  if (new TextEncoder().encode(JSON.stringify({ introduction: first.introduction, synthesis: first.synthesis, sourceNotes: first.sourceNotes, sections })).length > topicContentPolicy.chapterTextBytes) throw new Error('Oversized chapter')
  for (let index = 0; index < pages.length - 1; index++) if (pages[index]!.nextSectionCursor !== pages[index + 1]!.sections[0]?.id) throw new Error('Invalid chapter cursor')
  return { ...first, sections, nextSectionCursor: null }
}
