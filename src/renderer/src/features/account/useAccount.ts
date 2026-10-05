import { useCallback, useEffect, useRef, useState } from 'react'
import type { AccountApi, AccountSnapshot } from '../../../../shared/account'
import type { ApiResult } from '../../../../shared/contracts'
import { errorMessage, request } from '../../lib/learning-client'

export function useAccount() {
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const eventRevision = useRef(0)
  useEffect(() => {
    let disposed = false
    const stop = window.learning.onAccountChanged(value => {
      eventRevision.current++
      if (!disposed) setSnapshot(value)
    })
    const initialRevision = eventRevision.current
    void request(window.learning.getAccount()).then(value => {
      if (!disposed && eventRevision.current === initialRevision) setSnapshot(value)
    }).catch(error => { if (!disposed) setError(errorMessage(error)) })
    return () => { disposed = true; stop() }
  }, [])

  const run = useCallback(async (action: (api: AccountApi) => Promise<ApiResult<AccountSnapshot>>) => {
    if (busyRef.current) return null
    busyRef.current = true
    setBusy(true); setError(null)
    const initialRevision = eventRevision.current
    try {
      const value = await request(action(window.learning))
      if (eventRevision.current === initialRevision) setSnapshot(value)
      // A diagnostic reply is acceptance only; later subscription events verify access.
      return value
    }
    catch (error) { setError(errorMessage(error)); return null }
    finally { busyRef.current = false; setBusy(false) }
  }, [])
  const cancelModelTest = useCallback(async () => {
    try { await request(window.learning.cancelModelTest()) }
    catch (error) { setError(errorMessage(error)) }
  }, [])
  return { snapshot, error, busy, run, cancelModelTest }
}

export type AccountController = ReturnType<typeof useAccount>
