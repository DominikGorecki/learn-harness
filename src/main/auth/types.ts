import type { ModelChoice } from '../../shared/account'

export const planScope = 'chatgpt.tokens.use.direct'

/** Private to the privileged backend. Never serialize this through the renderer bridge. */
export interface AccountCredential {
  version: 1
  clientId: string
  subject: string
  name: string
  email: string | null
  idToken: string
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number
  scopes: string[]
}

export interface CredentialStore {
  readonly persistence: 'protected' | 'session'
  read(): Promise<AccountCredential | null>
  write(credential: AccountCredential): Promise<void>
  clear(): Promise<void>
  hostId(): Promise<string>
}

export interface AccountProvider {
  signIn(options: {
    hostId: string
    previous: AccountCredential | null
    signal: AbortSignal
    onAuthorizationUrl(url: string): Promise<void>
  }): Promise<AccountCredential>
  renew(credential: AccountCredential, signal: AbortSignal): Promise<AccountCredential>
  listModels(credential: AccountCredential, signal: AbortSignal): Promise<ModelChoice[]>
  revoke(credential: AccountCredential, signal: AbortSignal): Promise<void>
}
