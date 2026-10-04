import { useCallback, useEffect, useRef, useState } from 'react'
import type { GenerationApi, GenerationSnapshot } from '../../../../shared/generation'
import type { ApiResult } from '../../../../shared/contracts'
import { errorMessage, request } from '../../lib/learning-client'

export function useGeneration() {
  const [snapshot, setSnapshot] = useState<GenerationSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const revision = useRef(0)
  const pending = useRef(false)
  useEffect(() => {
    let disposed = false
    const stop = window.learning.onGenerationChanged(value => { revision.current++; if (!disposed) setSnapshot(value) })
    const initial = revision.current
    void request(window.learning.getGeneration()).then(value => { if (!disposed && revision.current === initial) setSnapshot(value) })
      .catch(error => { if (!disposed) setError(errorMessage(error)) })
    return () => { disposed = true; stop() }
  }, [])
  const run = useCallback(async (action: (api: GenerationApi) => Promise<ApiResult<GenerationSnapshot>>) => {
    if (pending.current) return
    pending.current = true; setError(null)
    const initial = revision.current
    try { const value = await request(action(window.learning)); if (revision.current === initial) setSnapshot(value) }
    catch (error) { setError(errorMessage(error)) }
    finally { pending.current = false }
  }, [])
  return { snapshot, error, run, clearError: () => setError(null) }
}
