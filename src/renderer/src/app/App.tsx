import { useCallback, useEffect, useRef, useState } from 'react'
import { Mark } from '../components/Mark'
import { Icon } from '../components/Icon'
import { AccountPanel } from '../features/account/AccountPanel'
import { useAccount } from '../features/account/useAccount'
import { useWorkspace } from '../features/projects/useWorkspace'
import { Dashboard } from '../features/projects/Dashboard'
import { ProjectSetup } from '../features/projects/ProjectSetup'
import { ProjectModel } from '../features/projects/ProjectModel'
import { OutlineView } from '../features/projects/OutlineView'
import type { ProjectSummary } from '../../../shared/workspace'
import type { AccountSnapshot } from '../../../shared/account'

function Navigation({ projects, selected, busy, account, onOpen, onSelect, onDashboard, onAccount }: {
  projects: ProjectSummary[]; selected: string | null; busy: boolean; account: AccountSnapshot | null;
  onOpen(): void; onSelect(id: string): void; onDashboard(): void; onAccount(): void
}) {
  return <>
    <button className="studio-brand" onClick={onDashboard} aria-label="Learning Studio projects"><Mark small /><span>Learning Studio</span></button>
    <div className="navigation-actions">
      <button className={'navigation-action ' + (!selected ? 'current' : '')} onClick={onDashboard} aria-current={!selected ? 'page' : undefined}><Icon name="book" size={18} /><span>Projects</span></button>
      <button className="navigation-action" onClick={onOpen} disabled={busy}><Icon name="plus" size={18} /><span>Open project</span><span className="shortcut">⌘ / Ctrl O</span></button>
    </div>
    <div className="navigation-section-label"><span>Your projects</span>{projects.length > 0 && <span>{projects.length}</span>}</div>
    <nav className="project-navigation" aria-label="Projects">
      {!projects.length && <p className="navigation-empty">Your learning projects<br />will live here.</p>}
      {projects.map(project => <button key={project.id} className={'project-navigation-row ' + (selected === project.id ? 'current' : '')}
        aria-current={selected === project.id ? 'page' : undefined} onClick={() => onSelect(project.id)} disabled={busy}>
        <Icon name={project.availability !== 'available' ? 'info' : project.hasOutline ? 'book' : 'folder'} size={17} />
        <span><strong>{project.name}</strong>{project.availability !== 'available' && <small>Folder unavailable</small>}</span>
      </button>)}
    </nav>
    <div className="navigation-bottom">
      <button className="account-navigation" aria-label="Account settings" onClick={onAccount}>
        <span className="navigation-avatar">{account?.name ? account.name.charAt(0).toUpperCase() : <Icon name="user" size={17} />}</span>
        <span><strong>{account?.name ?? 'Connect ChatGPT'}</strong><small>{account?.status === 'connected' ? 'ChatGPT plan connected' : account?.status === 'connecting' ? 'Connecting…' : account?.name ? 'Check your connection' : 'Use your included plan'}</small></span>
        <Icon name="chevron" size={13} />
      </button>
    </div>
  </>
}

export function App() {
  const account = useAccount()
  const workspace = useWorkspace()
  const { run } = workspace
  const [accountOpen, setAccountOpen] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 880px)').matches)
  const [collapsed, setCollapsed] = useState(false)
  const [navigationOpen, setNavigationOpen] = useState(false)
  const navigationDialog = useRef<HTMLDialogElement>(null)
  const navigationToggle = useRef<HTMLButtonElement>(null)
  const scroll = useRef<HTMLElement>(null)
  const project = workspace.snapshot?.activeProject ?? null
  const projects = workspace.snapshot?.projects ?? []
  const showSidebar = !narrow && !collapsed

  const closeNavigation = useCallback(() => { navigationDialog.current?.close(); setNavigationOpen(false) }, [])
  const openProject = useCallback(() => { closeNavigation(); void run(api => api.openProject()) }, [closeNavigation, run])
  const selectProject = useCallback((id: string) => { closeNavigation(); void run(api => api.selectProject({ projectId: id })) }, [closeNavigation, run])
  const dashboard = useCallback(() => { closeNavigation(); void run(api => api.showDashboard()) }, [closeNavigation, run])
  const openAccount = useCallback(() => { closeNavigation(); setAccountOpen(true) }, [closeNavigation])
  const toggleNavigation = useCallback(() => {
    if (narrow) setNavigationOpen(value => !value)
    else setCollapsed(value => !value)
  }, [narrow])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 880px)')
    const changed = () => { setNarrow(media.matches); if (!media.matches) closeNavigation() }
    media.addEventListener('change', changed)
    return () => media.removeEventListener('change', changed)
  }, [closeNavigation])

  useEffect(() => {
    if (narrow && navigationOpen && !navigationDialog.current?.open) navigationDialog.current?.showModal()
    if ((!narrow || !navigationOpen) && navigationDialog.current?.open) navigationDialog.current.close()
  }, [narrow, navigationOpen])

  useEffect(() => {
    const command = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.isComposing || accountOpen || workspace.busy) return
      if (event.key.toLowerCase() === 'o') { event.preventDefault(); openProject() }
      const target = event.target as HTMLElement | null
      if (event.key.toLowerCase() === 'b' && !target?.matches('input, textarea, [contenteditable="true"]')) {
        event.preventDefault(); toggleNavigation()
      }
    }
    window.addEventListener('keydown', command)
    return () => window.removeEventListener('keydown', command)
  }, [accountOpen, workspace.busy, openProject, toggleNavigation])

  const activeId = project?.id ?? null
  const loaded = workspace.snapshot !== null
  useEffect(() => {
    if (!loaded) return
    scroll.current?.scrollTo({ top: 0 })
    const heading = document.getElementById('project-heading') ?? document.getElementById('outline-heading') ?? document.getElementById('dashboard-heading')
    heading?.focus({ preventScroll: true })
  }, [activeId, loaded])

  const navigation = <Navigation projects={projects} selected={activeId} busy={workspace.busy} account={account.snapshot}
    onOpen={openProject} onSelect={selectProject} onDashboard={dashboard} onAccount={openAccount} />
  const draft = project ? drafts[project.id] ?? project.brief : ''

  return <div className={'studio-shell ' + (showSidebar ? '' : 'without-sidebar')}>
    <a className="skip-link" href="#workspace">Skip to workspace</a>
    {showSidebar && <aside className="studio-sidebar">{navigation}</aside>}
    {narrow && <dialog ref={navigationDialog} className="mobile-navigation" aria-label="Project navigation"
      onCancel={event => { event.preventDefault(); closeNavigation() }} onClose={() => setNavigationOpen(false)}>
      <button className="icon-button mobile-navigation-close" aria-label="Close navigation" onClick={closeNavigation}><Icon name="close" /></button>{navigation}
    </dialog>}
    <div className="studio-workspace">
      <header className="workspace-topbar">
        <div className="topbar-location"><button ref={navigationToggle} className="icon-button" aria-label={showSidebar || navigationOpen ? 'Hide navigation' : 'Show navigation'}
          title="Toggle navigation (⌘/Ctrl+B)" aria-expanded={showSidebar || navigationOpen} onClick={toggleNavigation}><Icon name="panel" size={19} /></button>
          <span className="topbar-divider" />
          {project ? <><button className="breadcrumb-button" onClick={dashboard}>Projects</button><Icon name="chevron" size={12} /><span className="workspace-title">{project.name}</span></> : <span className="workspace-title">Projects</span>}
        </div>
        <div className="topbar-actions">
          {project?.outline && project.availability === 'available' && <ProjectModel project={project} account={account.snapshot} busy={workspace.busy}
            onConnect={openAccount} onChange={modelId => void run(api => api.setProjectModel({ projectId: project.id, modelId }))} />}
          {!showSidebar && <button className="icon-button" aria-label="Account settings" onClick={openAccount}><Icon name="user" size={18} /></button>}
        </div>
      </header>
      <main id="workspace" className="workspace-scroll" ref={scroll} tabIndex={-1} aria-busy={workspace.busy}>
        {(workspace.error || workspace.snapshot?.issue) && <div className="workspace-message error-message" role="alert"><Icon name="info" size={18} />
          <p>{workspace.error ?? workspace.snapshot?.issue}</p>{workspace.error && <button className="icon-button" aria-label="Dismiss message" onClick={workspace.clearError}><Icon name="close" size={16} /></button>}</div>}
        {!workspace.snapshot ? <div className="loading-surface" role="status">{workspace.error ? <button className="button secondary" onClick={() => void run(api => api.getWorkspace())}>Try again</button> : 'Opening your learning workspace…'}</div>
          : !project ? <Dashboard projects={projects} busy={workspace.busy} onOpen={openProject} onSelect={selectProject} />
          : project.availability !== 'available' ? <section className="unavailable-project workspace-enter"><span className="subject-emblem"><Icon name="folder" size={26} /></span>
            <h1 id="project-heading" tabIndex={-1}>{project.availability === 'missing' ? 'Let’s find your project.' : 'This project needs attention.'}</h1>
            <p>{project.issue}</p><p className="unavailable-path">{project.folderPath}</p><div className="button-row">
              <button className="button primary" disabled={workspace.busy} onClick={() => void run(api => api.locateProject({ projectId: project.id }))}><Icon name="folder" size={17} />Locate folder</button>
              <button className="button secondary" disabled={workspace.busy} onClick={() => selectProject(project.id)}>Try again</button>
            </div></section>
          : <>
            {project.issue && <div className="workspace-message" role="status"><Icon name="info" size={18} /><p>{project.issue}</p></div>}
            {project.outline ? <OutlineView saved={project.outline} /> : <ProjectSetup project={project} account={account.snapshot} draft={draft} busy={workspace.busy}
              onDraft={value => setDrafts(previous => ({ ...previous, [project.id]: value }))}
              onSave={() => void run(api => api.saveProjectBrief({ projectId: project.id, brief: draft }))}
              onModel={modelId => void run(api => api.setProjectModel({ projectId: project.id, modelId }))} onConnect={openAccount} />}
          </>}
      </main>
    </div>
    <AccountPanel open={accountOpen} onClose={() => { setAccountOpen(false); if (narrow) navigationToggle.current?.focus() }} account={account} />
  </div>
}
