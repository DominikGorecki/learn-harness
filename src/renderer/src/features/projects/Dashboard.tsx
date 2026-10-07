import type { ProjectSummary } from '../../../../shared/workspace'
import { Icon } from '../../components/Icon'
import { WorkspacePage, WorkspaceHeader, WorkspaceActions, WorkspaceAction, WorkspaceSection, WorkspaceRow } from '../../components/Workspace'

export function Dashboard({ projects, busy, onOpen, onSelect }: {
  projects: ProjectSummary[]; busy: boolean; onOpen(): void; onSelect(id: string): void
}) {
  const openAction = <WorkspaceActions><WorkspaceAction primary disabled={busy} onClick={onOpen}><Icon name="plus" size={18} />Open project<Icon name="arrow" size={17} /></WorkspaceAction></WorkspaceActions>
  if (!projects.length) return <WorkspacePage labelledBy="dashboard-heading" reading>
    <WorkspaceHeader id="dashboard-heading" eyebrow="Your learning workspace" title="What would you like to understand?">
      <p>Open a folder for a subject you care about. Bring your notes, or start with a question.</p>
    </WorkspaceHeader>
    {openAction}
    <p className="workspace-empty-hint">An empty folder is a perfectly good starting point.</p>
  </WorkspacePage>
  return <WorkspacePage labelledBy="dashboard-heading">
    <WorkspaceHeader id="dashboard-heading" eyebrow="Your learning" title="Your projects">
      <p>Continue exploring a subject, or start with something new.</p>
    </WorkspaceHeader>
    {openAction}
    <WorkspaceSection id="project-list-heading" title="Projects" count={projects.length}>
    <ul className="workspace-project-list">
      {projects.map(project => <li key={project.id}><WorkspaceRow><button className="dashboard-project workspace-project-command" disabled={busy} onClick={() => onSelect(project.id)}>
        <span className="project-symbol"><Icon name={project.hasOutline ? 'book' : 'folder'} size={21} /></span>
        <span className="project-copy"><strong>{project.name}</strong><span className="project-path">{project.folderPath}</span></span>
        <span className={'project-state ' + (project.availability !== 'available' ? 'attention' : '')}>
          {project.availability !== 'available' ? 'Folder unavailable' : project.hasOutline ? 'Outline ready' : 'Getting started'}
        </span><Icon name="chevron" size={15} />
      </button></WorkspaceRow></li>)}
    </ul>
    </WorkspaceSection>
  </WorkspacePage>
}
