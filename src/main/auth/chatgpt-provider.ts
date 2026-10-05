/**
 * Based on Pi's dedicated ChatGPT plan flow (MIT), with application identity,
 * verified OIDC claims, returning registrations, and explicit permission state.
 * https://github.com/earendil-works/pi/blob/cd32f7725fdbddbaecdff5b1e68491563394e0ca/packages/ai/src/auth/oauth/openai-chatgpt.ts
 */
import { createHash, randomBytes } from 'node:crypto'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { ApplicationError } from '../../shared/contracts'
import type { ModelChoice } from '../../shared/account'
import { createLoopback } from './loopback'
import { providerFailure } from './provider-errors'
import { planScope } from './types'
import { testModelAccess, solModel, lunaModel } from './model-access-test'
import type { AccountCredential, AccountProvider } from './types'
import { logDiagnostic } from '../logging/logger'

export const chatgptEndpoints = {
  issuer: 'https://auth.openai.com',
  authorize: 'https://auth.openai.com/api/accounts/authorize',
  token: 'https://auth.openai.com/api/accounts/oauth/token',
  revoke: 'https://auth.openai.com/api/accounts/oauth/revoke',
  jwks: 'https://auth.openai.com/.well-known/jwks.json',
  models: 'https://api.openai.com/v1/models',
  resource: 'https://api.openai.com/v1'
} as const
export type ChatGPTEndpoints = { [K in keyof typeof chatgptEndpoints]: string }

interface Identity { subject: string; name: string; email: string | null }
export type VerifyIdentity = (token: string, clientId: string, nonce?: string) => Promise<Identity>

export function createIdentityVerifier(endpoints: ChatGPTEndpoints = chatgptEndpoints): VerifyIdentity {
  const keys = createRemoteJWKSet(new URL(endpoints.jwks), { timeoutDuration: 15_000 })
  return async (token, clientId, nonce) => {
    try {
      const { payload } = await jwtVerify(token, keys, {
        issuer: endpoints.issuer, audience: clientId, algorithms: ['RS256', 'ES256'],
        requiredClaims: ['sub', 'exp', 'iat'], clockTolerance: 5
      })
      if (!payload.sub || payload.sub.length > 256 || (nonce !== undefined && payload.nonce !== nonce)) throw new Error('Invalid identity')
      const email = typeof payload.email === 'string' && payload.email.length <= 320 ? payload.email : null
      const name = typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim().slice(0, 200) : email ?? 'ChatGPT learner'
      return { subject: payload.sub, name, email }
    } catch {
      throw new ApplicationError('AUTH_REQUIRED', 'The ChatGPT account could not be verified. Please sign in again.')
    }
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApplicationError('NETWORK', 'ChatGPT returned an unexpected response. Please try again.')
  return value as Record<string, unknown>
}

function tokenString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= 32_768 ? value : null
}

export function parseModelCatalogue(value: unknown): ModelChoice[] {
  const data = object(value)
  if (!Array.isArray(data.models)) throw new ApplicationError('NETWORK', 'Available models could not be read. Please refresh models.')
  const seen = new Set<string>()
  return data.models.flatMap(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    const row = value as Record<string, unknown>
    if (row.visibility !== 'list' || typeof row.slug !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,127}$/.test(row.slug) ||
        typeof row.display_name !== 'string' || !row.display_name.trim() || seen.has(row.slug)) return []
    seen.add(row.slug)
    return [{ id: row.slug, name: row.display_name.trim().slice(0, 160) }]
  }).slice(0, 200)
}

export function createChatGPTProvider(options: {
  endpoints?: ChatGPTEndpoints
  fetch?: typeof fetch
  verifyIdentity?: VerifyIdentity
  now?: () => number
  loginTimeoutMs?: number
} = {}): AccountProvider {
  const endpoints = options.endpoints ?? chatgptEndpoints
  const request = options.fetch ?? fetch
  const verify = options.verifyIdentity ?? createIdentityVerifier(endpoints)
  const now = options.now ?? Date.now

  async function json(url: string, init: RequestInit, signal: AbortSignal): Promise<Record<string, unknown>> {
    let response: Response
    try {
      response = await request(url, { ...init, redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]) })
    } catch {
      if (signal.aborted) throw new ApplicationError('CANCELLED', 'Connection cancelled.')
      throw new ApplicationError('NETWORK', 'Could not reach ChatGPT. Check your connection and try again.')
    }
    const text = await response.text()
    let data: Record<string, unknown> = {}
    try { if (text.length <= 1_048_576) data = object(JSON.parse(text)) } catch { /* Never expose a raw provider response. */ }
    if (!response.ok) {
      const error = data.error
      const code = typeof error === 'string' ? error : error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined
      throw providerFailure(response.status, code)
    }
    if (!Object.keys(data).length) throw new ApplicationError('NETWORK', 'ChatGPT returned an unexpected response. Please try again.')
    return data
  }

  const exchange = (body: URLSearchParams, signal: AbortSignal) => json(endpoints.token, {
    method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' }, body
  }, signal)

  async function credentialFrom(data: Record<string, unknown>, clientId: string, nonce?: string, previous?: AccountCredential): Promise<AccountCredential> {
    const idToken = tokenString(data.id_token) ?? (nonce === undefined ? previous?.idToken : null)
    if (!idToken) throw new ApplicationError('AUTH_REQUIRED', 'ChatGPT did not return a verifiable account. Please sign in again.')
    const identity = data.id_token || !previous ? await verify(idToken, clientId, nonce) : previous
    if (previous && identity.subject !== previous.subject) throw new ApplicationError('AUTH_REQUIRED', 'A different ChatGPT account was selected. Sign out before connecting another account.')
    const scopes = typeof data.scope === 'string' ? data.scope.split(/\s+/).filter(Boolean) : previous?.scopes ?? []
    const accessToken = tokenString(data.access_token)
    const refreshToken = tokenString(data.refresh_token) ?? previous?.refreshToken ?? null
    const expiresIn = data.expires_in
    if (scopes.includes(planScope) && (!accessToken || typeof expiresIn !== 'number' || !Number.isFinite(expiresIn) || expiresIn <= 0)) {
      throw new ApplicationError('AUTH_REQUIRED', 'ChatGPT plan access could not be verified. Please reconnect.')
    }
    return {
      version: 1, clientId, subject: identity.subject, name: identity.name, email: identity.email,
      idToken, accessToken, refreshToken, scopes,
      expiresAt: now() + (typeof expiresIn === 'number' && Number.isFinite(expiresIn) ? expiresIn * 1000 : 0)
    }
  }

  return {
    async signIn({ hostId, previous, signal, onAuthorizationUrl }) {
      const state = randomBytes(32).toString('base64url')
      const nonce = randomBytes(32).toString('base64url')
      const verifier = randomBytes(32).toString('base64url')
      const challenge = createHash('sha256').update(verifier).digest('base64url')
      const callback = await createLoopback({ state, clientId: previous?.clientId, signal, timeoutMs: options.loginTimeoutMs })
      try {
        const url = new URL(endpoints.authorize)
        url.search = new URLSearchParams({
          client_id: previous?.clientId ?? 'dynamic_agent_client',
          ...(previous ? { id_token_hint: previous.idToken, ...(previous.email ? { login_hint: previous.email } : {}) } : { agent_name_hint: 'Learning Studio' }),
          ...((previous && !previous.scopes.includes(planScope)) ? { prompt: 'consent' } : {}),
          ext_agent_host_id: hostId, response_type: 'code', redirect_uri: callback.redirectUri,
          resource: endpoints.resource, scope: `openid profile email offline_access resource.invoke ${planScope}`,
          state, nonce, code_challenge: challenge, code_challenge_method: 'S256'
        }).toString()
        await onAuthorizationUrl(url.toString())
        const authorization = await callback.result
        const data = await exchange(new URLSearchParams({
          grant_type: 'authorization_code', client_id: authorization.clientId, code: authorization.code,
          code_verifier: verifier, redirect_uri: callback.redirectUri, resource: endpoints.resource
        }), signal)
        const credential = await credentialFrom(data, authorization.clientId, nonce, previous ?? undefined)
        signal.throwIfAborted()
        return credential
      } finally { callback.close() }
    },
    async renew(credential, signal) {
      if (!credential.refreshToken) throw new ApplicationError('AUTH_REQUIRED', 'Please reconnect ChatGPT to continue.')
      const data = await exchange(new URLSearchParams({
        grant_type: 'refresh_token', client_id: credential.clientId, refresh_token: credential.refreshToken, resource: endpoints.resource
      }), signal)
      return credentialFrom(data, credential.clientId, undefined, credential)
    },
    async listModels(credential, signal) {
      if (!credential.accessToken || !credential.scopes.includes(planScope)) throw new ApplicationError('PLAN_PERMISSION_REQUIRED', 'Enable ChatGPT plan usage to choose a model.')
      return parseModelCatalogue(await json(endpoints.models, { headers: { authorization: `Bearer ${credential.accessToken}` } }, signal))
    },
    async testSolModel(credential, signal) {
      if (!credential.accessToken || !credential.scopes.includes(planScope)) throw new ApplicationError('PLAN_PERMISSION_REQUIRED', 'Enable ChatGPT plan usage to test a model.')
      await testModelAccess({ resource: endpoints.resource, accessToken: credential.accessToken, signal, request, model: solModel,
        onDiagnostic: diagnostic => {
          logDiagnostic('info', 'main', 'model.test', diagnostic)
          console.info('[Sol model test]', JSON.stringify(diagnostic))
        } })
    },
    async testLunaModel(credential, signal) {
      if (!credential.accessToken || !credential.scopes.includes(planScope)) throw new ApplicationError('PLAN_PERMISSION_REQUIRED', 'Enable ChatGPT plan usage to test a model.')
      await testModelAccess({ resource: endpoints.resource, accessToken: credential.accessToken, signal, request, model: lunaModel,
        onDiagnostic: diagnostic => {
          logDiagnostic('info', 'main', 'model.test', diagnostic)
          console.info('[Luna model test]', JSON.stringify(diagnostic))
        } })
    },
    async revoke(credential, signal) {
      if (!credential.refreshToken) return
      const response = await request(endpoints.revoke, {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, redirect: 'error',
        body: new URLSearchParams({ token: credential.refreshToken, token_type_hint: 'refresh_token', client_id: credential.clientId }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)])
      })
      if (!response.ok) throw new ApplicationError('NETWORK', 'The remote connection could not be revoked.')
    }
  }
}
