import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentType } from 'react'
import { assembleChapter } from '../../src/renderer/src/features/projects/chapter-reader'
import { chapterQuoteRequests } from '../../src/renderer/src/features/projects/chapter-quotes'
import type { TopicContentSnapshot } from '../../src/shared/topic-content'
import type { TopicContentPage } from '../../src/shared/topic-content'
// Vitest transforms the renderer TSX; the Node type scope stays JSX-free.
const markdownModule = '../../src/renderer/src/features/projects/ReadableMarkdown'
const ReadableMarkdown = (await import(markdownModule)).ReadableMarkdown as ComponentType<{ text: string }>

const page: TopicContentPage = { identity: { projectId: 'project', topicId: 'topic', chapterId: 'chapter', revisionId: 'revision' }, plan: { projectId: 'project', topicId: 'topic', chapterId: 'chapter', title: 'Chapter', centralQuestion: 'Why?', objectives: ['Explain'], sections: [{ id: 'one', title: 'First', purpose: 'Explain', objectiveIndices: [0] }, { id: 'two', title: 'Second', purpose: 'Apply', objectiveIndices: [0] }], images: [] }, introduction: 'Introduction', synthesis: 'Synthesis', sourceNotes: ['Model knowledge'], sections: [{ id: 'one', markdown: 'First', examples: ['Example'], misconceptions: [] }], images: [], status: 'text-only', nextSectionCursor: 'two' }
describe('bounded inert chapter reading', () => {
  it('keeps fresh-generation bounds separate from saved output settings and explicit single-slot retries', () => {
    const state: TopicContentSnapshot = { revision: 1, projectId: 'project', topicId: 'topic', published: null, progress: { chapterId: 'chapter', runId: 'run', checkpointRevision: 1, status: 'paused', mode: 'illustrated', completedSectionIds: [], pendingImageIds: ['a', 'b', 'c'], unresolvedImageIds: ['c'], imageSlots: [{ imageId: 'a', status: 'planned', callId: null, settings: { n: 1, aspectRatio: '3:2' } }, { imageId: 'b', status: 'planned', callId: null, settings: { n: 1, aspectRatio: '3:2' } }, { imageId: 'c', status: 'requested', callId: 'prior', settings: { n: 1, aspectRatio: '1:1', quality: 'high' } }] }, candidate: null, stale: false, missingImageIds: [], errorCode: null, message: null }
    const quotes = chapterQuoteRequests(null, state)
    expect(quotes.slice(0, 2).map(quote => ({ count: quote.imageCount, settings: quote.settings }))).toEqual([{ count: 1, settings: undefined }, { count: 6, settings: undefined }])
    expect(quotes.slice(2)).toEqual([{ label: 'Explicit retry · Image c', imageCount: 1, settings: { n: 1, aspectRatio: '1:1', quality: 'high' } }, { label: 'Saved plan · Remaining planned images', imageCount: 2, settings: { n: 1, aspectRatio: '3:2' } }])
  })
  it('assembles complete pages and refuses mixed identities, context, order and cursors', () => {
    const last = { ...page, sections: [{ ...page.sections[0]!, id: 'two' }], nextSectionCursor: null }
    expect(assembleChapter([page, last]).sections).toHaveLength(2)
    for (const changed of [{ ...last, introduction: 'Changed' }, { ...last, identity: { ...last.identity, revisionId: 'other' } }, { ...last, sections: page.sections }]) expect(() => assembleChapter([page, changed])).toThrow()
    expect(() => assembleChapter([{ ...page, nextSectionCursor: 'wrong' }, last])).toThrow()
    expect(() => assembleChapter([page])).toThrow()
  })
  it('renders structure while keeping hostile HTML, links, remote images and code inert', () => {
    const html = renderToStaticMarkup(createElement(ReadableMarkdown, { text: '## Explanation\n\n**Evidence** and `literal`\n\n- One\n- Two\n\n| Claim | Result |\n| --- | --- |\n| A | B |\n\n<script>alert(1)</script>\n![private](https://example.com/a.png)\n[click](javascript:alert(1))\n\n```html\n<img src="remote">\n```' }))
    expect(html).toContain('<h3>Explanation</h3>'); expect(html).toContain('<table>'); expect(html).toContain('<strong>Evidence</strong>')
    expect(html).not.toMatch(/<(?:script|img|a)[\s>]/); expect(html).toContain('&lt;script&gt;'); expect(html).toContain('external image omitted')
  })
  it('keeps large malformed bracket/fence/list/table input complete with bounded nodes', () => {
    for (const text of ['['.repeat(256 * 1024), '```\n' + 'x\n'.repeat(200_000), '- a\n'.repeat(100_000), '| a | b |\n| --- | --- |\n' + '| x | y |\n'.repeat(3000)]) {
      const html = renderToStaticMarkup(createElement(ReadableMarkdown, { text }))
      expect(html.length).toBeGreaterThanOrEqual(text.length)
      expect((html.match(/<p|<li|<td/g) ?? []).length).toBeLessThan(4096)
    }
  })
})
