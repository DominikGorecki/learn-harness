import { useCallback, useEffect, useRef, useState } from 'react'
import type { AiActivitySnapshot } from '../../../../shared/ai/activity'
import { errorMessage, request } from '../../lib/learning-client'
import { aiAdmissionUnavailable, AiStartGate, newerActivity } from './activity-state'

export function useAiActivity() {
  const [snapshot, setSnapshot] = useState<AiActivitySnapshot | null>(null)
  const latest = useRef<AiActivitySnapshot | null>(null)
  const [pending, setPending] = useState(false)
  const [gate] = useState(() => new AiStartGate())
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(false)
  const accept = useCallback((value: AiActivitySnapshot) => {
    if (!mounted.current) return
    const next = newerActivity(latest.current, value)
    if (next !== latest.current) { latest.current = next; gate.observe(next); setSnapshot(next) }
  }, [gate])
  useEffect(() => {
    mounted.current = true
    const stop = window.learning.onAiActivityChanged(accept)
    void request(window.learning.getAiActivity()).then(accept).catch(error => { if (mounted.current) setError(errorMessage(error)) })
    return () => { mounted.current = false; stop() }
  }, [accept])
  const refresh = useCallback(async () => {
    try { accept(await request(window.learning.getAiActivity())); if (mounted.current) setError(null) }
    catch (error) { if (mounted.current) setError(errorMessage(error)) }
  }, [accept])
  const start = useCallback(async <T,>(action: () => Promise<T | null>): Promise<T | null> => {
    // One synchronous guard is shared by every named start, before React renders.
    return gate.run(action, async () => {
        // A fast operation may already have settled before its admission reply arrives.
        await refresh()
    }, () => aiAdmissionUnavailable(latest.current), latest.current?.revision ?? -1, pending => { if (mounted.current) { setPending(pending); if (pending) setError(null) } })
  }, [refresh, gate])
  const cancel = useCallback(async (operationId: string) => {
    try { const value = await request(window.learning.cancelAiOperation({ operationId })); accept(value); return value }
    catch (error) { if (mounted.current) setError(errorMessage(error)); return null }
  }, [accept])
  return { snapshot, pending, busy: pending || aiAdmissionUnavailable(snapshot), start, cancel, refresh, error }
}
