import { afterEach, describe, expect, it } from 'vitest'
import { createChatGPTProvider, parseModelCatalogue } from '../../src/main/auth/chatgpt-provider'
import { createLoopback } from '../../src/main/auth/loopback'
import { planScope } from '../../src/main/auth/types'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'
import type { ProviderFixtureOptions } from '../fixtures/chatgpt-provider'

const fixtures: Awaited<ReturnType<typeof startChatGPTFixture>>[] = []
afterEach(async () => { await Promise.all(fixtures.splice(0).map(fixture => fixture.close())) })
async function setup(options: ProviderFixtureOptions = {}) {
  const fixture = await startChatGPTFixture(options); fixtures.push(fixture)
  const provider = createChatGPTProvider({ endpoints: fixture.endpoints, loginTimeoutMs: 5000 })
  const signIn = () => provider.signIn({ hostId: 'urn:uuid:00000000-0000-4000-8000-000000000000', previous: null,
    signal: new AbortController().signal, onAuthorizationUrl: async url => { await fetch(url) } })
  return { fixture, provider, signIn }
}

describe('ChatGPT OAuth protocol', () => {
  it('completes real loopback PKCE exchange, verifies signed identity, and lists account models', async () => {
    const { fixture, provider, signIn } = await setup()
    const credential = await signIn()
    expect(credential).toMatchObject({ clientId: 'oaiapp_fixture', subject: 'test-learner', name: 'Test Learner', scopes: expect.arrayContaining([planScope]) })
    expect(fixture.authorizations[0]!.searchParams.get('agent_name_hint')).toBe('Learning Studio')
    expect(fixture.authorizations[0]!.searchParams.get('code_challenge_method')).toBe('S256')
    expect(fixture.tokens[0]!.get('resource')).toBe(fixture.endpoints.resource)
    expect(await provider.listModels(credential, new AbortController().signal)).toHaveLength(2)
    expect(fixture.modelsRequested()).toBe(1)
  })

  it('reuses the issued registration and accepts a returning callback without a repeated client ID', async () => {
    const { fixture, provider, signIn } = await setup()
    const previous = await signIn()
    const next = await provider.signIn({ hostId: 'urn:uuid:00000000-0000-4000-8000-000000000000', previous,
      signal: new AbortController().signal, onAuthorizationUrl: async url => { await fetch(url) } })
    expect(next.subject).toBe(previous.subject)
    expect(fixture.authorizations[1]!.searchParams.get('client_id')).toBe(previous.clientId)
    expect(fixture.authorizations[1]!.searchParams.has('agent_name_hint')).toBe(false)
    expect(fixture.authorizations[1]!.searchParams.get('id_token_hint')).toBe(previous.idToken)
  })

  it.each(['wrongNonce', 'wrongAudience', 'wrongIssuer', 'wrongSignature', 'expired'] as const)('rejects identity with %s', async key => {
    const { signIn } = await setup({ [key]: true })
    await expect(signIn()).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
  })

  it('retains a verified identity when the plan permission is not granted', async () => {
    const { provider, signIn } = await setup({ permission: false })
    const credential = await signIn()
    expect(credential.subject).toBe('test-learner')
    expect(credential.scopes).not.toContain(planScope)
    await expect(provider.listModels(credential, new AbortController().signal)).rejects.toMatchObject({ code: 'PLAN_PERMISSION_REQUIRED' })
  })

  it('rejects a changed identity during reconnection', async () => {
    const { fixture, provider, signIn } = await setup()
    const previous = await signIn()
    fixture.options.subject = 'different-learner'
    await expect(provider.signIn({ hostId: 'urn:uuid:00000000-0000-4000-8000-000000000000', previous,
      signal: new AbortController().signal, onAuthorizationUrl: async url => { await fetch(url) } })).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
  })

  it('handles declined sign-in without exchanging a code', async () => {
    const { fixture, signIn } = await setup({ deny: true })
    await expect(signIn()).rejects.toMatchObject({ code: 'CANCELLED' })
    expect(fixture.tokens).toHaveLength(0)
  })

  it('renews and revokes the same registration', async () => {
    const { fixture, provider, signIn } = await setup()
    const credential = await signIn()
    const renewed = await provider.renew(credential, new AbortController().signal)
    expect(renewed.accessToken).toBe('fixture-renewed-access')
    expect(renewed.subject).toBe(credential.subject)
    expect(fixture.tokens[1]!.get('client_id')).toBe(credential.clientId)
    await provider.revoke(renewed, new AbortController().signal)
    expect(fixture.revoked()).toBe(1)
  })

  it('maps an invalid refresh grant to a safe reconnection error', async () => {
    const { fixture, provider, signIn } = await setup()
    const credential = await signIn()
    fixture.options.failRefresh = true
    await expect(provider.renew(credential, new AbortController().signal)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
  })

  it('ignores a mismatched-state callback rather than cancelling the legitimate attempt', async () => {
    const controller = new AbortController()
    const callback = await createLoopback({ state: 'expected-state', signal: controller.signal })
    try {
      expect((await fetch(`${callback.redirectUri}?state=wrong&error=access_denied`)).status).toBe(400)
      expect((await fetch(`${callback.redirectUri}?state=expected-state&code=valid&client_id=oaiapp_test`)).status).toBe(200)
      expect(await callback.result).toEqual({ code: 'valid', clientId: 'oaiapp_test' })
    } finally { callback.close() }
  })

  it('cancels and times out the owned callback', async () => {
    const controller = new AbortController()
    const callback = await createLoopback({ state: 'expected', signal: controller.signal })
    controller.abort()
    await expect(callback.result).rejects.toMatchObject({ code: 'CANCELLED' })
    callback.close()
    const timed = await createLoopback({ state: 'expected', signal: new AbortController().signal, timeoutMs: 10 })
    await expect(timed.result).rejects.toMatchObject({ code: 'NETWORK' })
    timed.close()
  })
})

describe('account catalogue', () => {
  it('keeps server order, visible distinct IDs, and bounded human-readable names', () => {
    expect(parseModelCatalogue({ models: [
      { slug: 'second', display_name: 'Second', visibility: 'list' }, { slug: 'first', display_name: ' First ', visibility: 'list' },
      { slug: 'first', display_name: 'Duplicate', visibility: 'list' }, { slug: 'hidden', display_name: 'Hidden', visibility: 'hidden' },
      { slug: 'invalid\nmodel', display_name: 'Bad', visibility: 'list' }
    ] })).toEqual([{ id: 'second', name: 'Second' }, { id: 'first', name: 'First' }])
  })
})

describe('explicit GPT-6.1 Sol test', () => {
  it('tests Luna through the same bounded transport with its own fixed target', async () => {
    const { fixture, provider, signIn } = await setup()
    const credential = await signIn()
    await provider.testLunaModel(credential, new AbortController().signal)
    expect(fixture.inferenceRequests).toEqual([{ model: 'gpt-6-luna', input: [{ role: 'user', content: 'Reply with exactly OK.' }], store: false, stream: true }])
  })
  it('uses the delegated token and one tiny request without changing the catalogue', async () => {
    const { fixture, provider, signIn } = await setup()
    const credential = await signIn()
    await provider.testSolModel(credential, new AbortController().signal)
    expect(fixture.inferenceRequests).toEqual([{ model: 'gpt-6.1-sol', input: [{ role: 'user', content: 'Reply with exactly OK.' }], store: false, stream: true }])
    expect(await provider.listModels(credential, new AbortController().signal)).not.toContainEqual({ id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol' })
  })

  it.each(['failed', 'incomplete', 'missing', 'wrong-model'] as const)('does not verify a %s response', async modelTestMode => {
    const { provider, signIn } = await setup({ modelTestMode })
    const credential = await signIn()
    await expect(provider.testSolModel(credential, new AbortController().signal)).rejects.toMatchObject({ code: 'UNAVAILABLE' })
  })

  it('requires plan permission and never submits a request without it', async () => {
    const { fixture, provider, signIn } = await setup({ permission: false })
    const credential = await signIn()
    await expect(provider.testSolModel(credential, new AbortController().signal)).rejects.toMatchObject({ code: 'PLAN_PERMISSION_REQUIRED' })
    await expect(provider.testLunaModel(credential, new AbortController().signal)).rejects.toMatchObject({ code: 'PLAN_PERMISSION_REQUIRED' })
    expect(fixture.inferenceRequests).toHaveLength(0)
  })
})
