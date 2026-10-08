import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApiResult, ErrorCode } from '../../../../shared/contracts'
import type { ListOpenRouterCallsRequest, OpenRouterApi, OpenRouterCall, OpenRouterCallPage, OpenRouterSettings, TopicImageConfiguration } from '../../../../shared/openrouter'
import { SettingsRequestScope, routerRecovery } from './openrouter-presentation'

const costRecovery = (code: ErrorCode) => code === 'AUTH_REQUIRED' ? 'This request requires its original saved connection. The previous recorded cost is unchanged.' : code === 'NETWORK' ? 'Provider cost metadata could not be reached. Retry this check when connected; the previous recorded cost is unchanged.' : code === 'UNAVAILABLE' ? 'Matching provider cost metadata is unavailable. The previous recorded cost is unchanged.' : routerRecovery(code)

export function useOpenRouter(open: boolean) {
  const [scope] = useState(() => new SettingsRequestScope())
  const [snapshot, setSnapshot] = useState<OpenRouterSettings | null>(null)
  const latest = useRef<OpenRouterSettings | null>(null)
  const [quote, setQuote] = useState<{ value: TopicImageConfiguration; revision: number } | null>(null)
  const [quoteFailure, setQuoteFailure] = useState<{ revision: number; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef<number | null>(null)
  const [history, setHistory] = useState<OpenRouterCallPage | null>(null)
  const [historyBusy, setHistoryBusy] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [detail, setDetail] = useState<OpenRouterCall | null>(null)
  const [detailBusy, setDetailBusy] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const accept = useCallback((value: OpenRouterSettings) => {
    if (!latest.current || value.revision >= latest.current.revision) { latest.current = value; setSnapshot(value) }
  }, [])
  useEffect(() => {
    if (!open) return
    const session = scope.begin()
    const stop = window.learning.onOpenRouterChanged(value => { if (scope.current(session)) accept(value) })
    void window.learning.getOpenRouterSettings().then(reply => {
      if (!scope.current(session)) return
      if (reply.ok) accept(reply.data); else setError(routerRecovery(reply.error.code))
    }).catch(() => { if (scope.current(session)) setError(routerRecovery('INTERNAL')) })
    return () => { scope.close(); stop() }
  }, [open, scope, accept])
  useEffect(() => {
    if (!open || !snapshot) return
    const token = scope.request('quote'), revision = snapshot.revision, modelId = snapshot.imageModelId
    void window.learning.getTopicImageConfiguration({ imageCount: 1 }).then(reply => {
      if (!scope.accepts(token) || latest.current?.revision !== revision || latest.current.imageModelId !== modelId) return
      setQuote(reply.ok ? { value: reply.data, revision } : null)
      setQuoteFailure(reply.ok ? null : { revision, message: routerRecovery(reply.error.code) })
    }).catch(() => { if (scope.accepts(token) && latest.current?.revision === revision) { setQuote(null); setQuoteFailure({ revision, message: routerRecovery('INTERNAL') }) } })
  }, [open, snapshot, scope])
  const close = useCallback(() => {
    scope.close(); pending.current = null; setBusy(false); setError(null); setHistoryBusy(false); setHistoryError(null); setDetail(null); setDetailBusy(false); setDetailError(null)
  }, [scope])
  const mutate = useCallback(async (action: (api: OpenRouterApi) => Promise<ApiResult<OpenRouterSettings>>, acknowledged?: () => void): Promise<boolean> => {
    if (pending.current === scope.currentSession) return false
    const token = scope.request('mutation')
    pending.current = token.session; setBusy(true); setError(null)
    try {
      const reply = await action(window.learning)
      if (!scope.accepts(token)) return false
      if (!reply.ok) { setError(routerRecovery(reply.error.code)); return false }
      accept(reply.data); acknowledged?.(); return true
    } catch { if (scope.accepts(token)) setError(routerRecovery('INTERNAL')); return false }
    finally { if (scope.accepts(token)) { pending.current = null; setBusy(false) } }
  }, [scope, accept])
  const list = useCallback(async (request: ListOpenRouterCallsRequest, preserveDetail = false) => {
    const token = scope.request('history'); setHistory(null); setHistoryBusy(true); setHistoryError(null)
    if (!preserveDetail) { scope.request('detail'); setDetail(null); setDetailError(null); setDetailBusy(false) }
    try { const reply = await window.learning.listOpenRouterCalls(request); if (scope.accepts(token)) { if (reply.ok) setHistory(reply.data); else setHistoryError(routerRecovery(reply.error.code)) } }
    catch { if (scope.accepts(token)) setHistoryError(routerRecovery('INTERNAL')) }
    finally { if (scope.accepts(token)) setHistoryBusy(false) }
  }, [scope])
  const inspect = useCallback(async (callId: string) => {
    const token = scope.request('detail'); setDetail(null); setDetailBusy(true); setDetailError(null)
    try { const reply = await window.learning.getOpenRouterCall({ callId }); if (scope.accepts(token)) { if (reply.ok) setDetail(reply.data); else setDetailError(routerRecovery(reply.error.code)) } }
    catch { if (scope.accepts(token)) setDetailError(routerRecovery('INTERNAL')) }
    finally { if (scope.accepts(token)) setDetailBusy(false) }
  }, [scope])
  const reconcile = useCallback(async (callId: string) => {
    const token = scope.request('detail'); setDetailBusy(true); setDetailError(null)
    try { const reply = await window.learning.reconcileOpenRouterCall({ callId }); if (scope.accepts(token)) { if (reply.ok) setDetail(reply.data); else setDetailError(costRecovery(reply.error.code)) } }
    catch { if (scope.accepts(token)) setDetailError(costRecovery('INTERNAL')) }
    finally { if (scope.accepts(token)) setDetailBusy(false) }
  }, [scope])
  return { snapshot, quote: quote && snapshot && quote.revision === snapshot.revision && quote.value.modelId === snapshot.imageModelId ? quote.value : null, quoteError: quoteFailure?.revision === snapshot?.revision ? quoteFailure?.message ?? null : null, error, busy, mutate, close, list, history, historyBusy, historyError, detail, detailBusy, detailError, inspect, reconcile }
}
export type OpenRouterController = ReturnType<typeof useOpenRouter>
