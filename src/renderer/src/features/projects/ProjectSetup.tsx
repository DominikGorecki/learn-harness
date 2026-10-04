import { maximumBriefLength } from '../../../../shared/workspace'
import type { ProjectSnapshot } from '../../../../shared/workspace'
import type { AccountSnapshot } from '../../../../shared/account'
import { Icon } from '../../components/Icon'
import { ProjectModel } from './ProjectModel'

export function ProjectSetup({ project, account, draft, busy, onDraft, onCreate, onSave, onModel, onConnect, canCreate, refining = false, needsDetails = false }: {
  project: ProjectSnapshot; account: AccountSnapshot | null; draft: string; busy: boolean; canCreate: boolean; refining?: boolean; needsDetails?: boolean;
  onDraft(value: string): void; onCreate(): void; onSave(): void; onModel(id: string): void; onConnect(): void
}) {
  const saved = project.revision > 0 && draft.trim() === project.brief && Boolean(project.brief)
  const tooLong = draft.length > maximumBriefLength
  return <section className="project-setup workspace-enter" aria-labelledby="project-heading">
    <div className="project-setup-intro"><span className="subject-emblem"><Icon name="spark" size={24} /></span>
      <p className="eyebrow">{refining ? 'Refine your direction' : 'Learning project'}</p><h1 id="project-heading" tabIndex={-1}>{refining ? 'Where should your learning go next?' : 'What would you like to learn?'}</h1>
      <p>{needsDetails ? 'Add a little direction to help shape your outline. A short description is enough.' : project.sourceHint === 'files' ? 'Start with the material in this folder. Add a direction if you have one, or let your notes shape the learning path.' : 'A topic, a question, or a bigger ambition. Start with as much or as little as you like.'}</p>
    </div>
    <form className="learning-composer" onSubmit={event => { event.preventDefault(); if (!tooLong) onCreate() }}>
      <label htmlFor="learning-details">Your learning goal{project.sourceHint === 'files' && !needsDetails ? ' (optional)' : ''}</label>
      <textarea id="learning-details" value={draft} onChange={event => onDraft(event.target.value)}
        rows={5} placeholder="I want to understand…" disabled={busy} aria-invalid={tooLong || undefined} aria-describedby={tooLong ? 'learning-details-error' : undefined}
        onKeyDown={event => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !event.nativeEvent.isComposing && canCreate && !busy && !tooLong) {
            event.preventDefault(); onCreate()
          }
        }} />
      <div className="composer-footer"><ProjectModel project={project} account={account} busy={busy} onChange={onModel} onConnect={onConnect} />
        <button className="button primary" type="submit" title="Create outline (⌘/Ctrl+Enter)" disabled={busy || !canCreate || tooLong}>{busy ? 'Working…' : refining ? 'Create new outline' : 'Create outline'}<Icon name="arrow" size={17} /></button>
      </div>
    </form>
    {tooLong && <p id="learning-details-error" className="input-error" role="alert">Use up to {maximumBriefLength.toLocaleString()} characters. Your full draft is still here; shorten it before creating an outline.</p>}
    <div className="composer-context"><span>{saved ? <><Icon name="check" size={14} />Learning goal saved</> : 'You can refine your direction as you go.'}</span>
      {draft.length > maximumBriefLength * .85 ? <span>{draft.length.toLocaleString()} / {maximumBriefLength.toLocaleString()}</span> :
        draft.trim() && !saved && <button className="quiet-button save-draft" disabled={busy || !project.writable} onClick={onSave}>Save learning goal</button>}
    </div>
    {!draft.trim() && <div className="topic-suggestions"><span>For example</span>{['Bayesian reasoning', 'How cities work', 'The science of sleep'].map(topic =>
      <button key={topic} onClick={() => onDraft(topic)} disabled={busy}>{topic}<Icon name="arrow" size={12} /></button>)}</div>}
    <p className="generation-disclosure">Creating an outline sends your description and relevant text or Markdown from this folder to ChatGPT. Other formats and sensitive or hidden files are skipped. This uses your included plan allowance. We’ll fill in foundations and suggest a path through the subject.</p>
    <details className="project-folder"><summary><Icon name="folder" size={15} />Project folder<Icon name="down" size={12} /></summary><p>{project.folderPath}</p></details>
  </section>
}
