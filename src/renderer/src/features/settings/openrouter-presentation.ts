import type { ErrorCode } from '../../../../shared/contracts'
import type { ImageCostEstimate, OpenRouterCallPurpose, OpenRouterSettings } from '../../../../shared/openrouter'

/** Display decimal strings without converting provider precision to binary floating point. */
export function usd(value: string): string {
  const [whole, fraction = ''] = value.split('.')
  return '$' + whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + fraction.padEnd(2, '0')
}
export function estimateLabel(estimate: ImageCostEstimate): string {
  if (estimate.kind === 'unknown') return 'Estimate unavailable'
  return estimate.kind === 'range' ? `${usd(estimate.minimumUsd)}–${usd(estimate.maximumUsd)} USD estimated` : `${usd(estimate.minimumUsd)} USD estimated`
}
export const purposeLabels: Record<OpenRouterCallPurpose, string> = {
  'chapter-image': 'Chapter image', 'image-replacement': 'Image replacement', 'model-discovery': 'Model discovery',
  'endpoint-discovery': 'Endpoint discovery', 'key-validation': 'Key validation', 'key-usage': 'Key usage', 'cost-reconciliation': 'Cost reconciliation'
}
export const connectionLabels: Record<OpenRouterSettings['connection'], string> = {
  absent: 'No key saved', connected: 'Key connected', invalid: 'Key needs replacement', restricted: 'Key access is restricted',
  limited: 'Key allowance is exhausted', offline: 'Connection could not be checked', 'storage-error': 'Local storage needs attention'
}
export function routerRecovery(code: ErrorCode): string {
  switch (code) {
    case 'BUSY': return 'An image operation or another settings change is using this connection. Wait for it to settle, then try again.'
    case 'AUTH_REQUIRED': return 'The key could not be validated. Save a valid ordinary OpenRouter inference key.'
    case 'ACCESS_RESTRICTED': return 'This key cannot access the requested service. Use an ordinary inference key and check its provider permissions.'
    case 'USAGE_LIMIT': return 'The key has no available allowance. Check its funds or limit in OpenRouter, then refresh.'
    case 'NETWORK': return 'OpenRouter could not be reached. Check your connection and refresh. Last-known values are retained.'
    case 'STORAGE': return 'This device could not save or read provider settings or request history. Resolve local storage access and try again.'
    case 'INVALID_INPUT': return 'Check the entered key or filter values and try again.'
    case 'CONFLICT': return 'These settings or history changed. Refresh the current view and try again.'
    case 'CANCELLED': return 'The request was cancelled. Try again when the connection is available.'
    case 'UNAVAILABLE': return 'Compatible provider metadata is unavailable. Refresh or choose another listed image model.'
    default: return 'The request could not be completed. Try refreshing this view.'
  }
}
export function utcDateBounds(from: string, to: string): { from?: string; to?: string } {
  return { ...(from ? { from: `${from}T00:00:00.000Z` } : {}), ...(to ? { to: `${to}T23:59:59.999Z` } : {}) }
}

/** Closing invalidates requests even though the native Settings dialog stays mounted. */
export class SettingsRequestScope {
  private session = 0
  private counters = new Map<string, number>()
  begin() { this.session++; this.counters.clear(); return this.session }
  close() { this.session++; this.counters.clear() }
  get currentSession() { return this.session }
  current(session: number) { return session === this.session }
  request(name: string) { const sequence = (this.counters.get(name) ?? 0) + 1; this.counters.set(name, sequence); return { session: this.session, name, sequence } }
  accepts(token: { session: number; name: string; sequence: number }) { return this.current(token.session) && this.counters.get(token.name) === token.sequence }
}
