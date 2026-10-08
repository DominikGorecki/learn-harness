import { useEffect, useRef, useState } from 'react'
import type { ListOpenRouterCallsRequest, OpenRouterCall, OpenRouterCallPurpose, OpenRouterCallStatus, OpenRouterImageModelId } from '../../../../shared/openrouter'
import { openRouterImageModels } from '../../../../shared/openrouter'
import { connectionLabels, estimateLabel, purposeLabels, routerRecovery, usd, utcDateBounds } from './openrouter-presentation'
import type { OpenRouterController } from './useOpenRouter'

const modelName = (id: string | null) => openRouterImageModels.find(model => model.id === id)?.name ?? 'Not applicable'
const time = (value: string) => new Date(value).toLocaleString(undefined, { timeZone: 'UTC' }) + ' UTC'
function CallDetail({ call }: { call: OpenRouterCall }) {
  const { intent, latest } = call
  return <section className="router-detail" aria-labelledby="call-detail-heading">
    <h4 id="call-detail-heading">Request details</h4>
    <dl className="settings-facts">
      <div><dt>Purpose</dt><dd>{purposeLabels[intent.purpose]}</dd></div>
      <div><dt>Started</dt><dd>{time(intent.startedAt)}</dd></div>
      {latest && <div><dt>Last update</dt><dd>{time(latest.recordedAt)}</dd></div>}
      <div><dt>Model</dt><dd>{modelName(intent.modelId)}</dd></div>
      {latest?.returnedModelId && <div><dt>Returned model</dt><dd>{modelName(latest.returnedModelId)}</dd></div>}
      {intent.context && <div><dt>Learning context</dt><dd>{intent.context.projectName} · {intent.context.topicTitle}</dd></div>}
      <div><dt>Request outcome</dt><dd>{latest?.status ?? 'intended'}{latest?.httpStatus ? ` · HTTP ${latest.httpStatus}` : ''}</dd></div>
      <div><dt>Publication</dt><dd>{(latest?.disposition ?? 'none').replaceAll('-', ' ')}</dd></div>
      <div><dt>Estimate</dt><dd>{estimateLabel(intent.estimate)}</dd></div>
      <div><dt>Reported cost</dt><dd>{latest?.cost.kind === 'known' ? `${usd(latest.cost.usd)} USD` : 'Unknown; not counted as zero'}</dd></div>
      {latest?.cost.kind === 'known' && <div><dt>Cost evidence</dt><dd>{latest.cost.source.replaceAll('-', ' ')} · {time(latest.cost.recordedAt)}</dd></div>}
    </dl>
    <p className="settings-note">{intent.estimate.kind === 'unknown' ? intent.estimate.reason : `${intent.estimate.basis} Checked ${time(intent.estimate.checkedAt)}${intent.estimate.stale ? ' · Stale' : ''}.`}</p>
    {latest?.errorCode && <p className="settings-feedback">{routerRecovery(latest.errorCode)}</p>}
  </section>
}

export function OpenRouterPanel({ router, active, keyDraft, onKeyDraft, onSaved }: {
  router: OpenRouterController; active: boolean; keyDraft: string; onKeyDraft(value: string): void; onSaved(): void
}) {
  const { snapshot, list } = router
  const [filterDraft, setFilterDraft] = useState({ from: '', to: '', purpose: '', modelId: '', status: '' })
  const [filters, setFilters] = useState<ListOpenRouterCallsRequest>({ limit: 50 })
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])
  const [pageIndex, setPageIndex] = useState(0)
  const cursor = cursors[pageIndex]
  const listedQuery = useRef<string | null>(null)
  useEffect(() => {
    if (!active) { listedQuery.current = null; return }
    const request = { ...filters, ...(cursor ? { cursor } : {}) }, query = JSON.stringify(request)
    const preserveDetail = listedQuery.current === query
    listedQuery.current = query
    void list(request, preserveDetail)
  }, [active, filters, cursor, snapshot?.revision, list])
  const save = () => router.mutate(api => api.saveOpenRouterKey({ key: keyDraft }), onSaved)
  return <div className="router-settings">
    <p className="settings-description">Generate educational images with your own OpenRouter inference key. Image prompts are sent to OpenRouter and its serving provider.</p>
    <section className="settings-section" aria-labelledby="router-connection"><h4 id="router-connection">Connection</h4>
      <div className="settings-group">
        <div className="settings-row"><div><strong>{snapshot ? connectionLabels[snapshot.connection] : 'Loading connection…'}</strong><p>{snapshot?.protection === 'protected' ? 'Your saved key uses operating-system encryption.' : snapshot?.protection === 'local' ? 'Your saved key is stored in a local file without operating-system encryption.' : 'Use an ordinary inference key. No paid test runs when you save it.'}</p></div></div>
        <form className="settings-row settings-key-row" onSubmit={event => { event.preventDefault(); void save() }}>
          <label htmlFor="openrouter-key">{snapshot?.protection ? 'Replace saved key' : 'OpenRouter key'}<span>A saved key is never displayed or returned to this view.</span></label>
          <div className="settings-key-controls"><input id="openrouter-key" type="password" autoComplete="off" spellCheck={false} maxLength={1024} value={keyDraft} onChange={event => onKeyDraft(event.target.value)} disabled={router.busy} /><button className="button primary" type="submit" disabled={router.busy || !keyDraft.trim()}>{router.busy ? 'Working…' : snapshot?.protection ? 'Replace key' : 'Save key'}</button></div>
        </form>
        <div className="settings-row settings-row-actions"><p>Refresh checks connection, model capabilities and prices. It makes no image request.</p><div className="button-row"><button className="button secondary" disabled={router.busy || !snapshot?.protection} onClick={() => void router.mutate(api => api.refreshOpenRouterMetadata())}>Refresh metadata</button><button className="button secondary" disabled={router.busy || !snapshot?.protection} onClick={() => void router.mutate(api => api.removeOpenRouterKey())}>Remove key</button></div></div>
      </div>
      {router.error && <p className="settings-feedback" role="alert">{router.error}</p>}
      {snapshot?.errorCode && !router.error && <p className="settings-feedback" role="status">{routerRecovery(snapshot.errorCode)}</p>}
    </section>
    <section className="settings-section" aria-labelledby="router-images"><h4 id="router-images">Image generation</h4>
      <div className="settings-group"><div className="settings-row"><label htmlFor="openrouter-model"><strong>Image model</strong><span>Your choice is saved for future image requests. Models never switch automatically.</span></label><select id="openrouter-model" value={snapshot?.imageModelId ?? 'openai/gpt-image-2'} disabled={!snapshot || router.busy} onChange={event => void router.mutate(api => api.setOpenRouterImageModel({ modelId: event.target.value as OpenRouterImageModelId }))}>{openRouterImageModels.map(model => <option value={model.id} key={model.id}>{model.name}</option>)}</select></div>
        {openRouterImageModels.map(model => { const metadata = snapshot?.models.find(item => item.modelId === model.id); return <div className="settings-row settings-model-row" key={model.id}><div><strong>{model.name}{snapshot?.imageModelId === model.id ? ' · Selected' : ''}</strong><p>{metadata?.availability === 'available' ? 'Compatible image capabilities are advertised.' : metadata?.reason ?? 'Compatible image capabilities are unavailable.'}</p>{metadata && <small>Checked {time(metadata.checkedAt)}{snapshot?.metadataStale ? ' · Stale' : ''}</small>}{metadata?.endpoints.some(endpoint => endpoint.lines.length) && <details className="settings-price-lines"><summary>Advertised price lines for {model.name}</summary><p>Billable units are provider metadata. These lines are not a total image estimate.</p><ul>{metadata.endpoints.map(endpoint => <li key={endpoint.id}>{endpoint.lines.map((line, index) => <span key={index}>{line.billable.replaceAll('_', ' ')}: {usd(line.usd)} USD per {line.unit}{line.variant ? ` · ${line.variant}` : ''}<br /></span>)}</li>)}</ul></details>}</div><span className="settings-availability">{metadata?.availability ?? 'unknown'}</span></div> })}
        <div className="settings-row settings-estimate"><div><strong>One-image estimate</strong><p>{router.quote ? estimateLabel(router.quote.estimate) : router.quoteError ? 'Estimate unavailable' : 'Checking cached estimate…'}</p><p>{router.quoteError ?? (router.quote?.estimate.kind === 'unknown' ? router.quote.estimate.reason : router.quote?.estimate.basis)}</p>{router.quote?.estimate.kind !== 'unknown' && router.quote && <small>Checked {time(router.quote.estimate.checkedAt)}{router.quote.estimate.stale ? ' · Stale' : ''}</small>}<p>Estimates are not a guaranteed charge or spending cap. Actual cost may remain unknown.</p></div></div>
      </div>
    </section>
    <section className="settings-section" aria-labelledby="router-usage"><h4 id="router-usage">Usage</h4>
      <div className="settings-group"><div className="settings-row"><div><strong>This app’s reported spend</strong><p>Known costs only; today and month use UTC. History starts with requests made by this app.</p></div></div>
        <dl className="settings-facts settings-spend"><div><dt>Today (UTC)</dt><dd>{snapshot ? usd(snapshot.spend.todayUsd) + ' USD' : 'Loading…'}</dd></div><div><dt>This month (UTC)</dt><dd>{snapshot ? usd(snapshot.spend.monthUsd) + ' USD' : 'Loading…'}</dd></div><div><dt>All time</dt><dd>{snapshot ? usd(snapshot.spend.allTimeUsd) + ' USD' : 'Loading…'}</dd></div><div><dt>Unresolved costs</dt><dd>{snapshot?.spend.unresolvedCount ?? 'Loading…'}</dd></div></dl>
        <div className="settings-row"><div><strong>Provider-reported key usage and allowance</strong><p>Key-wide figures may include other applications. They are separate from this app’s request history.</p></div></div>
        <dl className="settings-facts settings-spend"><div><dt>Key-wide usage</dt><dd>{snapshot?.keyUsage?.usageUsd != null ? usd(snapshot.keyUsage.usageUsd) + ' USD' : 'Unavailable'}</dd></div><div><dt>Key allowance</dt><dd>{snapshot?.keyUsage?.limitUsd != null ? usd(snapshot.keyUsage.limitUsd) + ' USD' : 'Not reported'}</dd></div><div><dt>Remaining key allowance</dt><dd>{snapshot?.keyUsage?.remainingUsd != null ? usd(snapshot.keyUsage.remainingUsd) + ' USD' : 'Not reported'}</dd></div></dl>
        {snapshot?.keyUsage && <p className="settings-group-note">Reported {time(snapshot.keyUsage.checkedAt)}{snapshot.metadataStale ? ' · Last-known values; stale' : ''}</p>}
      </div>
    </section>
    <section className="settings-section" aria-labelledby="router-history"><h4 id="router-history">Call history</h4>
      <form className="settings-filters" onSubmit={event => { event.preventDefault(); setPageIndex(0); setCursors([undefined]); setFilters({ limit: 50, ...utcDateBounds(filterDraft.from, filterDraft.to), ...(filterDraft.purpose ? { purpose: filterDraft.purpose as OpenRouterCallPurpose } : {}), ...(filterDraft.modelId ? { modelId: filterDraft.modelId as OpenRouterImageModelId } : {}), ...(filterDraft.status ? { status: filterDraft.status as OpenRouterCallStatus } : {}) }) }}>
        <label>From (UTC)<input type="date" value={filterDraft.from} max={filterDraft.to || undefined} onChange={event => setFilterDraft(value => ({ ...value, from: event.target.value }))} /></label><label>Through (UTC)<input type="date" value={filterDraft.to} min={filterDraft.from || undefined} onChange={event => setFilterDraft(value => ({ ...value, to: event.target.value }))} /></label>
        <label>Purpose<select aria-label="Purpose" value={filterDraft.purpose} onChange={event => setFilterDraft(value => ({ ...value, purpose: event.target.value }))}><option value="">All purposes</option>{Object.entries(purposeLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Model<select aria-label="Model" value={filterDraft.modelId} onChange={event => setFilterDraft(value => ({ ...value, modelId: event.target.value }))}><option value="">All models</option>{openRouterImageModels.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
        <label>Outcome<select aria-label="Outcome" value={filterDraft.status} onChange={event => setFilterDraft(value => ({ ...value, status: event.target.value }))}><option value="">All outcomes</option>{(['intended', 'succeeded', 'failed', 'cancelled', 'interrupted'] as const).map(status => <option key={status}>{status}</option>)}</select></label><button className="button secondary" disabled={router.historyBusy}>Apply filters</button>
      </form>
      {router.historyError && <p className="settings-feedback" role="alert">{router.historyError}</p>}
      <div className="settings-history" aria-busy={router.historyBusy}>
        {!router.history ? <p role="status">{router.historyError ? 'Request history could not be loaded.' : 'Loading request history…'}</p> : !router.history.calls.length ? <p>No requests match these filters.</p> : <ol>{router.history.calls.map(call => <li key={call.intent.id}><button className="settings-call" onClick={() => void router.inspect(call.intent.id)}><span><strong>{purposeLabels[call.intent.purpose]}</strong><small>{time(call.intent.startedAt)} · {modelName(call.intent.modelId)}</small><small>{call.latest?.status ?? 'intended'}</small></span><span>{call.latest?.cost.kind === 'known' ? usd(call.latest.cost.usd) + ' USD' : 'Cost unknown'}<small>View details</small></span></button></li>)}</ol>}
      </div>
      <div className="settings-pagination"><button className="button secondary" disabled={pageIndex === 0 || router.historyBusy} onClick={() => setPageIndex(value => value - 1)}>Previous requests</button><span>Page {pageIndex + 1}</span><button className="button secondary" disabled={!router.history?.nextCursor || router.historyBusy} onClick={() => { const next = router.history?.nextCursor; if (next) { setCursors(values => [...values.slice(0, pageIndex + 1), next]); setPageIndex(value => value + 1) } }}>Next requests</button></div>
      {router.historyError && <button className="button secondary" disabled={router.historyBusy} onClick={() => void list({ ...filters, ...(cursor ? { cursor } : {}) })}>Retry history</button>}
      {router.detailBusy && <p role="status">Loading request details…</p>}{router.detailError && <p className="settings-feedback" role="alert">{router.detailError}</p>}{router.detail && <CallDetail call={router.detail} />}
      {router.detail?.intent.endpoint === 'images' && <div className="button-row"><button className="button secondary" disabled={router.detailBusy || !router.detail.latest?.generationId || !snapshot?.protection} onClick={() => void router.reconcile(router.detail!.intent.id)}>Recheck cost</button><p className="settings-note">{router.detail.latest?.generationId ? 'Checks provider metadata for this recorded request. It does not generate an image.' : 'This request has no provider generation ID. Its cost cannot be rechecked.'}</p></div>}
    </section>
  </div>
}
