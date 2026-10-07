import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { AiActivityEntry, AiOperation, AiOperationKind, AiPreview, AiPreviewLesson } from '../../../../shared/ai/activity'
import type { OutlineRun } from '../../../../shared/generation'
import { GenerationStatus } from '../projects/GenerationStatus'
import { operationPhaseLabel, presentationOutcome, recoveryPreview } from './activity-state'
import type { TopicContentSnapshot } from '../../../../shared/topic-content'
import './ai.css'

function Lesson({ lesson }: { lesson: AiPreviewLesson }) {
  return <section className="ai-preview-lesson">
    {lesson.title && <h4>{lesson.title}</h4>}{lesson.question && <p>{lesson.question}</p>}{lesson.overview && <p>{lesson.overview}</p>}
    {lesson.objectives?.length ? <ul>{lesson.objectives.map((text, index) => <li key={index}>{text}</li>)}</ul> : null}
    {lesson.modules?.map((module, index) => <section key={index}>{module.title && <h5>{module.title}</h5>}
      {module.purpose && <p>{module.purpose}</p>}{module.method && <p>{module.method}</p>}{module.task && <p>{module.task}</p>}</section>)}
  </section>
}
function Preview({ preview, outcome }: { preview: AiPreview; outcome: string }) {
  switch (preview.kind) {
    case 'none': return <p className="ai-empty-preview">No draft yet. The current activity is shown on the left.</p>
    case 'text': return <p>{preview.text}</p>
    case 'topic': return preview.lesson ? <Lesson lesson={preview.lesson} /> : <p className="ai-empty-preview">Preparing this topic…</p>
    case 'chapter': return <>{preview.title && <h3>{preview.title}</h3>}{preview.sections?.map(section => <section key={section.id}>{section.title && <h4>{section.title}</h4>}{section.text && <p>{section.text}</p>}</section>)}</>
    case 'image': return <p>{preview.modelName ? `${preview.modelName} · ` : ''}{preview.state === 'candidate' ? 'Replacement ready for review.' : preview.state === 'validating' ? 'Checking the illustration.' : preview.state === 'receiving' ? 'Receiving the illustration.' : 'Waiting for the illustration.'}</p>
    case 'outline': return <>{preview.title && <h3>{preview.title}</h3>}{preview.overview && <p>{preview.overview}</p>}{preview.lessons?.map((lesson, index) => <Lesson key={lesson.id ?? index} lesson={lesson} />)}</>
    case 'model-test-evidence': return <><p>{outcome === 'verified' ? 'The completed reply verified access for this model.' : ['failed', 'cancelled'].includes(outcome) ? 'This test ended. Access remains unverified.' : preview.hasReply ? 'Reply received. Access is being checked.' : 'Waiting for a short model reply.'}</p>
      {preview.completed && !['verified', 'failed', 'cancelled'].includes(outcome) && <p>Reply completion observed; independent verification is still required.</p>}<p className="ai-empty-preview">Reply text is kept private. No project content is sent by this test.</p></>
  }
}
function elapsedLabel(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')} elapsed`
}

export function AiActivityPanel({ operation, recovery, active, heading, focusRequest, onFocusHandled, onCancel, onDismiss, onSave, onConnect, onInput, onRefresh, error, diagnosticMessage, awaiting, chapterState }: {
  operation: AiOperation | null; recovery: OutlineRun | null; active: boolean; heading: string; focusRequest: number;
  onCancel(): void; onDismiss(): void; onSave(): void; onConnect(): void; onInput(): void; onRefresh(): void; onFocusHandled(): void; error: string | null; diagnosticMessage: string | null;
  awaiting: { heading: string; model: string; request: string; kind: AiOperationKind } | null
  chapterState?: TopicContentSnapshot | null
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const actionRef = useRef<HTMLButtonElement>(null)
  const actionOwnedFocus = useRef(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const timelineAtEnd = useRef(true)
  const atEnd = useRef(true)
  const [clock, setClock] = useState({ id: '', revision: '', delta: 0, waitElapsed: 0 })
  const waitOrigin = useRef({ id: '', turn: -1, elapsed: 0, network: false })
  const outcome = operation ? presentationOutcome(operation, recovery, chapterState) : awaiting ? 'preparing' : recovery?.status ?? 'unsaved'
  const diagnostic = Boolean((operation?.kind ?? awaiting?.kind)?.startsWith('test-'))
  const phaseLabel = diagnostic && outcome === 'receiving' ? 'Receiving the model reply' : operationPhaseLabel(operation?.kind ?? awaiting?.kind, outcome)
  const identity = operation?.operationId ?? recovery?.id ?? ''
  const revision = `${operation?.turn}:${operation?.previewRevision}:${operation?.elapsedMs}:${operation?.lastByteAgeMs}:${operation?.phase}`
  useEffect(() => {
    const started = performance.now()
    const network = Boolean(operation && ['waiting', 'receiving'].includes(operation.phase))
    if (operation && (waitOrigin.current.id !== identity || waitOrigin.current.turn !== operation.turn || network && !waitOrigin.current.network)) waitOrigin.current = { id: identity, turn: operation.turn, elapsed: operation.elapsedMs, network }
    else waitOrigin.current.network = network
    const update = () => setClock({ id: identity, revision, delta: performance.now() - started, waitElapsed: waitOrigin.current.elapsed })
    const timer = active ? window.setInterval(update, 1000) : undefined
    return () => { if (timer !== undefined) clearInterval(timer) }
  }, [identity, revision, active, operation])
  const delta = active && clock.id === identity && clock.revision === revision ? clock.delta : 0
  // Local display time never becomes transport/liveness evidence.
  const elapsed = (operation?.elapsedMs ?? 0) + delta
  const byteAge = operation?.lastByteAgeMs === null ? clock.id === identity && clock.revision === revision ? elapsed - clock.waitElapsed : 0 : (operation?.lastByteAgeMs ?? 0) + delta
  const waitingHint = active && ['waiting', 'receiving'].includes(outcome) && byteAge >= 30_000
  useEffect(() => {
    if (focusRequest) {
      // Dialog close effects/UA focus restoration finish before this explicit transition.
      const frame = requestAnimationFrame(() => { headingRef.current?.focus({ preventScroll: true }); onFocusHandled() })
      return () => cancelAnimationFrame(frame)
    }
  }, [focusRequest, onFocusHandled])
  useLayoutEffect(() => {
    if (!active && !awaiting && actionOwnedFocus.current && document.activeElement === document.body) actionRef.current?.focus({ preventScroll: true })
  }, [active, awaiting])
  useLayoutEffect(() => {
    if (atEnd.current && previewRef.current) previewRef.current.scrollTop = previewRef.current.scrollHeight
    if (timelineAtEnd.current && timelineRef.current) {
      const current = timelineRef.current.querySelector<HTMLElement>('[data-state=running]')
      timelineRef.current.scrollTop = current ? current.offsetTop - timelineRef.current.offsetTop - 12 : timelineRef.current.scrollHeight
    }
  }, [identity, operation?.preview, recovery?.result])
  useEffect(() => { atEnd.current = true }, [identity])
  const entries: AiActivityEntry[] = operation ? [...operation.activity] : awaiting ? [{ id: 'accepted', label: 'Request accepted · Preparing', state: 'running' }] : [{ id: 'validated', label: 'Outline validated', state: 'completed' }]
  if (active && !entries.some(entry => entry.state === 'running')) entries.push({ id: 'current-phase', label: operationPhaseLabel(operation!.kind, operation!.phase), state: 'running' })
  if (active && !diagnostic && !['saving', 'cancelling'].includes(outcome)) {
    if (!entries.some(entry => entry.id === 'domain-validation')) entries.push({ id: 'planned-check', label: 'Check the result', state: 'upcoming' })
    if (!entries.some(entry => entry.id === 'domain-save')) entries.push({ id: 'planned-save', label: 'Save accepted result', state: 'upcoming' })
  }
  const recovered = useMemo(() => recovery && (!operation || operation.outcome === 'unsaved') && ['unsaved', 'saving', 'saved'].includes(recovery.status) ? recoveryPreview(recovery) : null, [recovery, operation])
  const projected = recovered?.preview ?? operation?.preview ?? { kind: 'none' } as AiPreview
  const preview: AiPreview = diagnostic && projected.kind === 'none' ? { kind: 'model-test-evidence', hasReply: false, completed: false, modelMatched: false } : projected
  const requestSummary = operation?.requestSummary ?? awaiting?.request ?? recovery?.brief.slice(0, 512) ?? ''
  const kind = operation?.kind ?? awaiting?.kind
  const scope = diagnostic ? 'Account model access · No project content' : kind === 'generate-topic-content' ? 'Only this topic’s chapter and illustrations can change.' : kind === 'regenerate-topic-image' ? 'Only the selected chapter illustration can change after acceptance.' : kind === 'rewrite-topic' || !operation && recovery?.topicId ? 'Only this topic will change.' : 'This project’s outline and requested files can change.'
  return <section className="ai-panel" aria-labelledby="ai-operation-heading" data-outcome={outcome} data-topic={(operation?.kind ?? awaiting?.kind) === 'rewrite-topic' || Boolean(!operation && recovery?.topicId) || undefined}>
    <header className="ai-panel-header"><div className="ai-panel-context"><h2 id="ai-operation-heading" ref={headingRef} tabIndex={-1}>{heading}</h2>
      {(operation || awaiting) && <span className="ai-model">{operation?.model.name ?? awaiting?.model}</span>}
      {requestSummary && <><p className="ai-request-summary">{requestSummary}</p>{requestSummary.length > 120 && <details className="ai-request"><summary>Full request summary</summary><p>{requestSummary}</p></details>}</>}
    </div><div className="ai-header-actions">{operation && <span className="ai-elapsed">{elapsedLabel(elapsed)}</span>}
      {active || awaiting ? <button ref={actionRef} className="button secondary" disabled={!operation?.canCancel} onFocus={() => { actionOwnedFocus.current = true }} onBlur={event => { if (event.relatedTarget) actionOwnedFocus.current = false }} onClick={onCancel}>{outcome === 'cancelling' ? 'Cancelling…' : 'Cancel'}</button> :
        <button ref={actionRef} className="icon-button" aria-label="Dismiss AI activity" onFocus={() => { actionOwnedFocus.current = true }} onBlur={event => { if (event.relatedTarget) actionOwnedFocus.current = false }} onClick={onDismiss}>×</button>}</div></header>
    <div className="ai-announcement sr-only" role="status" aria-live="polite" aria-atomic="true">{phaseLabel}</div>
    <div className="ai-panel-body"><div className="ai-timeline-region" ref={timelineRef} tabIndex={0} role="region" aria-label="AI activity timeline"
      onScroll={event => { const element = event.currentTarget; timelineAtEnd.current = element.scrollHeight - element.scrollTop - element.clientHeight < 24 }}>
      <p className="ai-compact-context">{heading}</p>
      {(operation || awaiting || recovery?.result) && <p className="ai-compact-context">{operation?.model.name ?? awaiting?.model ?? recovery?.result?.model.name}</p>}
      <p className="ai-compact-context">{scope}</p>
      {requestSummary.length > 120 && <details className="ai-compact-context"><summary>Full request summary</summary><p>{requestSummary}</p></details>}
      <p className="ai-body-label">Activity · {phaseLabel}</p>
      <ol className="ai-timeline">{entries.map(entry => <li key={entry.id} data-state={entry.state}><span className="ai-step-icon" aria-hidden="true">{entry.state === 'completed' ? '✓' : entry.state === 'failed' ? '×' : ''}</span><span>{entry.label}<small>{entry.state === 'running' ? 'In progress' : entry.state === 'upcoming' ? 'Upcoming' : entry.state === 'failed' ? 'Stopped' : 'Completed'}</small></span></li>)}</ol>
      {Boolean(operation?.omittedActivityCount) && <p className="ai-detail">{operation!.omittedActivityCount} earlier activities omitted.</p>}
      {waitingHint && <p className="ai-detail">Waiting for the next update… No new reply data for 30 seconds. You can keep waiting or cancel.</p>}
      {error && <><p role="alert" className="input-error">{error}</p><button className="button secondary" onClick={onRefresh}>Refresh AI activity</button></>}
      {diagnosticMessage && <p role={outcome === 'failed' ? 'alert' : undefined} className="ai-detail">{diagnosticMessage}</p>}
      {recovery && <GenerationStatus run={recovery} onCancel={onCancel} onSave={onSave} onConnect={onConnect} compact />}
      {outcome === 'needs-details' && <button className="quiet-button" onClick={onInput}>Add direction</button>}
      {['failed', 'cancelled'].includes(outcome) && !diagnostic && <button className="quiet-button" onClick={onInput}>Review your request</button>}
      {diagnostic && outcome === 'failed' && <button className="quiet-button" onClick={onConnect}>Review ChatGPT connection</button>}
    </div><div className="ai-preview-column">
      <p className="ai-body-label">{diagnostic ? 'Model test evidence' : recovery?.result && ['unsaved', 'saving'].includes(recovery.status) ? 'Validated result · Not saved' : outcome === 'incomplete' ? 'Accepted prose · Saved · Images incomplete' : outcome === 'saved' ? 'Accepted draft · Saved' : 'Draft preview · Not saved'}{['failed', 'cancelled'].includes(outcome) && ' · Incomplete'}</p>
      <div className="ai-preview-region" ref={previewRef} tabIndex={0} role="region" aria-label={diagnostic ? 'Model test evidence' : 'Draft preview'} aria-live="off"
      onScroll={event => { const element = event.currentTarget; atEnd.current = element.scrollHeight - element.scrollTop - element.clientHeight < 24 }}>
      <div className="ai-preview-content"><Preview preview={preview} outcome={outcome} /></div>
      {(recovered?.abbreviated || operation?.abbreviated) && <p className="ai-detail">Preview abbreviated. The full accepted result remains available separately.</p>}
    </div></div></div>
    <footer className="ai-panel-footer"><span>{scope}</span>{(active || awaiting) && <span className="ai-paused">Other AI actions are paused.</span>}</footer>
  </section>
}
