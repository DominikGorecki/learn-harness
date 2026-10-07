import { ApplicationError } from '../../shared/contracts'
import type { OpenRouterService } from '../openrouter/service'

/** Explicit image activation only, after shared AI admission. Cached quotes/readers never call this. */
export async function prepareImageProvider(provider: OpenRouterService) {
  let lease
  try { lease = provider.acquireImageLease() }
  catch (error) {
    if (error instanceof ApplicationError && error.code === 'AUTH_REQUIRED') return null
    throw error
  }
  let retained = false
  try {
    // Preserve already displayed settings across discovery; changed defaults never escalate a run.
    const cachedSettings = provider.getImageConfiguration(1).settings
    if (provider.getSettings().metadataStale) {
      try { await provider.refreshMetadata() }
      catch (error) {
        if (error instanceof ApplicationError && error.code === 'CANCELLED') throw error
        // Initial generation can still publish prose; Complete requires a usable session.
        return null
      }
    }
    const configuration = provider.getImageConfiguration(1, cachedSettings ?? undefined)
    if (!configuration.available || !configuration.settings) return null
    retained = true
    return { lease, settings: configuration.settings }
  } finally { if (!retained) lease.release() }
}
