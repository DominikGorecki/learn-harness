export type ErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'FORBIDDEN' | 'INTERNAL' |
  'AUTH_REQUIRED' | 'PLAN_PERMISSION_REQUIRED' | 'ACCESS_RESTRICTED' | 'USAGE_LIMIT' |
  'NETWORK' | 'CANCELLED' | 'BUSY' | 'UNAVAILABLE' | 'STORAGE' | 'CONFLICT'

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } }

export class ApplicationError extends Error {
  constructor(public readonly code: ErrorCode, message: string) { super(message) }
}
