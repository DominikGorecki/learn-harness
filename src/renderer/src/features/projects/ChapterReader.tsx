import { useState } from 'react'
import type { ChapterImagePlan, TopicContentPage } from '../../../../shared/topic-content'
import { topicMediaUrl } from '../../../../shared/topic-content-media'
import { WorkspaceSection } from '../../components/Workspace'
import { ReadableMarkdown } from './ReadableMarkdown'
import './chapter.css'

function Illustration({ image, chapter, projectHandle, missing }: { image: ChapterImagePlan; chapter: TopicContentPage; projectHandle: string; missing: boolean }) {
  const asset = chapter.images.find(slot => slot.imageId === image.id)?.asset
  const [failed, setFailed] = useState(false)
  return <figure className="chapter-illustration" data-focus-anchor={`chapter-image:${image.id}`} tabIndex={-1}>
    {asset ? <div className="chapter-image-frame" style={{ aspectRatio: `${asset.width} / ${asset.height}` }}>
      {!failed && !missing && <img width={asset.width} height={asset.height} loading="lazy" src={topicMediaUrl({ projectHandle, topicId: chapter.identity.topicId, chapterId: chapter.identity.chapterId, imageId: image.id, versionId: asset.versionId })} alt={image.alt} onError={() => setFailed(true)} />}
      {(failed || missing) && <p role="status">Illustration unavailable. {image.alt} Your saved explanation remains readable.</p>}
    </div> : <p className="chapter-image-missing">Illustration not completed. {image.alt}</p>}
    {failed && !missing && <button className="quiet-button" onClick={() => setFailed(false)}>Retry loading illustration</button>}
    <figcaption>{image.caption}</figcaption>
  </figure>
}
export function ChapterReader({ chapter, projectHandle, missingImageIds, mediaReload }: { chapter: TopicContentPage; projectHandle: string; missingImageIds: string[]; mediaReload: number }) {
  const focusSection = (id: string) => {
    const target = Array.from(document.querySelectorAll<HTMLElement>('[data-focus-anchor]')).find(element => element.dataset.focusAnchor === `chapter-section:${id}`)
    target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
  return <div className="chapter-reader">
    <nav className="chapter-toc" aria-label="Chapter contents"><h2>In this chapter</h2><ol>{chapter.plan.sections.map(section => <li key={section.id}><button data-focus-anchor={`chapter-toc:${section.id}`} onClick={() => focusSection(section.id)}>{section.title}</button></li>)}</ol></nav>
    <WorkspaceSection title="Introduction"><ReadableMarkdown text={chapter.introduction} /></WorkspaceSection>
    <WorkspaceSection title="Learning objectives"><ul className="plain-list">{chapter.plan.objectives.map((objective, index) => <li key={index}>{objective}</li>)}</ul></WorkspaceSection>
    {chapter.sections.map(section => {
      const plan = chapter.plan.sections.find(item => item.id === section.id)!
      const images = (placement: 'before' | 'after') => chapter.plan.images.filter(image => image.sectionId === section.id && image.placement === placement).map(image => <Illustration key={`${image.id}:${chapter.images.find(slot => slot.imageId === image.id)?.asset?.versionId}:${mediaReload}`} image={image} chapter={chapter} projectHandle={projectHandle} missing={missingImageIds.includes(image.id)} />)
      return <section className="workspace-document-section chapter-section" key={section.id}><h2 tabIndex={-1} data-focus-anchor={`chapter-section:${section.id}`}>{plan.title}</h2>{images('before')}<ReadableMarkdown text={section.markdown} /><h3>Examples and applications</h3>{section.examples.map((example, index) => <ReadableMarkdown key={index} text={example} />)}{section.misconceptions.length > 0 && <><h3>Common misconceptions</h3>{section.misconceptions.map((text, index) => <ReadableMarkdown key={index} text={text} />)}</>}{images('after')}</section>
    })}
    <WorkspaceSection title="Bringing it together"><ReadableMarkdown text={chapter.synthesis} /></WorkspaceSection>
    <WorkspaceSection title="Sources and assumptions"><ul className="plain-list">{chapter.sourceNotes.map((note, index) => <li key={index}>{note}</li>)}</ul><p className="outline-endnote">These notes describe the chapter’s evidence and limitations. They do not establish web verification or mastery.</p></WorkspaceSection>
  </div>
}
