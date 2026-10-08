import { useEffect, useRef, useState } from 'react'
import type { ApiResult } from '../../../../shared/contracts'
import type { TopicContentMode, TopicContentSnapshot, TopicContentPage } from '../../../../shared/topic-content'
import type { OpenRouterSettings, TopicImageConfiguration } from '../../../../shared/openrouter'
import { openRouterImageModels } from '../../../../shared/openrouter'
import { estimateLabel } from '../settings/openrouter-presentation'
import { WorkspaceActions, WorkspaceAction, WorkspaceMessage } from '../../components/Workspace'
import { chapterQuoteRequests } from './chapter-quotes'

export type ContentAction = () => Promise<ApiResult<TopicContentSnapshot>>
export function TopicContentControls({ projectId, topicId, state, chapter, disabled, writable, textModel, onAction, onSetup, onConnect }: {
  projectId: string; topicId: string; state: TopicContentSnapshot | null; chapter: TopicContentPage | null; disabled: boolean; writable: boolean; textModel: string;
  onAction(action: ContentAction, inference: boolean, needsText: boolean): void; onSetup(): void; onConnect(): void
}) {
  const [provider, setProvider] = useState<OpenRouterSettings | null>(null)
  const [quotes, setQuotes] = useState<TopicImageConfiguration[]>([])
  const [quotedKey, setQuotedKey] = useState('')
  const [quoteFailed, setQuoteFailed] = useState(false)
  const [replace, setReplace] = useState<TopicContentMode | null>(null)
  const [uncertain, setUncertain] = useState<Record<string, boolean>>({})
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLElement | null>(null)
  const progress = state?.progress, published = state?.published
  const progressBlocked = progress?.baselineStatus !== 'current'
  const quoteRequests = chapterQuoteRequests(chapter, state)
  const countKey = JSON.stringify(quoteRequests)
  useEffect(() => {
    let alive = true, revision = -1, quoteEpoch = 0
    const accept = (settings: OpenRouterSettings) => {
      if (!alive || settings.revision <= revision) return
      revision = settings.revision; setProvider(settings); setQuotes([]); setQuoteFailed(false)
      const request = ++quoteEpoch
      const requests = JSON.parse(countKey) as ReturnType<typeof chapterQuoteRequests>
      void Promise.all(requests.map(({ imageCount, settings }) => window.learning.getTopicImageConfiguration({ imageCount, ...(settings ? { settings } : {}) }))).then(replies => {
        if (!alive || request !== quoteEpoch || revision !== settings.revision) return
        if (replies.every(reply => reply.ok && reply.data.modelId === settings.imageModelId)) { setQuotes(replies.flatMap(reply => reply.ok ? [reply.data] : [])); setQuotedKey(countKey) }
        else setQuoteFailed(true)
      }).catch(() => { if (alive && request === quoteEpoch) setQuoteFailed(true) })
    }
    const stop = window.learning.onOpenRouterChanged(accept)
    void window.learning.getOpenRouterSettings().then(reply => { if (reply.ok) accept(reply.data); else if (alive) setQuoteFailed(true) }).catch(() => { if (alive) setQuoteFailed(true) })
    return () => { alive = false; ++quoteEpoch; stop() }
  }, [countKey])
  useEffect(() => { if (replace && !dialog.current?.open) dialog.current?.showModal(); if (!replace && dialog.current?.open) dialog.current.close() }, [replace])
  const close = () => { setReplace(null); trigger.current?.focus({ preventScroll: true }) }
  const generate = (mode: TopicContentMode, confirmed = false) => {
    if (published && !confirmed) { trigger.current = document.activeElement as HTMLElement; setReplace(mode); return }
    onAction(() => window.learning.generateTopicContent({ projectId, topicId, mode, replace: Boolean(published), expectedRevisionId: published?.revisionId ?? null }), true, true)
    setReplace(null)
  }
  const runRequest = progress ? { projectId, topicId, chapterId: progress.chapterId, runId: progress.runId, checkpointRevision: progress.checkpointRevision } : null
  const quoteCopy = (index: number) => quotes[index] && quotedKey === countKey ? <>{quoteRequests[index]!.label} ({quoteRequests[index]!.imageCount}): {estimateLabel(quotes[index]!.estimate)}. {quotes[index]!.estimate.kind === 'unknown' ? quotes[index]!.estimate.reason : <>{quotes[index]!.estimate.basis} Checked {quotes[index]!.estimate.checkedAt}.{quotes[index]!.estimate.stale && ' Cached prices are stale.'}</>}</> : <>Estimate unavailable. OpenRouter settings can help recover it.</>
  const preflight = <div className="chapter-preflight"><p>Fresh-generation model: {textModel || 'Choose a ChatGPT project model'}. Images: {openRouterImageModels.find(model => model.id === provider?.imageModelId)?.name ?? 'Selected OpenRouter model'}.</p>
    {quotes.length && quotedKey === countKey ? quoteRequests.map((_, index) => <p key={index}>{quoteCopy(index)}</p>) : <p>{quoteFailed ? 'Estimate unavailable. OpenRouter settings can help recover it.' : 'Checking cached estimates…'}</p>}
    <p>Fresh generation permits one to six images; it may use fewer. Saved-plan estimates use their recorded output settings and planned counts. An explicit retry makes one new request for the selected image; other planned images require Continue. These are count estimates, not a guaranteed chapter total or spending cap. Illustrated activation checks compatible provider metadata before image dispatch. Image prompts are sent to OpenRouter and its serving provider.</p>
    {provider?.connection !== 'connected' && <p>An ordinary OpenRouter key is needed for images. Set it up, or deliberately generate text only.</p>}
    <WorkspaceActions><WorkspaceAction onClick={onConnect}>ChatGPT connection</WorkspaceAction></WorkspaceActions>
  </div>
  return <>
    <WorkspaceActions label="Chapter actions">
      <WorkspaceAction primary disabled={disabled || !writable || !state || Boolean(progress)} onClick={() => generate('illustrated')}>{published ? 'Regenerate content' : 'Generate Content'}</WorkspaceAction>
      <WorkspaceAction disabled={disabled || !writable || !state || Boolean(progress)} onClick={() => generate('text-only')}>{published ? 'Regenerate text only' : 'Generate text only'}</WorkspaceAction>
      {published && published.status !== 'illustrated' && !progress && <WorkspaceAction disabled={disabled || !writable || state?.stale} onClick={() => onAction(() => window.learning.completeTopicContentImages({ projectId, topicId, chapterId: published.chapterId, revisionId: published.revisionId }), true, false)}>Complete images</WorkspaceAction>}
      <WorkspaceAction onClick={onSetup}>OpenRouter settings</WorkspaceAction>
    </WorkspaceActions>
    {chapter ? <details className="chapter-generation" data-disclosure="chapter-generation"><summary data-focus-anchor="chapter-generation">Generation details and estimates</summary>{preflight}</details> : preflight}
    {chapter && (progress || published?.status !== 'illustrated') && <div className="chapter-preflight"><p>Selected image model: {openRouterImageModels.find(model => model.id === provider?.imageModelId)?.name ?? 'OpenRouter model'}.</p>{quoteRequests.slice(2).map((_, index) => <p key={index}>{quoteCopy(index + 2)}</p>)}</div>}
    {!writable && <p className="chapter-preflight">This project is read-only. Saved content remains readable; generation and save actions need a writable folder.</p>}
    {progress && runRequest && <WorkspaceMessage><div><p>{progress.status === 'unsaved' ? 'Validated chapter is not saved yet.' : `Chapter progress saved · ${progress.status}.`} {progress.completedSectionIds.length} sections completed; {progress.pendingImageIds.length} images remaining.</p>
      <p>Continuation model: {progress.textModelId ?? 'Recorded model unavailable'}.</p>
      {progress.baselineStatus === 'stale' && <p>Saved progress uses changed topic, learning context, sources or publication. Discard it and generate a fresh chapter.</p>}
      {progressBlocked && progress.baselineStatus !== 'stale' && <p>Saved progress cannot be verified. Restore project and source access, then reload saved content before continuing or retrying its save.</p>}
      <WorkspaceActions label="Chapter recovery">
        {progress.pendingResultId ? <WorkspaceAction disabled={disabled || !writable || progressBlocked} onClick={() => onAction(() => window.learning.retryTopicContentSave({ ...runRequest, pendingResultId: progress.pendingResultId! }), false, false)}>Retry save</WorkspaceAction> : <WorkspaceAction disabled={disabled || !writable || progressBlocked || progress.status === 'working'} onClick={() => onAction(() => window.learning.continueTopicContent(runRequest), true, false)}>Continue</WorkspaceAction>}
        <WorkspaceAction disabled={disabled || !writable || progress.status === 'working'} onClick={() => onAction(() => window.learning.discardTopicContentProgress(runRequest), false, false)}>Discard progress</WorkspaceAction>
      </WorkspaceActions>
      {progress.imageSlots?.filter(slot => ['failed', 'requested', 'unresolved'].includes(slot.status) && slot.callId).map(slot => {
        const acknowledgement = JSON.stringify([progress.runId, progress.checkpointRevision, slot.imageId, slot.callId])
        return <div key={acknowledgement}><p>Image {slot.imageId}: {slot.status !== 'failed' ? 'The prior request may have been charged even though its result is unknown.' : 'The previous attempt failed. A retry is a new paid request.'} Other planned images require Continue.</p><label><input type="checkbox" checked={uncertain[acknowledgement] ?? false} onChange={event => setUncertain(previous => ({ ...previous, [acknowledgement]: event.target.checked }))} />I understand a new request may add a charge.</label><WorkspaceActions><WorkspaceAction disabled={disabled || !writable || progressBlocked || !uncertain[acknowledgement]} onClick={() => onAction(() => window.learning.retryTopicContentImage({ ...runRequest, imageId: slot.imageId, priorCallId: slot.callId!, acknowledgeUncertainCharge: true }), true, false)}>Retry image {slot.imageId}</WorkspaceAction></WorkspaceActions></div>
      })}
    </div></WorkspaceMessage>}
    <dialog ref={dialog} className="confirmation-dialog" aria-labelledby="chapter-replace-heading" onCancel={event => { event.preventDefault(); close() }}>
      <h2 id="chapter-replace-heading">Regenerate this chapter?</h2><p>Your current chapter remains readable until a validated replacement is saved. This uses {textModel}{replace === 'illustrated' ? ' and authorizes a new plan of up to six image requests' : ' without image requests'}.</p>{replace === 'illustrated' && <><p>Images: {openRouterImageModels.find(model => model.id === provider?.imageModelId)?.name ?? 'Selected OpenRouter model'}.</p><p>{quoteCopy(0)}</p><p>{quoteCopy(1)}</p><p>Estimates are not spending caps. Image prompts are sent to OpenRouter and its serving provider.</p></>}<div className="button-row"><button className="button secondary" autoFocus onClick={close}>Keep current chapter</button><button className="button primary" disabled={disabled} onClick={() => replace && generate(replace, true)}>Regenerate content</button></div>
    </dialog>
  </>
}
