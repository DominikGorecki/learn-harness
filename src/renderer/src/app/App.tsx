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
import { useGeneration } from '../features/projects/useGeneration'
import { GenerationStatus } from '../features/projects/GenerationStatus'
import { runIsBusy } from '../../../shared/generation'
import type { ProjectSummary } from '../../../shared/workspace'
import type { AccountSnapshot } from '../../../shared/account'
import { SettingsPanel } from '../features/settings/SettingsPanel'
import { useAppearance } from '../features/settings/appearance'
type NavigationIntent = { kind: 'open' | 'dashboard' } | { kind: 'select'; id: string }

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
        <span><strong>{project.name}</strong>{project.availability !== 'available' ? <small>Folder unavailable</small> : projects.filter(other => other.name === project.name).length > 1 && <small className="project-location">{project.folderPath.split(/[/\\]/).filter(Boolean).at(-1)}</small>}</span>
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
  const appearance = useAppearance()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsTrigger = useRef<HTMLButtonElement>(null)
  const account = useAccount()
  const workspace = useWorkspace()
  const generation = useGeneration()
  const { run } = workspace
  const [accountOpen, setAccountOpen] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [refining, setRefining] = useState<Record<string, string | null>>({})
  const [confirmReplace, setConfirmReplace] = useState(false)
  const replacementDialog = useRef<HTMLDialogElement>(null)
  const [pendingNavigation, setPendingNavigation] = useState<NavigationIntent | null>(null)
  const switchDialog = useRef<HTMLDialogElement>(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const saveDialog = useRef<HTMLDialogElement>(null)
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 880px)').matches)
  const [collapsed, setCollapsed] = useState(false)
  const [navigationOpen, setNavigationOpen] = useState(false)
  const navigationDialog = useRef<HTMLDialogElement>(null)
  const navigationToggle = useRef<HTMLButtonElement>(null)
  const scroll = useRef<HTMLElement>(null)
  const lastPresentedRun = useRef<string | null>(null)
  const project = workspace.snapshot?.activeProject ?? null
  const projects = workspace.snapshot?.projects ?? []
  const showSidebar = !narrow && !collapsed
  const outlineRun = generation.snapshot?.runs.find(run => run.projectId === project?.id) ?? null
  const generationBusy = runIsBusy(outlineRun)
  const anyGenerationBusy = Boolean(generation.snapshot?.activeRunId)
  const activeRun = generation.snapshot?.runs.find(run => run.id === generation.snapshot?.activeRunId)

  const closeNavigation = useCallback(() => { navigationDialog.current?.close(); setNavigationOpen(false) }, [])
  const performNavigation = useCallback((intent: NavigationIntent) => {
    closeNavigation()
    void run(api => intent.kind === 'open' ? api.openProject() : intent.kind === 'select' ? api.selectProject({ projectId: intent.id }) : api.showDashboard())
  }, [closeNavigation, run])
  const navigate = useCallback((intent: NavigationIntent) => {
    closeNavigation()
    if (anyGenerationBusy) setPendingNavigation(intent)
    else performNavigation(intent)
  }, [closeNavigation, anyGenerationBusy, performNavigation])
  const openProject = useCallback(() => navigate({ kind: 'open' }), [navigate])
  const selectProject = useCallback((id: string) => navigate({ kind: 'select', id }), [navigate])
  const dashboard = useCallback(() => navigate({ kind: 'dashboard' }), [navigate])
  const openAccount = useCallback(() => { closeNavigation(); setAccountOpen(true) }, [closeNavigation])
  const openSettings = useCallback(() => { closeNavigation(); setSettingsOpen(true) }, [closeNavigation])
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
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.isComposing || accountOpen || settingsOpen || confirmReplace || confirmSave || pendingNavigation || workspace.busy) return
      if (event.key === ',') { event.preventDefault(); openSettings(); return }
      if (event.key.toLowerCase() === 'o') { event.preventDefault(); openProject() }
      const target = event.target as HTMLElement | null
      if (event.key.toLowerCase() === 'b' && !target?.matches('input, textarea, [contenteditable="true"]')) {
        event.preventDefault(); toggleNavigation()
      }
    }
    window.addEventListener('keydown', command)
    return () => window.removeEventListener('keydown', command)
  }, [accountOpen, settingsOpen, confirmReplace, confirmSave, pendingNavigation, workspace.busy, openProject, openSettings, toggleNavigation])

  useEffect(() => {
    if (confirmReplace && !replacementDialog.current?.open) replacementDialog.current?.showModal()
    if (!confirmReplace && replacementDialog.current?.open) replacementDialog.current.close()
  }, [confirmReplace])
  useEffect(() => {
    if (pendingNavigation && !switchDialog.current?.open) switchDialog.current?.showModal()
    if (!pendingNavigation && switchDialog.current?.open) switchDialog.current.close()
  }, [pendingNavigation])
  useEffect(() => {
    if (confirmSave && !saveDialog.current?.open) saveDialog.current?.showModal()
    if (!confirmSave && saveDialog.current?.open) saveDialog.current.close()
  }, [confirmSave])

  const activeId = project?.id ?? null
  const loaded = workspace.snapshot !== null
  const savedRunId = outlineRun?.status === 'saved' ? outlineRun.id : null
  useEffect(() => {
    if (!savedRunId || lastPresentedRun.current === savedRunId) return
    lastPresentedRun.current = savedRunId
    if (accountOpen || settingsOpen || confirmReplace || document.activeElement?.matches('input, textarea, [contenteditable="true"]')) return
    scroll.current?.scrollTo({ top: 0 })
    if (document.activeElement === document.body) document.getElementById('outline-heading')?.focus({ preventScroll: true })
  }, [savedRunId, accountOpen, settingsOpen, confirmReplace])
  useEffect(() => {
    if (!loaded) return
    scroll.current?.scrollTo({ top: 0 })
    const heading = document.getElementById('project-heading') ?? document.getElementById('outline-heading') ?? document.getElementById('dashboard-heading')
    heading?.focus({ preventScroll: true })
  }, [activeId, loaded])

  const navigation = <Navigation projects={projects} selected={activeId} busy={workspace.busy} account={account.snapshot}
    onOpen={openProject} onSelect={selectProject} onDashboard={dashboard} onAccount={openAccount} />
  const draft = project ? drafts[project.id] ?? project.brief : ''
  const modelId = project?.selectedModel?.id ?? account.snapshot?.models[0]?.id ?? ''
  const currentModelUnavailable = Boolean(project?.selectedModel && account.snapshot?.modelsStatus === 'ready' && !account.snapshot.models.some(model => model.id === modelId))
  const createOutline = (replace = false) => {
    if (!project || workspace.busy || anyGenerationBusy) return
    if (account.snapshot?.status !== 'connected' || account.snapshot.modelsStatus !== 'ready' || !modelId || account.snapshot.modelTestStatus === 'testing') { openAccount(); return }
    if ((project.outline || outlineRun?.status === 'unsaved') && !replace) { setConfirmReplace(true); return }
    setConfirmReplace(false)
    void generation.run(api => api.createOutline({ projectId: project.id, brief: draft, modelId, replace }))
  }
  const generatedUnsaved = outlineRun && ['unsaved', 'saving'].includes(outlineRun.status) ? outlineRun.result : null
  const displayedOutline = generatedUnsaved ?? project?.outline
  const isRefining = Boolean(project?.outline && refining[project.id] === project.outline.generatedAt)
  const cancelAndNavigate = async () => {
    if (!pendingNavigation) return
    if (activeRun) {
      const result = await generation.run(api => api.cancelOutline({ projectId: activeRun.projectId, runId: activeRun.id }))
      if (!result || result.activeRunId) return
    }
    const intent = pendingNavigation
    setPendingNavigation(null)
    performNavigation(intent)
  }

  return <div className={'studio-shell ' + (showSidebar ? '' : 'without-sidebar')}>
    <a className="skip-link" href="#workspace">Skip to workspace</a>
    <div className="studio-rail" role="group" aria-label="Workspace controls">
      <button className="rail-button rail-home" aria-label="Project dashboard" title="Projects" onClick={dashboard}><Icon name="home" size={21} /><span className="rail-accent" /></button>
      <button className="rail-button" aria-label="Choose project folder" title="Open project (⌘/Ctrl+O)" disabled={workspace.busy} onClick={openProject}><Icon name="folder" size={21} /></button>
      <div className="rail-spacer" />
      <button ref={settingsTrigger} className="rail-button" aria-label="Settings" title="Settings (⌘/Ctrl+,)" onClick={openSettings}><Icon name="settings" size={21} /></button>
    </div>
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
          {project ? <><button className="breadcrumb-button" onClick={dashboard}>Projects</button><Icon name="chevron" size={12} /><span className="workspace-title" title={project.name}>{project.name}</span></> : <span className="workspace-title">Projects</span>}
        </div>
        <div className="topbar-actions">
          {project?.outline && project.availability === 'available' && <ProjectModel project={project} account={account.snapshot} busy={workspace.busy || generationBusy}
            onConnect={openAccount} onChange={modelId => void run(api => api.setProjectModel({ projectId: project.id, modelId }))} />}
          {!showSidebar && <button className="icon-button" aria-label="Account settings" onClick={openAccount}><Icon name="user" size={18} /></button>}
        </div>
      </header>
      <main id="workspace" className="workspace-scroll" ref={scroll} tabIndex={-1} aria-busy={workspace.busy}>
        <div className="sr-only" role="status" aria-live="polite">{outlineRun?.status === 'saved' ? 'Outline saved to your project.' : ''}</div>
        {generation.error && <div className="workspace-message error-message" role="alert"><p>{generation.error}</p><button className="icon-button" aria-label="Dismiss outline message" onClick={generation.clearError}><Icon name="close" size={16} /></button></div>}
        {(workspace.error || workspace.snapshot?.issue) && <div className="workspace-message error-message" role="alert"><Icon name="info" size={18} />
          <p>{workspace.error ?? workspace.snapshot?.issue}</p>{workspace.error && <button className="icon-button" aria-label="Dismiss message" onClick={workspace.clearError}><Icon name="close" size={16} /></button>}</div>}
        {project && outlineRun && <GenerationStatus run={outlineRun} onConnect={openAccount}
          onCancel={() => void generation.run(api => api.cancelOutline({ projectId: project.id, runId: outlineRun.id }))}
          onSave={() => outlineRun.errorCode === 'CONFLICT' ? setConfirmSave(true) : void generation.run(api => api.retryOutlineSave({ projectId: project.id, runId: outlineRun.id }))} />}
        {!workspace.snapshot ? <div className="loading-surface" role="status">{workspace.error ? <button className="button secondary" onClick={() => void run(api => api.getWorkspace())}>Try again</button> : 'Opening your learning workspace…'}</div>
          : !project ? <Dashboard projects={projects} busy={workspace.busy} onOpen={openProject} onSelect={selectProject} />
          : project.availability !== 'available' ? <><section className="unavailable-project workspace-enter"><span className="subject-emblem"><Icon name="folder" size={26} /></span>
            <h1 id="project-heading" tabIndex={-1}>{project.availability === 'missing' ? 'Let’s find your project.' : 'This project needs attention.'}</h1>
            <p>{project.issue}</p><p className="unavailable-path">{project.folderPath}</p><div className="button-row">
              <button className="button primary" disabled={workspace.busy} onClick={() => void run(api => api.locateProject({ projectId: project.id }))}><Icon name="folder" size={17} />Locate folder</button>
              <button className="button secondary" disabled={workspace.busy} onClick={() => selectProject(project.id)}>Try again</button>
            </div></section>{generatedUnsaved && <OutlineView saved={generatedUnsaved} unsaved />}</>
          : <>
            {project.issue && <div className="workspace-message" role="status"><Icon name="info" size={18} /><p>{project.issue}</p></div>}
            {displayedOutline && !generationBusy && !generatedUnsaved && <div className="outline-toolbar"><button className="quiet-button" onClick={() => setRefining(previous => ({ ...previous, [project.id]: isRefining ? null : project.outline!.generatedAt }))}>
              <Icon name={isRefining ? 'close' : 'refresh'} size={14} />{isRefining ? 'Back to outline' : 'Refine learning direction'}</button></div>}
            {(!displayedOutline || isRefining) && <ProjectSetup project={project} account={account.snapshot} draft={draft} busy={workspace.busy || generationBusy} refining={Boolean(project.outline)}
              needsDetails={outlineRun?.status === 'needs-details'}
              canCreate={project.writable && (Boolean(draft.trim()) || (project.sourceHint === 'files' && outlineRun?.status !== 'needs-details')) && !anyGenerationBusy && !currentModelUnavailable && account.snapshot?.modelTestStatus !== 'testing'}
              onDraft={value => setDrafts(previous => ({ ...previous, [project.id]: value }))}
              onCreate={() => createOutline()}
              onSave={() => void run(api => api.saveProjectBrief({ projectId: project.id, brief: draft }))}
              onModel={modelId => void run(api => api.setProjectModel({ projectId: project.id, modelId }))} onConnect={openAccount} />}
            {currentModelUnavailable && <p className="model-recovery">Your saved model is unavailable. Choose another project model to create an outline.</p>}
            {displayedOutline && <OutlineView saved={displayedOutline} unsaved={Boolean(generatedUnsaved)} />}
          </>}
      </main>
    </div>
    <AccountPanel open={accountOpen} onClose={() => { setAccountOpen(false); if (narrow) navigationToggle.current?.focus() }} account={account} locked={anyGenerationBusy} />
    <SettingsPanel open={settingsOpen} onClose={() => { setSettingsOpen(false); settingsTrigger.current?.focus() }}
      appearance={appearance.appearance} onAppearance={appearance.chooseAppearance} persistent={appearance.persistent} />
    <dialog ref={replacementDialog} className="confirmation-dialog" aria-labelledby="replacement-heading" onCancel={() => setConfirmReplace(false)} onClose={() => setConfirmReplace(false)}>
      <h2 id="replacement-heading">Create a new learning outline?</h2>
      <p>{outlineRun?.status === 'unsaved' ? 'This will discard the unsaved result and use ChatGPT again.' : 'Your current outline stays available while the new one is created. A successful save replaces it. This uses your ChatGPT plan allowance.'}</p>
      <div className="button-row"><button className="button secondary" autoFocus onClick={() => setConfirmReplace(false)}>Keep current outline</button><button className="button primary" onClick={() => createOutline(true)}>Create new outline</button></div>
    </dialog>
    <dialog ref={switchDialog} className="confirmation-dialog" aria-labelledby="switch-heading" onCancel={() => setPendingNavigation(null)} onClose={() => setPendingNavigation(null)}>
      <h2 id="switch-heading">{activeRun ? 'An outline is still in progress' : 'Your outline request has finished'}</h2>
      <p>{activeRun?.status === 'saving' ? 'Your outline is being saved. You can switch projects once saving finishes.' : activeRun ? 'Stay here while it finishes, or cancel before switching. Your learning goal and previous saved outline will remain available.' : 'You can continue to the other workspace.'}</p>
      <div className="button-row"><button className="button secondary" autoFocus onClick={() => setPendingNavigation(null)}>Stay here</button><button className="button primary" disabled={activeRun?.status === 'saving'} onClick={() => void cancelAndNavigate()}>{activeRun ? 'Cancel and switch' : 'Continue'}</button></div>
    </dialog>
    <dialog ref={saveDialog} className="confirmation-dialog" aria-labelledby="save-conflict-heading" onCancel={() => setConfirmSave(false)} onClose={() => setConfirmSave(false)}>
      <h2 id="save-conflict-heading">Save over the changed outline?</h2>
      <p>The project changed since this outline was created. Saving will replace its current outline and learning goal with this generated result. Other project settings will be kept. No new AI request is needed.</p>
      <div className="button-row"><button className="button secondary" autoFocus onClick={() => setConfirmSave(false)}>Keep reviewing</button><button className="button primary" onClick={() => {
        setConfirmSave(false)
        if (project && outlineRun) void generation.run(api => api.retryOutlineSave({ projectId: project.id, runId: outlineRun.id, replaceChanged: true }))
      }}>Save generated outline</button></div>
    </dialog>
  </div>
}
