import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import { planScope } from '../../src/main/auth/types'
import type { ChatGPTEndpoints } from '../../src/main/auth/chatgpt-provider'
import { learningOutline } from './learning-outline'
import { writeToolResponse } from './responses-stream'

const keyPair = generateKeyPair('RS256')
const wrongKeyPair = generateKeyPair('RS256')

export interface ProviderFixtureOptions {
  deny?: boolean
  permission?: boolean
  wrongNonce?: boolean
  wrongAudience?: boolean
  wrongIssuer?: boolean
  wrongSignature?: boolean
  expired?: boolean
  subject?: string
  failModels?: number
  failRefresh?: boolean
  inferenceMode?: 'outline' | 'hold' | 'incomplete' | 'usage-limit' | 'clarify'
}

export async function startChatGPTFixture(options: ProviderFixtureOptions = {}) {
  const keys = await keyPair
  const jwk = { ...await exportJWK(keys.publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' }
  const authorizations: URL[] = []
  const tokens: URLSearchParams[] = []
  const inferenceRequests: Record<string, unknown>[] = []
  const codes = new Map<string, { nonce: string; challenge: string; clientId: string }>()
  let baseUrl = ''
  let modelsRequested = 0
  let revoked = 0

  function json(response: ServerResponse, status: number, value: unknown) {
    response.writeHead(status, { 'content-type': 'application/json' })
    response.end(JSON.stringify(value))
  }
  async function body(request: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = []
    for await (const chunk of request) chunks.push(Buffer.from(chunk))
    return Buffer.concat(chunks).toString()
  }

  const server = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? '', baseUrl)
      if (url.pathname === '/.well-known/jwks.json') { json(response, 200, { keys: [jwk] }); return }
      if (url.pathname === '/authorize') {
        authorizations.push(url)
        const callback = new URL(url.searchParams.get('redirect_uri')!)
        callback.searchParams.set('state', url.searchParams.get('state')!)
        if (options.deny) callback.searchParams.set('error', 'access_denied')
        else {
          const clientId = url.searchParams.get('client_id') === 'dynamic_agent_client' ? 'oaiapp_fixture' : url.searchParams.get('client_id')!
          const code = `test-code-${codes.size}`
          codes.set(code, { nonce: url.searchParams.get('nonce')!, challenge: url.searchParams.get('code_challenge')!, clientId })
          callback.searchParams.set('code', code)
          if (url.searchParams.get('client_id') === 'dynamic_agent_client') callback.searchParams.set('client_id', clientId)
        }
        response.writeHead(302, { location: callback.toString() }); response.end(); return
      }
      if (url.pathname === '/token') {
        const params = new URLSearchParams(await body(request))
        tokens.push(params)
        const refreshing = params.get('grant_type') === 'refresh_token'
        if (refreshing && options.failRefresh) { json(response, 400, { error: 'invalid_grant' }); return }
        const attempt = codes.get(params.get('code') ?? '')
        if (!refreshing && (!attempt || createHash('sha256').update(params.get('code_verifier') ?? '').digest('base64url') !== attempt.challenge || params.get('client_id') !== attempt.clientId)) {
          json(response, 400, { error: 'invalid_grant' }); return
        }
        const idToken = await new SignJWT({
          name: 'Test Learner', email: 'learner@example.test',
          ...(!refreshing ? { nonce: options.wrongNonce ? 'wrong' : attempt!.nonce } : {})
        }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setSubject(options.subject ?? 'test-learner')
          .setIssuer(options.wrongIssuer ? 'https://wrong.example.test' : baseUrl)
          .setAudience(options.wrongAudience ? 'wrong-client' : params.get('client_id')!)
          .setIssuedAt().setExpirationTime(options.expired ? Math.floor(Date.now() / 1000) - 120 : '1h')
          .sign(options.wrongSignature ? (await wrongKeyPair).privateKey : keys.privateKey)
        json(response, 200, {
          id_token: idToken, access_token: refreshing ? 'fixture-renewed-access' : 'fixture-access',
          refresh_token: 'fixture-refresh', expires_in: 3600,
          scope: `openid profile email offline_access resource.invoke${options.permission === false ? '' : ` ${planScope}`}`
        }); return
      }
      if (url.pathname === '/models') {
        modelsRequested++
        if (options.failModels) { json(response, options.failModels, { error: { code: 'access_denied' } }); return }
        if (!request.headers.authorization?.startsWith('Bearer fixture-')) { json(response, 401, { error: 'invalid_token' }); return }
        json(response, 200, { models: [
          { slug: 'fixture-model', display_name: 'Learning model', visibility: 'list' },
          { slug: 'fixture-model-fast', display_name: 'Learning model · Fast', visibility: 'list' },
          { slug: 'hidden-model', display_name: 'Hidden', visibility: 'hidden' }
        ] }); return
      }
      if (url.pathname === '/revoke') { revoked++; response.writeHead(200); response.end(); return }
      if (url.pathname === '/v1/responses') {
        if (!request.headers.authorization?.startsWith('Bearer fixture-')) { json(response, 401, { error: 'invalid_token' }); return }
        inferenceRequests.push(JSON.parse(await body(request)) as Record<string, unknown>)
        if (options.inferenceMode === 'hold') { response.writeHead(200, { 'content-type': 'text/event-stream' }); response.write(': waiting\n\n'); return }
        if (options.inferenceMode === 'clarify') {
          writeToolResponse(response, { name: 'request_learning_details', args: { question: 'Which subject would you like to explore?', reason: 'The material does not point to one subject yet.' } }); return
        }
        writeToolResponse(response, { args: learningOutline(), terminal: options.inferenceMode === 'incomplete' ? 'incomplete' : options.inferenceMode === 'usage-limit' ? 'failed' : 'completed' })
        return
      }
      json(response, 404, { error: 'not_found' })
    })().catch(() => { if (!response.headersSent) json(response, 500, { error: 'fixture_error' }); else response.end() })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const endpoints: ChatGPTEndpoints = {
    issuer: baseUrl, authorize: `${baseUrl}/authorize`, token: `${baseUrl}/token`, revoke: `${baseUrl}/revoke`,
    jwks: `${baseUrl}/.well-known/jwks.json`, models: `${baseUrl}/models`, resource: `${baseUrl}/v1`
  }
  return {
    baseUrl, endpoints, authorizations, tokens, inferenceRequests, options,
    modelsRequested: () => modelsRequested, revoked: () => revoked,
    close: () => new Promise<void>((resolve, reject) => { server.closeAllConnections(); server.close(error => error ? reject(error) : resolve()) })
  }
}
