import type { AccountSnapshot } from '../../../../shared/account'
import type { ProjectSnapshot } from '../../../../shared/workspace'
import { Icon } from '../../components/Icon'

export function ProjectModel({ project, account, busy, onChange, onConnect }: {
  project: ProjectSnapshot; account: AccountSnapshot | null; busy: boolean; onChange(modelId: string): void; onConnect(): void
}) {
  const ready = account?.status === 'connected' && account.modelsStatus === 'ready'
  const models = ready ? account.models : []
  const current = project.selectedModel
  const selected = current?.id ?? models[0]?.id ?? ''
  const unavailable = Boolean(current && ready && !models.some(model => model.id === current.id))
  if (!current && !ready) return <button type="button" className="quiet-button model-connect" onClick={onConnect}><Icon name="spark" size={16} />Connect ChatGPT</button>
  return <div className="model-control">
    <Icon name="spark" size={16} />
    <select aria-label="Project model" value={selected} disabled={!ready || busy || account?.modelTestStatus === 'testing' || !project.writable}
      onChange={event => onChange(event.target.value)} aria-describedby={unavailable ? 'model-unavailable' : undefined}>
      {current && !models.some(model => model.id === current.id) && <option value={current.id}>{current.name}{unavailable ? ' (unavailable)' : ' (saved)'}</option>}
      {models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
      {!selected && <option value="">No models available</option>}
    </select>
    <Icon name="down" size={12} />
    {unavailable && <span id="model-unavailable" className="sr-only">Choose an available model before generating.</span>}
  </div>
}
