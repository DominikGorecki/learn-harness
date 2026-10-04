import { ApplicationError } from '../../shared/contracts'

export function providerFailure(status: number, code?: string): ApplicationError {
  if (code === 'invalid_grant' || status === 401) {
    return new ApplicationError('AUTH_REQUIRED', 'Your ChatGPT connection needs to be renewed. Please reconnect.')
  }
  if (code === 'subscription_sharing_usage_limit_exceeded' || status === 429) {
    return new ApplicationError('USAGE_LIMIT', 'Your ChatGPT usage limit has been reached. Your work is saved; try again when usage is available.')
  }
  if (code === 'subscription_sharing_usage_unavailable') {
    return new ApplicationError('USAGE_LIMIT', 'ChatGPT plan usage is currently unavailable. Your existing work is still here.')
  }
  if (status === 403) {
    return new ApplicationError('ACCESS_RESTRICTED', 'ChatGPT plan access is unavailable for this account or location. Check your account access and try again.')
  }
  if (code === 'subscription_sharing_unsupported_capability' || code === 'model_not_found') {
    return new ApplicationError('UNAVAILABLE', 'This model is not available for the requested activity. Refresh models and select another one.')
  }
  return new ApplicationError('NETWORK', 'ChatGPT could not complete the request. Please try again.')
}

export function safeAccountError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error
  if (error instanceof Error && error.name === 'AbortError') return new ApplicationError('CANCELLED', 'Connection cancelled.')
  return new ApplicationError('NETWORK', 'Could not connect to ChatGPT. Check your connection and try again.')
}
