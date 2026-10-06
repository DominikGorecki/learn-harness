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
import { OutlineEditDialog } from '../features/projects/OutlineEditDialog'
import { useGeneration } from '../features/projects/useGeneration'
import { AiActivityPanel } from '../features/ai/AiActivityPanel'
import { useAiActivity } from '../features/ai/useAiActivity'
import { modelTestAdmission, projectNavigationState, newerActivity } from '../features/ai/activity-state'
import { runIsBusy } from '../../../shared/generation'
import type { ProjectSummary } from '../../../shared/workspace'
import type { AccountSnapshot } from '../../../shared/account'
import type { AiOperationKind } from '../../../shared/ai/activity'
import { SettingsPanel } from '../features/settings/SettingsPanel'
import { useAppearance } from '../features/settings/appearance'
import { ShellChrome } from './ShellChrome'
import { useNavigation } from './navigation/useNavigation'
import { useApplicationCommands } from './useApplicationCommands'
import { destinationFromWorkspace, destinationKey } from './navigation/destination'
import type { AiActivitySnapshot } from '../../../shared/ai/activity'
import type { GenerationSnapshot } from '../../../shared/generation'


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
  const ai = useAiActivity()
  const [dismissedActivity, setDismissedActivity] = useState<string | null>(null)
  const [dismissedRecovery, setDismissedRecovery] = useState<string | null>(null)
  const [recoveryPresentationId, setRecoveryPresentationId] = useState<string | null>(null)
  const [acceptedContext, setAcceptedContext] = useState<{ after: number; heading: string; model: string; request: string; kind: AiOperationKind; projectId?: string } | null>(null)
  const [educationPending, setEducationPending] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)
  const [editAccepted, setEditAccepted] = useState(false)
  const accountAccepted = useRef(false)
  const [topicTitles, setTopicTitles] = useState<Record<string, string>>({})
  const { run } = workspace
  const [accountOpen, setAccountOpen] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [refining, setRefining] = useState<Record<string, string | null>>({})
  const [editProjectId, setEditProjectId] = useState<string | null>(null)
  const [editTopicId, setEditTopicId] = useState<string | null>(null)
  const [editDrafts, setEditDrafts] = useState<Record<string, { outlineAt: string; text: string }>>({})
  const [submittingEdit, setSubmittingEdit] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const replacementDialog = useRef<HTMLDialogElement>(null)
  const [pendingNavigation, setPendingNavigation] = useState(false)
  const [savingNotice, setSavingNotice] = useState(false)
  const navigationDecision = useRef<((accepted: boolean) => void) | null>(null)
  const admissionPending = useRef(false)
  const storagePending = useRef(false)
  const cancellationPending = useRef(false)
  const latestAi = useRef<AiActivitySnapshot | null>(null)
  const latestGeneration = useRef<GenerationSnapshot | null>(null)
  const switchDialog = useRef<HTMLDialogElement>(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const saveDialog = useRef<HTMLDialogElement>(null)
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 880px)').matches)
  const [collapsed, setCollapsed] = useState(false)
  const [navigationOpen, setNavigationOpen] = useState(false)
  const navigationDialog = useRef<HTMLDialogElement>(null)
  const navigationToggle = useRef<HTMLButtonElement>(null)
  const scroll = useRef<HTMLElement>(null)
  const project = workspace.snapshot?.activeProject ?? null
  const projects = workspace.snapshot?.projects ?? []
  const showSidebar = !narrow && !collapsed
  const outlineRun = generation.snapshot?.runs.find(run => run.projectId === project?.id) ?? null
  const generationBusy = runIsBusy(outlineRun)
  const anyGenerationBusy = Boolean(generation.snapshot?.activeRunId)
  const activeRun = generation.snapshot?.runs.find(run => run.id === generation.snapshot?.activeRunId)
  const aiBusy = ai.busy
  const latestOperation = ai.snapshot?.active ?? ai.snapshot?.settled ?? null
  const awaitingActivity = Boolean(acceptedContext && (!latestOperation || (ai.snapshot?.revision ?? -1) <= acceptedContext.after) && ai.pending)
  const switching = projectNavigationState(ai.snapshot?.active ?? null, activeRun, educationPending || awaitingActivity && Boolean(acceptedContext?.projectId))
  const visibleOperation = awaitingActivity ? null : ai.snapshot?.active ?? (latestOperation?.operationId !== dismissedActivity ? latestOperation : null)
  const recoverableRun = outlineRun && ['unsaved', 'saving'].includes(outlineRun.status) && outlineRun.result ? outlineRun : null
  const selectedRecovery = generation.snapshot?.runs.find(run => run.id === recoveryPresentationId && run.projectId === project?.id) ?? recoverableRun
  const panelRun = visibleOperation?.runId ? generation.snapshot?.runs.find(run => run.id === visibleOperation.runId) ?? null : !visibleOperation && !awaitingActivity && selectedRecovery?.id !== dismissedRecovery ? selectedRecovery : null
  const panelVisible = Boolean(visibleOperation || panelRun || awaitingActivity)
  const topicKey = visibleOperation?.topicId ? JSON.stringify([visibleOperation.projectId, visibleOperation.topicId]) : null
  const savedTopicTitle = visibleOperation?.topicId && visibleOperation.projectId === project?.id ? project?.outline?.document.lessons.find(lesson => lesson.id === visibleOperation.topicId)?.title : null
  const panelHeading = visibleOperation?.kind === 'rewrite-topic' ? `Updating ${savedTopicTitle ?? (topicKey ? topicTitles[topicKey] : null) ?? 'this topic'}` :
    visibleOperation?.heading ?? (awaitingActivity ? acceptedContext!.heading : panelRun?.status === 'saved' ? panelRun.topicId ? 'Topic saved to your project' : 'Outline saved to your project' : panelRun?.topicId ? 'Recover this topic’s save' : 'Recover your outline’s save')

  const closeNavigation = useCallback(() => { navigationDialog.current?.close(); setNavigationOpen(false) }, [])
  useEffect(() => {
    const stopAi = window.learning.onAiActivityChanged(value => { latestAi.current = newerActivity(latestAi.current, value) })
    const stopGeneration = window.learning.onGenerationChanged(value => { latestGeneration.current = value })
    void window.learning.getAiActivity().then(value => { if (value.ok) latestAi.current = newerActivity(latestAi.current, value.data) })
    void window.learning.getGeneration().then(value => { if (value.ok && !latestGeneration.current) latestGeneration.current = value.data })
    return () => { stopAi(); stopGeneration() }
  }, [])
  const navigationOwnership = useCallback(() => {
    const snapshot = latestGeneration.current
    const active = snapshot?.runs.find(run => run.id === snapshot.activeRunId)
    const state = projectNavigationState(latestAi.current?.active ?? null, active, admissionPending.current || cancellationPending.current)
    return storagePending.current ? { busy: true, saving: true, canProceed: false } : state
  }, [])
  const available = useCallback(() => !navigationOwnership().busy, [navigationOwnership])
  const guardNavigation = useCallback(async () => {
    const ownership = navigationOwnership()
    if (!ownership.busy) return true
    if (ownership.saving || !ownership.canProceed) { setSavingNotice(true); return false }
    setPendingNavigation(true)
    return new Promise<boolean>(resolve => { navigationDecision.current = resolve })
  }, [navigationOwnership])
  const location = useNavigation(workspace, scroll, guardNavigation, available, closeNavigation)
  const openProject = location.open
  const selectProject = location.select
  const dashboard = location.dashboard
  const decideNavigation = useCallback((accepted: boolean) => {
    const resolve = navigationDecision.current
    navigationDecision.current = null
    setPendingNavigation(false)
    resolve?.(accepted)
  }, [])
  const openAccount = useCallback(() => { accountAccepted.current = false; closeNavigation(); setAccountOpen(true) }, [closeNavigation])
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

  useApplicationCommands(location, showSidebar || navigationOpen, toggleNavigation, openSettings)
  useEffect(() => { void window.learning.setWindowAppearance({ mode: appearance.appearance }) }, [appearance.appearance])

  useEffect(() => {
    if (confirmReplace && !replacementDialog.current?.open) replacementDialog.current?.showModal()
    if (!confirmReplace && replacementDialog.current?.open) replacementDialog.current.close()
  }, [confirmReplace])
  useEffect(() => {
    if ((pendingNavigation || savingNotice) && !switchDialog.current?.open) switchDialog.current?.showModal()
    if (!pendingNavigation && !savingNotice && switchDialog.current?.open) switchDialog.current.close()
  }, [pendingNavigation, savingNotice])
  useEffect(() => {
    if (confirmSave && !saveDialog.current?.open) saveDialog.current?.showModal()
    if (!confirmSave && saveDialog.current?.open) saveDialog.current.close()
  }, [confirmSave])

  const activeId = project?.id ?? null
  useEffect(() => {
    const pending = new Set<string>()
    return window.learning.onGenerationChanged(snapshot => {
      const completed: string[] = []
      for (const run of snapshot.runs) {
        if (runIsBusy(run)) pending.add(run.id)
        else {
          if (run.status === 'saved' && pending.has(run.id)) completed.push(JSON.stringify([run.projectId, run.topicId ?? null]))
          pending.delete(run.id)
        }
      }
      if (completed.length) setEditDrafts(previous => {
        const next = { ...previous }; for (const key of completed) delete next[key]; return next
      })
    })
  }, [])
  const navigation = <Navigation projects={projects} selected={activeId} busy={workspace.busy || location.pending} account={account.snapshot}
    onOpen={openProject} onSelect={selectProject} onDashboard={dashboard} onAccount={openAccount} />
  const draft = project ? drafts[project.id] ?? project.brief : ''
  const modelId = project?.selectedModel?.id ?? account.snapshot?.models[0]?.id ?? ''
  const currentModelUnavailable = Boolean(project?.selectedModel && account.snapshot?.modelsStatus === 'ready' && !account.snapshot.models.some(model => model.id === modelId))
  const handledFocus = useCallback(() => setFocusRequest(0), [])
  const acceptedStart = (heading: string, request: string, model: string, after: number, kind: AiOperationKind, projectId?: string) => { setAcceptedContext({ heading, request, model, after, kind, projectId }); setRecoveryPresentationId(null); setDismissedActivity(null); setFocusRequest(value => value + 1) }
  const createOutline = async (replace = false) => {
    if (!project || workspace.busy || anyGenerationBusy || aiBusy) return
    if (account.snapshot?.status !== 'connected' || account.snapshot.modelsStatus !== 'ready' || !modelId || account.snapshot.modelTestStatus === 'testing') { openAccount(); return }
    if ((project.outline || outlineRun?.status === 'unsaved') && !replace) { setConfirmReplace(true); return }
    admissionPending.current = true
    setEducationPending(true)
    try {
      const state = await ai.start(() => generation.run(api => api.createOutline({ projectId: project.id, brief: draft, modelId, replace })))
      if (state) { setConfirmReplace(false); acceptedStart('Creating your outline', draft.slice(0, 512), account.snapshot.models.find(model => model.id === modelId)?.name ?? modelId, ai.snapshot?.revision ?? -1, 'create-outline', project.id) }
    } finally { admissionPending.current = false; setEducationPending(false) }
  }
  const generatedUnsaved = outlineRun && ['unsaved', 'saving'].includes(outlineRun.status) ? outlineRun.result : null
  const displayedOutline = generatedUnsaved ?? project?.outline
  const isRefining = Boolean(project?.outline && refining[project.id] === project.outline.generatedAt)
  const editDraftKey = JSON.stringify([project?.id, editTopicId])
  const editedTopic = project?.outline?.document.lessons.find(lesson => lesson.id === editTopicId)
  const editRevision = editedTopic ? JSON.stringify(editedTopic) : project?.outline?.generatedAt ?? ''
  const editDraft = project?.outline && editDrafts[editDraftKey]?.outlineAt === editRevision ? editDrafts[editDraftKey]!.text : ''
  const rewriteOutline = async () => {
    if (!project?.outline || submittingEdit || workspace.busy || anyGenerationBusy || aiBusy) return
    if (account.snapshot?.status !== 'connected' || account.snapshot.modelsStatus !== 'ready' || !modelId || account.snapshot.modelTestStatus === 'testing') {
      setEditProjectId(null); openAccount(); return
    }
    setSubmittingEdit(true)
    admissionPending.current = true
    setEducationPending(true)
    try {
      const request = { projectId: project.id, modelId, changes: editDraft }
      if (editedTopic) setTopicTitles(previous => ({ ...previous, [JSON.stringify([project.id, editedTopic.id])]: editedTopic.title }))
      const state = await ai.start(() => generation.run(api => editTopicId ? api.rewriteTopic({ ...request, topicId: editTopicId }) : api.rewriteOutline(request)))
      if (state) { setEditAccepted(true); setEditProjectId(null); acceptedStart(editedTopic ? `Updating ${editedTopic.title}` : 'Rewriting your outline', editDraft.slice(0, 512), account.snapshot.models.find(model => model.id === modelId)?.name ?? modelId, ai.snapshot?.revision ?? -1, editTopicId ? 'rewrite-topic' : 'rewrite-outline', project.id) }
    } finally { admissionPending.current = false; setSubmittingEdit(false); setEducationPending(false) }
  }
  const testModel = async (modelId: string) => {
    const state = await ai.start(async () => modelTestAdmission(await account.run(api => modelId === 'gpt-6.1-sol' ? api.testSolModel() : api.testLunaModel())))
    if (state) { accountAccepted.current = true; setAccountOpen(false); acceptedStart(modelId === 'gpt-6.1-sol' ? 'Testing GPT-6.1 Sol' : 'Testing GPT-6 Luna', '', modelId === 'gpt-6.1-sol' ? 'GPT-6.1 Sol' : 'GPT-6 Luna', ai.snapshot?.revision ?? -1, modelId === 'gpt-6.1-sol' ? 'test-sol' : 'test-luna') }
  }
  const retrySave = async (projectId: string, runId: string, replaceChanged = false) => {
    if (storagePending.current) return
    storagePending.current = true
    try { await generation.run(api => api.retryOutlineSave({ projectId, runId, replaceChanged })) }
    finally { storagePending.current = false }
  }
  const saveRun = (target: typeof panelRun) => {
    if (!target) return
    if (target.errorCode === 'CONFLICT') {
      if (project?.id !== target.projectId) { selectProject(target.projectId); return }
      setConfirmSave(true)
    } else void retrySave(target.projectId, target.id)
  }
  const reviewInput = () => {
    const target = visibleOperation?.projectId ?? panelRun?.projectId
    if (target && target !== project?.id) { selectProject(target); return }
    if (project?.outline && visibleOperation?.kind !== 'create-outline') {
      setEditAccepted(false); setEditTopicId(visibleOperation?.topicId ?? panelRun?.topicId ?? null); setEditProjectId(project.id)
    } else {
      if (project?.outline) setRefining(previous => ({ ...previous, [project.id]: project.outline!.generatedAt }))
      requestAnimationFrame(() => document.getElementById('learning-details')?.focus())
    }
  }
  const cancelAndNavigate = async () => {
    if (!navigationDecision.current || cancellationPending.current) return
    const ownership = navigationOwnership()
    if (ownership.saving || !ownership.canProceed) { decideNavigation(false); setSavingNotice(true); return }
    cancellationPending.current = true
    try {
      const owner = latestAi.current?.active
      if (owner?.projectId) {
        const result = await ai.cancel(owner.operationId)
        if (result) latestAi.current = newerActivity(latestAi.current, result)
        if (!result || result.active) { decideNavigation(false); return }
        const observed = latestGeneration.current
        const settled = await window.learning.getGeneration()
        if (settled.ok && latestGeneration.current === observed) latestGeneration.current = settled.data
      }
    } finally { cancellationPending.current = false }
    decideNavigation(!navigationOwnership().busy)
  }
  useEffect(() => {
    return window.learning.onGenerationChanged(value => {
      if (navigationDecision.current && value.runs.some(run => run.status === 'saving')) { decideNavigation(false); setSavingNotice(true) }
    })
  }, [decideNavigation])

  return <div className={'studio-shell ' + (showSidebar ? '' : 'without-sidebar')}>
    <ShellChrome back={location.back} forward={location.forward} pending={location.pending} sidebarVisible={showSidebar || navigationOpen} toggleRef={navigationToggle} onBack={location.goBack} onForward={location.goForward} onToggle={toggleNavigation} />
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
        <div className="topbar-location">
          {project ? <><button className="breadcrumb-button" onClick={dashboard}>Projects</button><Icon name="chevron" size={12} /><span className="workspace-title" title={project.name}>{project.name}</span></> : <span className="workspace-title">Projects</span>}
        </div>
        <div className="topbar-actions">
          {project?.outline && project.availability === 'available' && <ProjectModel project={project} account={account.snapshot} busy={workspace.busy || generationBusy}
            onConnect={openAccount} onChange={modelId => void run(api => api.setProjectModel({ projectId: project.id, modelId }))} />}
          {!showSidebar && <button className="icon-button" aria-label="Account settings" onClick={openAccount}><Icon name="user" size={18} /></button>}
        </div>
      </header>
      <main id="workspace" data-project-handle={project?.id} data-destination={workspace.snapshot ? destinationKey(destinationFromWorkspace(workspace.snapshot)) : undefined} className="workspace-scroll" ref={scroll} tabIndex={-1} aria-busy={workspace.busy}>
        {ai.error && !panelVisible && <div className="workspace-message error-message" role="alert"><p>{ai.error}</p><button className="button secondary" onClick={() => void ai.refresh()}>Refresh AI activity</button></div>}
        {generation.error && <div className="workspace-message error-message" role="alert"><p>{generation.error}</p><button className="icon-button" aria-label="Dismiss outline message" onClick={generation.clearError}><Icon name="close" size={16} /></button></div>}
        {(workspace.error || workspace.snapshot?.issue) && <div className="workspace-message error-message" role="alert"><Icon name="info" size={18} />
          <p>{workspace.error ?? workspace.snapshot?.issue}</p>{workspace.error && <button className="icon-button" aria-label="Dismiss message" onClick={workspace.clearError}><Icon name="close" size={16} /></button>}</div>}
        {recoverableRun && (!panelVisible || visibleOperation?.runId !== recoverableRun.id) && <div className="workspace-message" role="status"><p>Your validated outline is still unsaved.</p><button className="button secondary" disabled={Boolean(ai.snapshot?.active)} onClick={() => { setDismissedActivity(latestOperation?.operationId ?? null); setDismissedRecovery(null); setRecoveryPresentationId(recoverableRun.id) }}>Review unsaved result</button></div>}
        {!workspace.snapshot ? <div className="loading-surface" role="status">{workspace.error ? <button className="button secondary" onClick={() => void run(api => api.getWorkspace())}>Try again</button> : 'Opening your learning workspace…'}</div>
          : !project ? <Dashboard projects={projects} busy={workspace.busy} onOpen={openProject} onSelect={selectProject} />
          : project.availability !== 'available' ? <><section className="unavailable-project workspace-enter"><span className="subject-emblem"><Icon name="folder" size={26} /></span>
            <h1 id="project-heading" tabIndex={-1} data-focus-anchor="heading">{project.availability === 'missing' ? 'Let’s find your project.' : 'This project needs attention.'}</h1>
            <p>{project.issue}</p><p className="unavailable-path">{project.folderPath}</p><div className="button-row">
              <button className="button primary" disabled={workspace.busy} onClick={() => location.refresh(project.id, true)}><Icon name="folder" size={17} />Locate folder</button>
              <button className="button secondary" disabled={workspace.busy} onClick={() => location.refresh(project.id)}>Try again</button>
            </div></section>{generatedUnsaved && <OutlineView key={project.id} saved={generatedUnsaved} unsaved />}</>
          : <>
            {project.issue && <div className="workspace-message" role="status"><Icon name="info" size={18} /><p>{project.issue}</p></div>}
            {displayedOutline && !generationBusy && !generatedUnsaved && <div className="outline-toolbar"><button className="quiet-button" onClick={() => setRefining(previous => ({ ...previous, [project.id]: isRefining ? null : project.outline!.generatedAt }))}>
              <Icon name={isRefining ? 'close' : 'refresh'} size={14} />{isRefining ? 'Back to outline' : 'Refine learning direction'}</button></div>}
            {(!displayedOutline || isRefining) && <ProjectSetup project={project} account={account.snapshot} draft={draft} busy={workspace.busy || generationBusy} refining={Boolean(project.outline)}
              needsDetails={outlineRun?.status === 'needs-details'}
              canCreate={project.writable && (Boolean(draft.trim()) || (project.sourceHint === 'files' && outlineRun?.status !== 'needs-details')) && !anyGenerationBusy && !aiBusy && !currentModelUnavailable}
              onDraft={value => setDrafts(previous => ({ ...previous, [project.id]: value }))}
              onCreate={() => void createOutline()}
              onSave={() => void run(api => api.saveProjectBrief({ projectId: project.id, brief: draft }))}
              onModel={modelId => void run(api => api.setProjectModel({ projectId: project.id, modelId }))} onConnect={openAccount} />}
            {currentModelUnavailable && <p className="model-recovery">Your saved model is unavailable. Choose another project model to create an outline.</p>}
            {displayedOutline && <OutlineView key={project.id} saved={displayedOutline} unsaved={Boolean(generatedUnsaved)}
              activeTopicId={ai.snapshot?.active?.projectId === project.id ? ai.snapshot.active.topicId : undefined}
              onEdit={() => { generation.clearError(); setEditAccepted(false); setEditTopicId(null); setEditProjectId(project.id) }}
              onEditTopic={topicId => { generation.clearError(); setEditAccepted(false); setEditTopicId(topicId); setEditProjectId(project.id) }}
              editDisabled={!project.writable || workspace.busy || anyGenerationBusy || aiBusy || Boolean(generatedUnsaved) || submittingEdit} />}
          </>}
      </main>
      {panelVisible && <AiActivityPanel operation={visibleOperation} recovery={panelRun} active={Boolean(ai.snapshot?.active)} heading={panelHeading} focusRequest={focusRequest} onFocusHandled={handledFocus}
        awaiting={awaitingActivity ? acceptedContext : null}
        onCancel={() => { if (ai.snapshot?.active) void ai.cancel(ai.snapshot.active.operationId) }}
        onDismiss={() => { setDismissedActivity(visibleOperation?.operationId ?? latestOperation?.operationId ?? null); setDismissedRecovery(panelRun?.id ?? recoverableRun?.id ?? null); setRecoveryPresentationId(null); if (document.activeElement?.closest('.ai-panel')) (document.getElementById('project-heading') ?? document.getElementById('outline-heading') ?? document.getElementById('dashboard-heading') ?? scroll.current)?.focus({ preventScroll: true }) }}
        onSave={() => saveRun(panelRun)} onConnect={openAccount} onInput={reviewInput} onRefresh={() => void ai.refresh()} error={ai.error}
        diagnosticMessage={visibleOperation?.kind.startsWith('test-') ? account.snapshot?.modelTestMessage ?? null : null} />}
    </div>
    <AccountPanel open={accountOpen} onClose={() => { setAccountOpen(false); if (narrow && !accountAccepted.current) navigationToggle.current?.focus() }} account={account} locked={aiBusy} onTest={modelId => void testModel(modelId)} />
    <SettingsPanel open={settingsOpen} onClose={() => { setSettingsOpen(false); settingsTrigger.current?.focus() }}
      appearance={appearance.appearance} onAppearance={appearance.chooseAppearance} persistent={appearance.persistent} />
    {project?.outline && <OutlineEditDialog open={editProjectId === project.id} outline={project.outline} topicId={editTopicId} draft={editDraft}
      modelName={account.snapshot?.models.find(model => model.id === modelId)?.name ?? project.selectedModel?.name ?? ''}
      canSubmit={project.writable && !workspace.busy && !anyGenerationBusy && !aiBusy && !generatedUnsaved && !currentModelUnavailable}
      restoreFocus={!editAccepted}
      busy={submittingEdit} error={generation.error} question={outlineRun?.status === 'needs-details' && (outlineRun.topicId ?? null) === editTopicId ? outlineRun.question : null}
      onDraft={text => setEditDrafts(previous => ({ ...previous, [editDraftKey]: { outlineAt: editRevision, text } }))}
      onSubmit={() => void rewriteOutline()} onClose={() => setEditProjectId(null)} />}
    <dialog ref={replacementDialog} className="confirmation-dialog" aria-labelledby="replacement-heading" onCancel={() => setConfirmReplace(false)} onClose={() => setConfirmReplace(false)}>
      <h2 id="replacement-heading">Create a new learning outline?</h2>
      <p>{outlineRun?.status === 'unsaved' ? 'This will discard the unsaved result and use ChatGPT again.' : 'Your current outline stays available while the new one is created. A successful save replaces it. This uses your ChatGPT plan allowance.'}</p>
      <div className="button-row"><button className="button secondary" autoFocus onClick={() => setConfirmReplace(false)}>Keep current outline</button><button className="button primary" disabled={aiBusy} onClick={() => void createOutline(true)}>Create new outline</button></div>
    </dialog>
    <dialog ref={switchDialog} className="confirmation-dialog" aria-labelledby="switch-heading" onCancel={() => { decideNavigation(false); setSavingNotice(false) }} onClose={() => { decideNavigation(false); setSavingNotice(false) }}>
      <h2 id="switch-heading">{savingNotice ? 'Please wait for the operation to settle' : 'An outline is still in progress'}</h2>
      <p>{savingNotice ? 'Finish saving or admission before switching. Use a new navigation command afterward.' : 'Stay here while it finishes, or cancel before switching. Your learning goal and previous saved outline will remain available.'}</p>
      <div className="button-row"><button className="button secondary" autoFocus onClick={() => { decideNavigation(false); setSavingNotice(false) }}>Stay here</button>{!savingNotice && <button className="button primary" disabled={!switching.canProceed} onClick={() => void cancelAndNavigate()}>Cancel and switch</button>}</div>
    </dialog>
    <dialog ref={saveDialog} className="confirmation-dialog" aria-labelledby="save-conflict-heading" onCancel={() => setConfirmSave(false)} onClose={() => setConfirmSave(false)}>
      <h2 id="save-conflict-heading">{outlineRun?.topicId ? 'Save this topic into the changed outline?' : 'Save over the changed outline?'}</h2>
      <p>{outlineRun?.topicId ? 'The project changed since this topic was revised. Saving replaces only this topic in the latest outline and preserves all other topics, outline sections and the learning goal. Files changed outside the app will be preserved and may still prevent saving.' : 'The project changed since this outline was created. Saving will replace its current outline and learning goal with this generated result. Other project settings will be kept.'} No new AI request is needed.</p>
      <div className="button-row"><button className="button secondary" autoFocus onClick={() => setConfirmSave(false)}>Keep reviewing</button><button className="button primary" onClick={() => {
        setConfirmSave(false)
        if (project && outlineRun) void retrySave(project.id, outlineRun.id, true)
      }}>{outlineRun?.topicId ? 'Save revised topic' : 'Save generated outline'}</button></div>
    </dialog>
  </div>
}
