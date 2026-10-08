import { useEffect, useRef, useState } from 'react'
import type { ApiResult } from '../../../../shared/contracts'
import type { AiOperation } from '../../../../shared/ai/activity'
import type { OpenRouterSettings, TopicImageConfiguration } from '../../../../shared/openrouter'
import { openRouterImageModels } from '../../../../shared/openrouter'
import type { GenerateTopicImageReplacementRequest, TopicContentPage, TopicContentSnapshot } from '../../../../shared/topic-content'
import { topicMediaUrl } from '../../../../shared/topic-content-media'
import { Icon } from '../../components/Icon'
import { estimateLabel } from '../settings/openrouter-presentation'
import './image-replacement.css'

export type ImageReplacementTarget = Omit<GenerateTopicImageReplacementRequest, 'prompt'>
export type ImageContentAction = (action: () => Promise<ApiResult<TopicContentSnapshot>>, inference: boolean, needsText: boolean, imageModel?: string) => Promise<ApiResult<TopicContentSnapshot>>
export function ImageReplacementDialog({ target, chapter, state, operation, valid, writable, onAction, onClose, onSetup }: {
  target: ImageReplacementTarget; chapter: TopicContentPage | null; state: TopicContentSnapshot | null; operation: AiOperation | null; valid: boolean; writable: boolean;
  onAction: ImageContentAction; onClose(revisionId?: string): void; onSetup(): void
}) {
  const dialog = useRef<HTMLDialogElement>(null), admission = useRef<Promise<ApiResult<TopicContentSnapshot>> | null>(null), ownedOperation = useRef<string | null>(null)
  const started = useRef(false), closing = useRef(false), currentDestination = useRef(valid)
  const candidate = state?.candidate && state.candidate.imageId === target.imageId && state.candidate.chapterId === target.chapterId && state.candidate.expectedRevisionId === target.revisionId && state.candidate.expectedImageVersionId === target.expectedImageVersionId ? state.candidate : null
  const replacement = state?.replacement && state.replacement.imageId === target.imageId && state.replacement.chapterId === target.chapterId && state.replacement.revisionId === target.revisionId && state.replacement.expectedImageVersionId === target.expectedImageVersionId ? state.replacement : null
  const original = chapter?.identity.revisionId === target.revisionId ? chapter.images.find(image => image.imageId === target.imageId)?.asset : null
  const plan = chapter?.plan.images.find(image => image.id === target.imageId)
  const [prompt, setPrompt] = useState(candidate?.prompt ?? replacement?.prompt ?? plan?.prompt ?? '')
  const [caption, setCaption] = useState(candidate?.caption ?? plan?.caption ?? '')
  const [alt, setAlt] = useState(candidate?.alt ?? plan?.alt ?? '')
  const [ownedId, setOwnedId] = useState<string | null>(null)
  const [metadataStale, setMetadataStale] = useState(true)
  const [configuration, setConfiguration] = useState<TopicImageConfiguration | null>(null)
  const [busy, setBusy] = useState<'generating' | 'saving' | 'closing' | null>(null), [error, setError] = useState<string | null>(null)
  const [failedOriginal, setFailedOriginal] = useState(false), [failedCandidate, setFailedCandidate] = useState(false)
  const published = replacement?.status === 'published'
  const saving = busy === 'saving', working = busy === 'generating' || operation?.kind === 'regenerate-topic-image' && operation.projectId === target.projectId && operation.topicId === target.topicId && operation.imageId === target.imageId && (operation.operationId === ownedId || operation.runId === replacement?.candidateId)
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => { element?.close() } }, [])
  useEffect(() => { currentDestination.current = valid }, [valid])
  useEffect(() => {
    const stop = window.learning.onAiActivityChanged(snapshot => {
      const active = snapshot.active
      if (started.current && !ownedOperation.current && active?.kind === 'regenerate-topic-image' && active.projectId === target.projectId && active.topicId === target.topicId && active.chapterId === target.chapterId && active.imageId === target.imageId) { ownedOperation.current = active.operationId; setOwnedId(active.operationId) }
    })
    return stop
  }, [target])
  useEffect(() => {
    let alive = true, epoch = 0, revision = -1
    const refresh = (settings: OpenRouterSettings) => { if (!alive || settings.revision <= revision) return; revision = settings.revision; setConfiguration(null); setMetadataStale(settings.metadataStale); const request = ++epoch; void window.learning.getTopicImageConfiguration({ imageCount: 1 }).then(reply => { if (alive && request === epoch) setConfiguration(reply.ok ? reply.data : null) }).catch(() => { if (alive && request === epoch) setConfiguration(null) }) }
    void window.learning.getOpenRouterSettings().then(reply => { if (alive && reply.ok) refresh(reply.data) }); const stop = window.learning.onOpenRouterChanged(refresh)
    return () => { alive = false; epoch++; stop() }
  }, [])
  const request = (snapshot: TopicContentSnapshot | null = state) => {
    const record = snapshot?.replacement
    return record && record.chapterId === target.chapterId && record.revisionId === target.revisionId && record.imageId === target.imageId && record.expectedImageVersionId === target.expectedImageVersionId ? { ...target, candidateId: record.candidateId } : null
  }
  const finish = async () => {
    if (saving || closing.current) return
    closing.current = true; setBusy('closing'); setError(null)
    try {
      const latest = await window.learning.getAiActivity()
      const active = latest.ok ? latest.data.active : null
      if (started.current && active?.kind === 'regenerate-topic-image' && active.projectId === target.projectId && active.topicId === target.topicId && active.chapterId === target.chapterId && active.imageId === target.imageId && (!ownedOperation.current || active.operationId === ownedOperation.current)) {
        ownedOperation.current = active.operationId
        const cancelled = await window.learning.cancelAiOperation({ operationId: active.operationId })
        if (!cancelled.ok) throw new Error('Cancellation is still settling. Wait and close again.')
      }
      const reply = admission.current ? await admission.current : null
      // Removed authority or another destination must not receive an old topic's mutation reply.
      // Its portable review remains retained; cleanup of the owned utility has already completed.
      if (!currentDestination.current || !writable) { onClose(); return }
      const fresh = await window.learning.getTopicContentState({ projectId: target.projectId, topicId: target.topicId })
      const discard = request(fresh.ok ? fresh.data : reply?.ok ? reply.data : state)
      if (discard) {
        const result = await onAction(() => window.learning.discardTopicImageReplacement(discard), false, false)
        if (!result.ok) throw new Error(result.error.message)
      }
      onClose()
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The image action is still settling. Try again after cleanup.'); setBusy(null); closing.current = false }
  }
  useEffect(() => { if (!valid && !saving) void finish() })
  const generate = async () => {
    if (busy || replacement || candidate || !prompt.trim()) return
    started.current = true; setBusy('generating'); setError(null)
    const task = onAction(() => window.learning.generateTopicImageReplacement({ ...target, prompt }), true, false, configuration?.modelId)
    admission.current = task
    const result = await task
    admission.current = null
    if (!result.ok) setError(result.error.message)
    setBusy(null)
  }
  const save = async (retry: boolean) => {
    const current = request(); if (!current || busy || working) return
    setBusy('saving'); setError(null)
    const result = await onAction(() => retry
      ? window.learning.retryTopicImageReplacementSave({ ...current, pendingResultId: replacement!.pendingResultId! })
      : window.learning.acceptTopicImageReplacement({ ...current, caption, alt }), false, false)
    setBusy(null)
    if (!result.ok) { setError(result.error.message); return }
    if (result.data.published?.revisionId !== target.revisionId && !result.data.candidate) onClose(result.data.published?.revisionId)
  }
  const modelName = openRouterImageModels.find(model => model.id === (candidate?.asset.modelId ?? replacement?.modelId ?? configuration?.modelId))?.name ?? configuration?.modelId ?? 'Image model unavailable'
  return <dialog ref={dialog} className="image-replacement-dialog" aria-labelledby="image-replacement-heading" onCancel={event => { event.preventDefault(); void finish() }}>
    <header><div><p className="image-replacement-eyebrow">Chapter illustration</p><h2 id="image-replacement-heading">Regenerate illustration</h2></div><button className="icon-button" aria-label="Close image dialog" disabled={saving || busy === 'closing'} onClick={() => void finish()}><Icon name="close" /></button></header>
    <div className="image-replacement-body">
      <p className="image-replacement-note">{published ? 'This image is published. Retry cleanup only settles retained accounting and review records; it will not generate or revert an image.' : 'Your original stays saved until you choose Use this image. Each generation may incur a charge, even if you keep the original.'}</p>
      <div className={'image-comparison' + (candidate ? ' has-candidate' : '')}>
        <figure><figcaption>Original{original && <> · {openRouterImageModels.find(model => model.id === original.modelId)?.name ?? original.modelId}</>}</figcaption>{original && !failedOriginal ? <img src={topicMediaUrl({ projectHandle: target.projectId, topicId: target.topicId, chapterId: target.chapterId, imageId: target.imageId, versionId: target.expectedImageVersionId })} alt={plan?.alt ?? 'Original illustration'} onError={() => setFailedOriginal(true)} /> : <p>Original illustration unavailable. Its saved metadata and explanation remain preserved.</p>}</figure>
        {candidate && <figure><figcaption>Candidate</figcaption>{!failedCandidate ? <img src={topicMediaUrl({ projectHandle: target.projectId, topicId: target.topicId, chapterId: target.chapterId, imageId: target.imageId, versionId: candidate.asset.versionId, candidateId: candidate.candidateId })} alt={candidate.alt} onError={() => setFailedCandidate(true)} /> : <p>Candidate preview unavailable. Keep it retained and reload saved content.</p>}</figure>}
      </div>
      <label className="image-prompt-label">Image prompt<textarea aria-label="Image prompt" rows={5} maxLength={16000} value={prompt} disabled={Boolean(replacement || candidate || busy || working)} onChange={event => setPrompt(event.target.value)} /></label>
      <p className="image-replacement-note"><strong>{modelName}</strong> · One image{replacement || candidate ? ' · Reported charges remain in OpenRouter activity, independently of Use or Keep.' : configuration ? ` · ${estimateLabel(configuration.estimate)}${metadataStale ? ' · Last-known pricing' : ''}. Final reported charges appear in OpenRouter activity.` : ' · Estimate unavailable'}</p>
      <button className="quiet-button" disabled={Boolean(working || saving)} onClick={onSetup}>Image settings</button>
      {!writable && <p role="status">This project is read-only. Image generation and saving require folder access. Close preserves the retained review.</p>}
      {!candidate && !replacement && (!configuration?.available || metadataStale) && <p className="image-replacement-note">Compatible model information will be checked once when you explicitly generate. <button className="quiet-button" onClick={onSetup}>Review image settings</button></p>}
      {candidate && <div className="image-accessible-text"><label>Caption<textarea aria-label="Caption" rows={2} maxLength={2000} value={caption} disabled={saving} onChange={event => setCaption(event.target.value)} /></label><label>Alternative text<textarea aria-label="Alternative text" rows={2} maxLength={2000} value={alt} disabled={saving} onChange={event => setAlt(event.target.value)} /></label></div>}
      {working && <p role="status">Generating one image. The AI workbench shows transport and cleanup progress.</p>}
      {replacement && !candidate && !working && <p role="status">{published ? 'The saved chapter already contains this image. Its original files and charges remain retained in history.' : replacement.status === 'unsaved' ? 'Accepted image bytes are retained for storage-only Retry save.' : 'This attempt was interrupted or could not produce a candidate. It may have incurred a charge. Keep original to clear review state before a new explicit generation.'}</p>}
      {(error || state?.errorCode && replacement) && <p role="alert">{error ?? state?.message}</p>}
    </div>
    <footer><button className="button" disabled={saving || busy === 'closing'} onClick={() => void finish()}>{published ? 'Done' : working ? 'Cancel generation' : replacement || candidate ? 'Keep original' : 'Cancel'}</button>
      {replacement?.pendingResultId ? <button className="button primary" disabled={Boolean(!writable || busy || working)} onClick={() => void save(true)}>{published ? 'Retry cleanup' : 'Retry save'}</button>
        : candidate ? <button className="button primary" disabled={Boolean(!writable || busy || working || !caption.trim() || !alt.trim())} onClick={() => void save(false)}>Use this image</button>
          : !replacement && <button className="button primary" disabled={Boolean(!writable || busy || working || !prompt.trim() || configuration?.modelId === undefined)} onClick={() => void generate()}>Generate candidate</button>}
    </footer>
  </dialog>
}
