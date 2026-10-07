import type { OutlineLesson } from '../../../../shared/outline'
import { Icon } from '../../components/Icon'
import { WorkspacePage, WorkspaceHeader, WorkspaceActions, WorkspaceAction, WorkspaceSection, WorkspaceRow } from '../../components/Workspace'

export function TopicView({ topic, projectTitle, onOverview, onEdit, editDisabled }: {
  topic: OutlineLesson; projectTitle: string; onOverview(): void; onEdit(): void; editDisabled: boolean
}) {
  return <WorkspacePage labelledBy="topic-heading" className="topic-view" reading>
    <WorkspaceAction className="workspace-topic-breadcrumb" data-focus-anchor="open:overview" onClick={onOverview}>{projectTitle}<Icon name="chevron" size={12} />Back to outline</WorkspaceAction>
    <WorkspaceHeader id="topic-heading" eyebrow="Your saved topic" title={topic.title} status={<span className="saved-indicator"><Icon name="check" size={14} />Saved</span>}><p className="topic-question">{topic.question}</p><p>{topic.overview}</p></WorkspaceHeader>
    <WorkspaceActions label="Topic actions"><WorkspaceAction onClick={onOverview} data-focus-anchor="open:overview-command">Back to outline</WorkspaceAction><WorkspaceAction data-focus-anchor={`edit:${topic.id}`} aria-label={`Edit topic: ${topic.title}`} disabled={editDisabled} onClick={onEdit}><Icon name="edit" size={16} />Edit topic</WorkspaceAction></WorkspaceActions>
    <WorkspaceSection title="Learning objectives" id="topic-objectives"><ul className="plain-list">{topic.objectives.map((objective, index) => <li key={index}>{objective}</li>)}</ul></WorkspaceSection>
    <WorkspaceSection title="Builds on" id="topic-prerequisites">{topic.prerequisites.length ? <ul className="plain-list">{topic.prerequisites.map((prerequisite, index) => <li key={index}>{prerequisite}</li>)}</ul> : <p>No prerequisites are listed for this topic.</p>}</WorkspaceSection>
    <WorkspaceSection title="Ways to explore this idea" id="topic-modules"><ol className="workspace-module-list">{topic.modules.map(module => <li key={module.id}><WorkspaceRow className="workspace-module"><p className="module-method">{module.method}</p><h3>{module.title}</h3><p>{module.purpose}</p><details data-disclosure={`module:${module.id}`}><summary data-focus-anchor={`module:${module.id}`}>Your learning task<Icon name="down" size={14} /></summary><p>{module.task}</p></details></WorkspaceRow></li>)}</ol></WorkspaceSection>
    <WorkspaceSection title="From your material" id="topic-sources">{topic.sources.length ? <ul className="plain-list">{topic.sources.map((source, index) => <li key={index}>{source}</li>)}</ul> : <p>No project sources are listed for this topic.</p>}</WorkspaceSection>
    <p className="outline-endnote">These are saved activity plans. They are a starting point for learning.</p>
  </WorkspacePage>
}
