import type { ProjectSummary } from '../../../../shared/workspace'
import { Icon } from '../../components/Icon'

export function Dashboard({ projects, busy, onOpen, onSelect }: {
  projects: ProjectSummary[]; busy: boolean; onOpen(): void; onSelect(id: string): void
}) {
  if (!projects.length) return <section className="dashboard-empty workspace-enter" aria-labelledby="dashboard-heading">
    <div className="empty-illustration" aria-hidden="true"><Icon name="book" size={38} /><span className="illustration-spark"><Icon name="spark" size={16} /></span></div>
    <p className="eyebrow">Your learning workspace</p>
    <h1 id="dashboard-heading" tabIndex={-1} data-focus-anchor="heading">What would you like<br />to understand?</h1>
    <p className="empty-description">Open a folder for a subject you care about.<br />Bring your notes, or start with a question.</p>
    <button className="button primary" disabled={busy} onClick={onOpen}><Icon name="plus" size={18} />Open project</button>
    <p className="empty-hint">An empty folder is a perfectly good starting point.</p>
  </section>
  return <section className="dashboard workspace-enter" aria-labelledby="dashboard-heading">
    <div className="page-introduction"><div><p className="eyebrow">Your learning</p><h1 id="dashboard-heading" tabIndex={-1} data-focus-anchor="heading">Your projects</h1>
      <p>Continue exploring a subject, or start with something new.</p></div><button className="button primary" disabled={busy} onClick={onOpen}><Icon name="plus" size={17} />Open project</button></div>
    <div className="list-heading"><span>Projects</span><span>{projects.length}</span></div>
    <ul className="project-list">
      {projects.map(project => <li key={project.id}><button className="dashboard-project" disabled={busy} onClick={() => onSelect(project.id)}>
        <span className="project-symbol"><Icon name={project.hasOutline ? 'book' : 'folder'} size={21} /></span>
        <span className="project-copy"><strong>{project.name}</strong><span className="project-path">{project.folderPath}</span></span>
        <span className={'project-state ' + (project.availability !== 'available' ? 'attention' : '')}>
          {project.availability !== 'available' ? 'Folder unavailable' : project.hasOutline ? 'Outline ready' : 'Getting started'}
        </span><Icon name="chevron" size={15} />
      </button></li>)}
    </ul>
  </section>
}
