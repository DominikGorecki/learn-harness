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
  const latestSnapshot = useRef<WorkspaceSnapshot | null>(null)
  const observers = useRef(new Set<(value: WorkspaceSnapshot) => void>())
  const accept = useCallback((value: WorkspaceSnapshot) => {
    latestSnapshot.current = value
    for (const observer of observers.current) observer(value)
    setSnapshot(value)
  }, [])
  useEffect(() => {
    let disposed = false
    const stop = window.learning.onWorkspaceChanged(value => {
      revision.current++
      if (!disposed) accept(value)
    })
    const initialRevision = revision.current
    void request(window.learning.getWorkspace()).then(value => {
      if (!disposed && revision.current === initialRevision) accept(value)
    }).catch(error => { if (!disposed) setError(errorMessage(error)) })
    return () => { disposed = true; stop() }
  }, [accept])

  const run = useCallback(async (action: (api: WorkspaceApi) => Promise<ApiResult<WorkspaceSnapshot>>) => {
    if (busyRef.current) return null
    busyRef.current = true; setBusy(true); setError(null)
    const initialRevision = revision.current
    try {
      const value = await request(action(window.learning))
      if (revision.current === initialRevision) accept(value)
      return value
    } catch (error) { setError(errorMessage(error)); return null }
    finally { busyRef.current = false; setBusy(false) }
  }, [accept])
  const latest = useCallback(() => latestSnapshot.current, [])
  const observe = useCallback((listener: (value: WorkspaceSnapshot) => void) => {
    observers.current.add(listener)
    if (latestSnapshot.current) listener(latestSnapshot.current)
    return () => { observers.current.delete(listener) }
  }, [])
  return { snapshot, busy, error, clearError: () => setError(null), run, latest, observe }
}
