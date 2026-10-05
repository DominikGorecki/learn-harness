import type { ApiResult } from './contracts'

export interface ModelChoice { id: string; name: string }
// Explicitly requested picker additions; choices are not claims of account entitlement.
export const additionalAccountModels = [
  { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol' },
  { id: 'gpt-6-luna', name: 'GPT-6 Luna' }
] as const
export type AdditionalModelId = typeof additionalAccountModels[number]['id']
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
  modelTestStatus: 'idle' | 'testing' | 'verified' | 'failed'
  modelTestMessage: string | null
  modelTestTarget: AdditionalModelId | null
  verifiedModelIds: AdditionalModelId[]
}

export interface AccountApi {
  getAccount(): Promise<ApiResult<AccountSnapshot>>
  connectAccount(): Promise<ApiResult<AccountSnapshot>>
  cancelAccountConnection(): Promise<ApiResult<AccountSnapshot>>
  reopenAccountBrowser(): Promise<ApiResult<AccountSnapshot>>
  copyAccountSignInLink(): Promise<ApiResult<AccountSnapshot>>
  refreshModels(): Promise<ApiResult<AccountSnapshot>>
  /** Accepted starts return testing state; account/activity events deliver later proof. */
  testSolModel(): Promise<ApiResult<AccountSnapshot>>
  testLunaModel(): Promise<ApiResult<AccountSnapshot>>
  cancelModelTest(): Promise<ApiResult<AccountSnapshot>>
  disconnectAccount(): Promise<ApiResult<AccountSnapshot>>
  onAccountChanged(listener: (snapshot: AccountSnapshot) => void): () => void
}

export const accountChannels = {
  get: 'account:get', connect: 'account:connect', cancel: 'account:cancel',
  reopen: 'account:reopen', copyLink: 'account:copy-link', models: 'account:models',
  testSol: 'account:test-sol', testLuna: 'account:test-luna', cancelTest: 'account:cancel-test', disconnect: 'account:disconnect', changed: 'account:changed'
} as const
