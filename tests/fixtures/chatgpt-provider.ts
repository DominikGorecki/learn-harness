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
  hideFastModel?: boolean
  outlineResult?: ReturnType<typeof learningOutline>
  projectFileCalls?: { name: string; args: Record<string, unknown> }[]
  modelTestMode?: 'completed' | 'failed' | 'incomplete' | 'missing' | 'wrong-model' | 'hold'
  inferenceMode?: 'outline' | 'hold' | 'incomplete' | 'usage-limit' | 'clarify' | 'materials' | 'materials-clarify'
}

export async function startChatGPTFixture(options: ProviderFixtureOptions = {}) {
  const keys = await keyPair
  const jwk = { ...await exportJWK(keys.publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' }
  const authorizations: URL[] = []
  const tokens: URLSearchParams[] = []
  const inferenceRequests: Record<string, unknown>[] = []
  const pendingInference: ServerResponse[] = []
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
          ...(!options.hideFastModel ? [{ slug: 'fixture-model-fast', display_name: 'Learning model · Fast', visibility: 'list' }] : []),
          { slug: 'hidden-model', display_name: 'Hidden', visibility: 'hidden' }
        ] }); return
      }
      if (url.pathname === '/revoke') { revoked++; response.writeHead(200); response.end(); return }
      if (url.pathname === '/v1/responses') {
        if (!request.headers.authorization?.startsWith('Bearer fixture-')) { json(response, 401, { error: 'invalid_token' }); return }
        const payload = JSON.parse(await body(request)) as Record<string, unknown>
        inferenceRequests.push(payload)
        if ((payload.model === 'gpt-6.1-sol' || payload.model === 'gpt-6-luna') && !payload.tools) {
          response.writeHead(200, { 'content-type': 'text/event-stream' })
          if (options.modelTestMode === 'hold') { pendingInference.push(response); response.write(': waiting\n\n'); return }
          const terminal = options.modelTestMode === 'failed' ? 'failed' : options.modelTestMode === 'incomplete' ? 'incomplete' : 'completed'
          if (options.modelTestMode !== 'missing') response.write(`data: ${JSON.stringify({ type: `response.${terminal}`, response: {
            status: terminal, model: options.modelTestMode === 'wrong-model' ? 'fixture-model' : payload.model,
            output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'OK' }] }],
            ...(terminal === 'failed' ? { error: { code: 'model_not_found', message: 'RAW SECRET PROVIDER ERROR' } } : {})
          } })}\n\n`)
          response.end(); return
        }
        if (options.projectFileCalls) {
          const input = payload.input as { type: string }[]
          const turn = input.filter(item => item.type === 'function_call').length
          const call = options.projectFileCalls[turn]
          if (call) { writeToolResponse(response, call); return }
        }
        if (options.inferenceMode === 'hold') { pendingInference.push(response); response.writeHead(200, { 'content-type': 'text/event-stream' }); response.write(': waiting\n\n'); return }
        if (options.inferenceMode === 'clarify') {
          writeToolResponse(response, { name: 'request_learning_details', args: { question: 'Which subject would you like to explore?', reason: 'The material does not point to one subject yet.' } }); return
        }
        if (options.inferenceMode === 'materials' || options.inferenceMode === 'materials-clarify') {
          const input = payload.input as { type: string; name?: string; arguments?: string; output?: string }[]
          const calls = input.filter(item => item.type === 'function_call')
          if (!calls.some(call => call.name === 'list_materials')) { writeToolResponse(response, { name: 'list_materials', args: {} }); return }
          const read = calls.find(call => call.name === 'read_material')
          if (!read) {
            const output = input.find(item => item.type === 'function_call_output')!
            const materials = JSON.parse(output.output!) as { path: string }[]
            writeToolResponse(response, { name: 'read_material', args: { path: materials[0]!.path } }); return
          }
          if (options.inferenceMode === 'materials-clarify') {
            writeToolResponse(response, { name: 'request_learning_details', args: { question: 'Would you like to focus on probability or city planning?', reason: 'Your notes include two distinct subjects.' } }); return
          }
          const outline = learningOutline()
          outline.lessons[0]!.sources = [(JSON.parse(read.arguments!) as { path: string }).path]
          writeToolResponse(response, { args: outline }); return
        }
        writeToolResponse(response, { args: options.outlineResult ?? learningOutline(), terminal: options.inferenceMode === 'incomplete' ? 'incomplete' : options.inferenceMode === 'usage-limit' ? 'failed' : 'completed' })
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
    completePending: () => { for (const response of pendingInference.splice(0)) if (!response.destroyed) writeToolResponse(response, { args: learningOutline() }) },
    modelsRequested: () => modelsRequested, revoked: () => revoked,
    close: () => new Promise<void>((resolve, reject) => { server.closeAllConnections(); server.close(error => error ? reject(error) : resolve()) })
  }
}
