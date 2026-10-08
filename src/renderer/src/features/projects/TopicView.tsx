import type { OutlineLesson } from '../../../../shared/outline'
import type { ReactNode } from 'react'
import type { TopicContentPage, TopicContentSnapshot } from '../../../../shared/topic-content'
import { ChapterReader } from './ChapterReader'
import { Icon } from '../../components/Icon'
import { WorkspacePage, WorkspaceHeader, WorkspaceActions, WorkspaceAction, WorkspaceSection, WorkspaceRow } from '../../components/Workspace'

export function TopicView({ topic, projectTitle, onOverview, onEdit, editDisabled, chapter, contentState, projectHandle, controls, loading, contentError, onReload, mediaReload, onRegenerate, regenerateDisabled, onReviewImage, imageReviewDisabled }: {
  topic: OutlineLesson; projectTitle: string; onOverview(): void; onEdit(): void; editDisabled: boolean;
  chapter: TopicContentPage | null; contentState: TopicContentSnapshot | null; projectHandle: string; controls: ReactNode; loading: boolean; contentError: string | null; onReload(): void; mediaReload: number; onRegenerate?(imageId: string, trigger: HTMLElement): void; regenerateDisabled?: boolean; onReviewImage?(): void; imageReviewDisabled?: boolean
}) {
  const plan = <>
    <WorkspaceSection title="Learning objectives" id="topic-objectives"><ul className="plain-list">{topic.objectives.map((objective, index) => <li key={index}>{objective}</li>)}</ul></WorkspaceSection>
    <WorkspaceSection title="Builds on" id="topic-prerequisites">{topic.prerequisites.length ? <ul className="plain-list">{topic.prerequisites.map((prerequisite, index) => <li key={index}>{prerequisite}</li>)}</ul> : <p>No prerequisites are listed for this topic.</p>}</WorkspaceSection>
    <WorkspaceSection title="Ways to explore this idea" id="topic-modules"><ol className="workspace-module-list">{topic.modules.map(module => <li key={module.id}><WorkspaceRow className="workspace-module"><p className="module-method">{module.method}</p><h3>{module.title}</h3><p>{module.purpose}</p><details data-disclosure={`module:${module.id}`}><summary data-focus-anchor={`module:${module.id}`}>Your learning task<Icon name="down" size={14} /></summary><p>{module.task}</p></details></WorkspaceRow></li>)}</ol></WorkspaceSection>
    <WorkspaceSection title="From your material" id="topic-sources">{topic.sources.length ? <ul className="plain-list">{topic.sources.map((source, index) => <li key={index}>{source}</li>)}</ul> : <p>No project sources are listed for this topic.</p>}</WorkspaceSection>
    <p className="outline-endnote">These are saved activity plans. They are a starting point for learning.</p>
  </>
  return <WorkspacePage labelledBy="topic-heading" className="topic-view" reading>
    <WorkspaceAction className="workspace-topic-breadcrumb" data-focus-anchor="open:overview" onClick={onOverview}>{projectTitle}<Icon name="chevron" size={12} />Back to outline</WorkspaceAction>
    <WorkspaceHeader id="topic-heading" eyebrow={chapter ? 'Your saved chapter' : 'Your saved topic'} title={chapter?.plan.title ?? topic.title} status={<span className="saved-indicator"><Icon name="check" size={14} />{chapter ? chapter.status === 'illustrated' ? 'Illustrated chapter saved' : chapter.status === 'needs-images' ? 'Chapter saved · Images incomplete' : 'Text-only chapter saved' : 'Saved'}</span>}><p className="topic-question">{chapter?.plan.centralQuestion ?? topic.question}</p>{!chapter && <p>{topic.overview}</p>}</WorkspaceHeader>
    <WorkspaceActions label="Topic actions"><WorkspaceAction onClick={onOverview} data-focus-anchor="open:overview-command">Back to outline</WorkspaceAction><WorkspaceAction data-focus-anchor={`edit:${topic.id}`} aria-label={`Edit topic: ${topic.title}`} disabled={editDisabled} onClick={onEdit}><Icon name="edit" size={16} />Edit topic</WorkspaceAction></WorkspaceActions>
    {loading && <p role="status">Loading saved chapter…</p>}
    {contentError && <div role="alert"><p>{contentError}</p></div>}
    {contentState?.stale && <p role="status">This chapter is based on older topic or source context. It remains readable; regenerate to use the current context.</p>}
    {contentState?.errorCode && <p role="status">Saved content needs attention. {contentState.message}</p>}
    {contentState?.replacement && <p className="chapter-generation" role="status">{contentState.candidate ? 'An illustration candidate is ready to review.' : contentState.replacement.status === 'unsaved' ? 'An accepted image result needs saving.' : 'An image attempt is retained. It will not be replayed automatically.'} <WorkspaceAction disabled={imageReviewDisabled} onClick={onReviewImage}>Review retained image</WorkspaceAction></p>}
    {controls}
    {(chapter || contentError) && <WorkspaceAction onClick={onReload}>Reload saved content</WorkspaceAction>}
    {chapter ? <><ChapterReader chapter={chapter} projectHandle={projectHandle} missingImageIds={contentState?.missingImageIds ?? []} mediaReload={mediaReload} onRegenerate={onRegenerate} regenerateDisabled={regenerateDisabled} /><details className="chapter-plan" data-disclosure="topic-plan"><summary data-focus-anchor="topic-plan">Topic plan</summary><p>{topic.question}</p><p>{topic.overview}</p>{plan}</details></> : plan}
  </WorkspacePage>
}
