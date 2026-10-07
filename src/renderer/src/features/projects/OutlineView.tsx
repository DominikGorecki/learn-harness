import type { SavedOutline } from '../../../../shared/workspace'
import { Icon } from '../../components/Icon'
import { WorkspacePage, WorkspaceHeader, WorkspaceContext, WorkspaceActions, WorkspaceAction, WorkspaceRow, WorkspaceSection } from '../../components/Workspace'

export function OutlineView({ saved, unsaved = false, onEdit, onEditTopic, onOpenTopic, editDisabled = false, activeTopicId }: { saved: SavedOutline; unsaved?: boolean; onEdit?(): void; onEditTopic?(topicId: string): void; onOpenTopic?(topicId: string): void; editDisabled?: boolean; activeTopicId?: string }) {
  const outline = saved.document
  const sources = saved.coverage.files.filter(file => file.status === 'read')
  return <WorkspacePage className="outline-view" labelledBy="outline-heading">
    <WorkspaceHeader id="outline-heading" eyebrow="Your learning outline" title={outline.title}
      status={<span className={'saved-indicator ' + (unsaved ? 'pending' : '')}><Icon name={unsaved ? 'info' : 'check'} size={14} />{unsaved ? 'Not saved yet' : 'Saved'}</span>}><p>{outline.overview}</p></WorkspaceHeader>
    <WorkspaceContext><section><h2>Learning focus</h2><p>{outline.scope}</p><p className="workspace-depth">{outline.level}</p></section>
      <section className="learning-outcomes"><h2>Learning objectives</h2><ul>{outline.outcomes.map((outcome, index) => <li key={index}>{outcome}</li>)}</ul></section></WorkspaceContext>
    <WorkspaceActions label="Outline actions"><WorkspaceAction primary data-focus-anchor="open:first" disabled={unsaved || !onOpenTopic} onClick={() => onOpenTopic?.(outline.startingLessonId)}>Open first topic<Icon name="arrow" size={16} /></WorkspaceAction>
      {onEdit && <WorkspaceAction data-focus-anchor="path-edit" disabled={editDisabled} onClick={onEdit}><Icon name="edit" size={16} />Edit outline</WorkspaceAction>}</WorkspaceActions>
    {unsaved && <p className="workspace-reading-note" role="status">Save this result before opening its proposed topics. Their complete plans remain available to preview below.</p>}
    <WorkspaceSection title="Your learning path" id="lesson-path-heading" count={`${outline.lessons.length} ${outline.lessons.length === 1 ? 'topic' : 'topics'}`}>
      {outline.lessons.map((lesson, index) => <WorkspaceRow className="lesson-row" key={lesson.id} data-ai-active={lesson.id === activeTopicId || undefined}><div className="workspace-topic-row"><span className="lesson-number">{String(index + 1).padStart(2, '0')}</span><div className="workspace-topic-copy">
        <h3><button className="lesson-title workspace-topic-title" data-focus-anchor={`open:${lesson.id}`} disabled={unsaved || !onOpenTopic} onClick={() => onOpenTopic?.(lesson.id)}>{lesson.title}</button></h3><p>{lesson.question}</p>
        {lesson.id === activeTopicId && <span className="starting-label ai-topic-marker">Updating</span>}{lesson.id === outline.startingLessonId && lesson.id !== activeTopicId && <span className="starting-label">Start here</span>}</div>
        <WorkspaceActions label={`Actions for ${lesson.title}`}><WorkspaceAction primary data-focus-anchor={`open:command:${lesson.id}`} disabled={unsaved || !onOpenTopic} onClick={() => onOpenTopic?.(lesson.id)}>Open topic<Icon name="arrow" size={16} /></WorkspaceAction>
          {onEditTopic && <WorkspaceAction data-focus-anchor={`edit:${lesson.id}`} aria-label={`Edit topic: ${lesson.title}`} disabled={editDisabled} onClick={() => onEditTopic(lesson.id)}><Icon name="edit" size={16} />Edit topic</WorkspaceAction>}</WorkspaceActions></div>
        <details className="lesson-disclosure" data-disclosure={`lesson:${lesson.id}`}><summary data-focus-anchor={`summary:${lesson.id}`}>Preview topic plan<Icon name="down" size={14} /></summary>
        <div className="lesson-detail"><p className="lesson-overview">{lesson.overview}</p><h3>Learning objectives</h3>
          <ul className="plain-list">{lesson.objectives.map((objective, index) => <li key={index}>{objective}</li>)}</ul>
          {lesson.prerequisites.length > 0 && <p className="lesson-prerequisites"><strong>Builds on</strong> {lesson.prerequisites.join(' · ')}</p>}
          <h3>Ways to explore this idea</h3><ol className="module-list">{lesson.modules.map(module => <li key={module.id}><span className="module-method">{module.method}</span><h4>{module.title}</h4><p>{module.purpose}</p><p className="module-task">{module.task}</p></li>)}</ol>
          {lesson.sources.length > 0 && <p className="lesson-sources"><strong>From your material</strong> {lesson.sources.join(' · ')}</p>}
        </div>
      </details></WorkspaceRow>)}
    </WorkspaceSection>
    <section className="outline-context" aria-label="Outline context">
      <details data-disclosure="context:scope"><summary data-focus-anchor="context:scope">Scope and assumptions<Icon name="down" size={14} /></summary><p>{outline.scope}</p><ul className="plain-list">{outline.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul></details>
      {outline.additions.length > 0 && <details data-disclosure="context:additions"><summary data-focus-anchor="context:additions">Connections and gaps to explore<Icon name="down" size={14} /></summary>{outline.additions.map((addition, index) => <div className="added-topic" key={index}><strong>{addition.topic}</strong><p>{addition.reason}</p></div>)}</details>}
      <details data-disclosure="context:coverage"><summary data-focus-anchor="context:coverage">{sources.length ? 'Project material and coverage' : 'How this outline was shaped'}<Icon name="down" size={14} /></summary>
        {saved.brief && <p><strong>Your direction</strong> {saved.brief}</p>}
        {saved.inferredBrief && <p><strong>Suggested direction from your material</strong> {saved.inferredBrief}</p>}
        <p>Created with {saved.model.name} on {new Date(saved.generatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}.</p>
        {saved.coverage.files.length > 0 && <ul className="coverage-list">{saved.coverage.files.map((file, index) => <li key={index}><span>{file.path}</span><span>{file.status === 'read' ? file.reason ?? 'Read' : file.reason ?? 'Not used'}</span></li>)}</ul>}
        {saved.coverage.limitations.length > 0 && <ul className="plain-list">{saved.coverage.limitations.map((limit, index) => <li key={index}>{limit}</li>)}</ul>}
      </details>
    </section>
    <p className="outline-endnote">A learning plan is a starting point. Understanding grows through the questions you ask along the way.</p>
  </WorkspacePage>
}
