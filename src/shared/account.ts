import type { ApiResult } from './contracts'

export interface ModelChoice { id: string; name: string }
export type AccountStatus = 'disconnected' | 'connecting' | 'connected' | 'permission-required' | 'reconnect-required' | 'restricted' | 'usage-limited'
export interface AccountSnapshot {
  status: AccountStatus
  name: string | null
  email: string | null
  message: string | null
  persistence: 'protected' | 'local'
  models: ModelChoice[]
  modelsStatus: 'idle' | 'loading' | 'ready' | 'failed'
  canReopenBrowser: boolean
}

export interface AccountApi {
  getAccount(): Promise<ApiResult<AccountSnapshot>>
  connectAccount(): Promise<ApiResult<AccountSnapshot>>
  cancelAccountConnection(): Promise<ApiResult<AccountSnapshot>>
  reopenAccountBrowser(): Promise<ApiResult<AccountSnapshot>>
  copyAccountSignInLink(): Promise<ApiResult<AccountSnapshot>>
  refreshModels(): Promise<ApiResult<AccountSnapshot>>
  disconnectAccount(): Promise<ApiResult<AccountSnapshot>>
  onAccountChanged(listener: (snapshot: AccountSnapshot) => void): () => void
}

export const accountChannels = {
  get: 'account:get', connect: 'account:connect', cancel: 'account:cancel',
  reopen: 'account:reopen', copyLink: 'account:copy-link', models: 'account:models', disconnect: 'account:disconnect', changed: 'account:changed'
} as const
