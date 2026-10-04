import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkspaceApi, WorkspaceSnapshot } from '../../../../shared/workspace'
import type { ApiResult } from '../../../../shared/contracts'
import { errorMessage, request } from '../../lib/learning-client'

export function useWorkspace() {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const revision = useRef(0)
  useEffect(() => {
    let disposed = false
    const stop = window.learning.onWorkspaceChanged(value => {
      revision.current++
      if (!disposed) setSnapshot(value)
    })
    const initialRevision = revision.current
    void request(window.learning.getWorkspace()).then(value => {
      if (!disposed && revision.current === initialRevision) setSnapshot(value)
    }).catch(error => { if (!disposed) setError(errorMessage(error)) })
    return () => { disposed = true; stop() }
  }, [])

  const run = useCallback(async (action: (api: WorkspaceApi) => Promise<ApiResult<WorkspaceSnapshot>>) => {
    if (busyRef.current) return null
    busyRef.current = true; setBusy(true); setError(null)
    const initialRevision = revision.current
    try {
      const value = await request(action(window.learning))
      if (revision.current === initialRevision) setSnapshot(value)
      return value
    } catch (error) { setError(errorMessage(error)); return null }
    finally { busyRef.current = false; setBusy(false) }
  }, [])
  return { snapshot, busy, error, clearError: () => setError(null), run }
}
