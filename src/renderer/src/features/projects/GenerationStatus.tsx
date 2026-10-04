import type { OutlineRun } from '../../../../shared/generation'
import { runIsBusy } from '../../../../shared/generation'
import { Icon } from '../../components/Icon'

export function GenerationStatus({ run, onCancel, onSave, onConnect }: { run: OutlineRun; onCancel(): void; onSave(): void; onConnect(): void }) {
  if (run.status === 'saved') return null
  const busy = runIsBusy(run)
  const needsAccount = ['AUTH_REQUIRED', 'PLAN_PERMISSION_REQUIRED', 'ACCESS_RESTRICTED', 'USAGE_LIMIT'].includes(run.errorCode ?? '')
  return <div className={'generation-status ' + (run.status === 'failed' || run.status === 'unsaved' ? 'needs-attention' : '')} role="status" aria-live="polite">
    <span className={busy ? 'progress-orbit' : 'generation-status-icon'}>{!busy && <Icon name={run.status === 'needs-details' ? 'spark' : 'info'} size={17} />}</span>
    <div><p>{run.question ?? run.message}</p>{run.question && <p className="generation-detail">{run.message}</p>}
      {run.status === 'unsaved' && <p className="generation-detail">Keep this window open until the outline is saved.</p>}
      {needsAccount && <button className="quiet-button" onClick={onConnect}>Review ChatGPT connection<Icon name="arrow" size={14} /></button>}
    </div>
    {busy && run.status !== 'saving' && <button className="quiet-button" onClick={onCancel}>Cancel</button>}
    {run.status === 'unsaved' && <button className="button secondary" onClick={onSave}>Retry save</button>}
  </div>
}
