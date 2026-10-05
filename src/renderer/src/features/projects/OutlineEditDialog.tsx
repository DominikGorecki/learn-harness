import { useEffect, useRef } from 'react'
import { maximumBriefLength } from '../../../../shared/workspace'
import type { SavedOutline } from '../../../../shared/workspace'
import { Icon } from '../../components/Icon'

export function OutlineEditDialog({ open, outline, topicId, draft, modelName, canSubmit, busy, error, question, onDraft, onSubmit, onClose }: {
  open: boolean; outline: SavedOutline; draft: string; modelName: string; canSubmit: boolean; busy: boolean;
  topicId?: string | null; error: string | null; question: string | null; onDraft(value: string): void; onSubmit(): void; onClose(): void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const topic = outline.document.lessons.find(lesson => lesson.id === topicId)
  const submitLabel = topic ? 'Rewrite topic' : 'Rewrite outline'
  const tooLong = draft.length > maximumBriefLength
  const ready = canSubmit && !busy && Boolean(draft.trim()) && !tooLong
  useEffect(() => {
    if (open && !dialog.current?.open) {
      trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.current?.showModal()
      input.current?.focus()
    }
    if (!open && dialog.current?.open) { dialog.current.close(); trigger.current?.focus({ preventScroll: true }) }
  }, [open])
  return <dialog ref={dialog} className="confirmation-dialog outline-edit-dialog" aria-labelledby="outline-edit-heading"
    onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="outline-edit-heading"><h2 id="outline-edit-heading">{topic ? 'Edit topic' : 'Edit your learning path'}</h2><button type="button" className="icon-button" aria-label="Close outline editor" onClick={onClose}><Icon name="close" size={18} /></button></div>
    {topic ? <><p><strong>{topic.title}</strong></p><p>Describe what you’d like to learn or change in this topic, for example “I would like to learn further history on this topic”. Only this topic and its own folder can change. Other topics and outline sections stay as they are.</p><details className="outline-edit-topics"><summary>Current topic</summary><p>{topic.overview}</p><ul>{topic.objectives.map((objective, index) => <li key={index}>{objective}</li>)}</ul></details></> : <><p>Describe any changes you want. You can refer to topics by number, for example “Move 01 to be after 03”, or ask to add, remove, or explain topics differently.</p><details className="outline-edit-topics"><summary>Current topics</summary><ol>{outline.document.lessons.map((lesson, index) => <li key={lesson.id}><span>{String(index + 1).padStart(2, '0')}</span> {lesson.title}</li>)}</ol></details></>}
    <form onSubmit={event => { event.preventDefault(); if (ready) onSubmit() }}>
      <label htmlFor="outline-changes">{topic ? 'How would you like to change this topic?' : 'How would you like to change the outline?'}</label>
      <textarea ref={input} id="outline-changes" rows={5} value={draft} onChange={event => onDraft(event.target.value)} disabled={busy}
        aria-invalid={tooLong || undefined} aria-describedby={tooLong ? 'outline-changes-limit' : 'outline-edit-disclosure'}
        placeholder={topic ? 'I would like to learn further history on this topic…' : 'Move 01 after 03 and add more practical examples…'}
        onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !event.nativeEvent.isComposing && ready) { event.preventDefault(); onSubmit() } }} />
      {tooLong && <p id="outline-changes-limit" className="input-error" role="alert">Use up to {maximumBriefLength.toLocaleString()} characters. Your full draft is still here.</p>}
      {question && <p role="status">{question}</p>}
      {error && <p className="input-error" role="alert">{error}</p>}
      <p id="outline-edit-disclosure" className="generation-disclosure">This sends your current outline, requested changes, and any relevant project material to {modelName || 'your selected model'} using your ChatGPT plan allowance. {topic ? 'A successful save updates only this topic and its own folder, including relevant learning files. Pi can read the whole project for context.' : 'A successful save replaces your outline and applies requested project file changes.'} Your current outline stays available while it is rewritten.</p>
      <div className="button-row"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={!ready} title={`${submitLabel} (⌘/Ctrl+Enter)`}>{busy ? 'Submitting…' : submitLabel}</button></div>
    </form>
  </dialog>
}
