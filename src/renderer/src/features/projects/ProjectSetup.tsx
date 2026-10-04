import { maximumBriefLength } from '../../../../shared/workspace'
import type { ProjectSnapshot } from '../../../../shared/workspace'
import type { AccountSnapshot } from '../../../../shared/account'
import { Icon } from '../../components/Icon'
import { ProjectModel } from './ProjectModel'

export function ProjectSetup({ project, account, draft, busy, onDraft, onSave, onModel, onConnect }: {
  project: ProjectSnapshot; account: AccountSnapshot | null; draft: string; busy: boolean;
  onDraft(value: string): void; onSave(): void; onModel(id: string): void; onConnect(): void
}) {
  const saved = project.revision > 0 && draft.trim() === project.brief && Boolean(project.brief)
  return <section className="project-setup workspace-enter" aria-labelledby="project-heading">
    <div className="project-setup-intro"><span className="subject-emblem"><Icon name="spark" size={24} /></span>
      <p className="eyebrow">Learning project</p><h1 id="project-heading" tabIndex={-1}>What would you like to learn?</h1>
      <p>{project.sourceHint === 'files' ? 'Your project already has material to explore. Add a direction, or a question you want to understand.' : 'A topic, a question, or a bigger ambition. Start with as much or as little as you like.'}</p>
    </div>
    <form className="learning-composer" onSubmit={event => { event.preventDefault(); onSave() }}>
      <label htmlFor="learning-details">Your learning goal</label>
      <textarea id="learning-details" value={draft} onChange={event => onDraft(event.target.value)}
        maxLength={maximumBriefLength} rows={5} placeholder="I want to understand…" disabled={busy}
        onKeyDown={event => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !event.nativeEvent.isComposing && draft.trim() && project.writable) {
            event.preventDefault(); onSave()
          }
        }} />
      <div className="composer-footer"><ProjectModel project={project} account={account} busy={busy} onChange={onModel} onConnect={onConnect} />
        <button className="button primary" type="submit" disabled={busy || !project.writable || !draft.trim()}>{busy ? 'Saving…' : 'Save learning goal'}<Icon name="arrow" size={17} /></button>
      </div>
    </form>
    <div className="composer-context"><span>{saved ? <><Icon name="check" size={14} />Learning goal saved</> : 'You can refine your direction as you go.'}</span>
      {draft.length > maximumBriefLength * .85 && <span>{draft.length.toLocaleString()} / {maximumBriefLength.toLocaleString()}</span>}
    </div>
    {!draft.trim() && <div className="topic-suggestions"><span>For example</span>{['Bayesian reasoning', 'How cities work', 'The science of sleep'].map(topic =>
      <button key={topic} onClick={() => onDraft(topic)} disabled={busy}>{topic}<Icon name="arrow" size={12} /></button>)}</div>}
    <details className="project-folder"><summary><Icon name="folder" size={15} />Project folder<Icon name="down" size={12} /></summary><p>{project.folderPath}</p></details>
  </section>
}
