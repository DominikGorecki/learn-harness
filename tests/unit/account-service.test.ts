import { AiCoordinator } from '../../src/core/ai/coordinator'
import { describe, expect, it, vi } from 'vitest'
import { AccountService } from '../../src/main/auth/account-service'
import { ApplicationError } from '../../src/shared/contracts'
import { planScope } from '../../src/main/auth/types'
import type { AccountCredential, AccountProvider, CredentialStore } from '../../src/main/auth/types'

const credential: AccountCredential = {
  version: 1, clientId: 'oaiapp_test', subject: 'learner', name: 'Test Learner', email: 'learner@example.test',
  idToken: 'private-identity', accessToken: 'private-access', refreshToken: 'private-refresh', expiresAt: 10_000_000, scopes: [planScope]
}
const choices = [{ id: 'test-model' }, { id: 'gpt-6.1-sol' }, { id: 'gpt-6-luna' }]

function setup(initial: AccountCredential | null = null, now = () => 1000) {
  let stored = initial ? structuredClone(initial) : null
  const store: CredentialStore = {
    persistence: 'protected', read: vi.fn(async () => structuredClone(stored)),
    write: vi.fn(async value => { stored = structuredClone(value) }), clear: vi.fn(async () => { stored = null }),
    hostId: vi.fn(async () => 'urn:uuid:00000000-0000-4000-8000-000000000000')
  }
  const provider: AccountProvider = {
    signIn: vi.fn(async ({ onAuthorizationUrl }) => { await onAuthorizationUrl('https://auth.openai.com/api/accounts/authorize'); return structuredClone(credential) }),
    renew: vi.fn(async value => ({ ...value, expiresAt: 20_000_000, accessToken: 'renewed-private' })),
    listModels: vi.fn(async () => [{ id: 'test-model', name: 'Test Model' }]), revoke: vi.fn(async () => {})
  }
  const probes = { testSolModel: vi.fn(async () => {}), testLunaModel: vi.fn(async () => {}) }
  const testModel = vi.fn(async (input: { target: string; accessToken: string }) => {
    if (input.target === 'gpt-6.1-sol') await probes.testSolModel()
    else await probes.testLunaModel()
  })
  const openBrowser = vi.fn(async () => {})
  const copyToClipboard = vi.fn<(url: string) => Promise<void>>(async () => {})
  let aiId = 0
  const ai = new AiCoordinator({ now: () => performance.now(), createId: () => `ai-${++aiId}` })
  const service = new AccountService({ ai, provider, testModel, store, openBrowser, copyToClipboard, now })
  return { ai, service, store, testModel, provider: Object.assign(provider, probes), openBrowser, copyToClipboard, stored: () => stored }
}

describe('account lifecycle', () => {
  it('returns accepted start and duplicates promptly while ownership gates both other starts', async () => {
    const { service, ai, provider } = setup(credential)
    await service.initialize()
    let finish!: () => void
    provider.testSolModel.mockImplementation(() => new Promise<void>(resolve => { finish = resolve }))
    const initial = await service.testSolModel()
    expect(initial.modelTestStatus).toBe('testing')
    expect(await service.testSolModel()).toEqual(initial)
    await expect(service.testLunaModel()).rejects.toMatchObject({ code: 'BUSY' })
    expect(() => ai.claim({ kind: 'create-outline', projectId: 'project', model: { id: 'test-model', name: 'Test' }, heading: 'Create', requestSummary: 'Learn' })).toThrowError('Another AI action')
    await vi.waitFor(() => expect(provider.testSolModel).toHaveBeenCalledOnce())
    finish(); await service.waitForModelTest()
    expect(service.get().modelTestStatus).toBe('verified')
  })
  it('settles verified state before synchronous subscribers cancel or duplicate', async () => {
    const { service, ai } = setup(credential)
    await service.initialize()
    let duplicate: ReturnType<typeof service.testSolModel> | undefined
    let cancel: ReturnType<typeof service.cancelModelTest> | undefined
    service.subscribe(snapshot => { if (snapshot.modelTestStatus === 'verified') {
      expect(ai.get().active).toBeNull()
      duplicate ??= service.testSolModel(); cancel ??= service.cancelModelTest()
    } })
    await service.testSolModel(); await service.waitForModelTest()
    expect(await duplicate).toMatchObject({ modelTestStatus: 'verified' })
    expect(await cancel).toMatchObject({ modelTestStatus: 'verified' })
    expect(ai.get().settled?.outcome).toBe('verified')
  })
  it('settles failure before a synchronous subscriber starts a successor', async () => {
    const { service, ai, provider } = setup(credential)
    await service.initialize()
    provider.testSolModel.mockRejectedValueOnce(new ApplicationError('UNAVAILABLE', 'Unverified.'))
    let successor: ReturnType<typeof service.testSolModel> | undefined
    service.subscribe(snapshot => { if (snapshot.modelTestStatus === 'failed' && !successor) {
      expect(ai.get().active).toBeNull()
      successor = service.testSolModel()
    } })
    await service.testSolModel(); await service.waitForModelTest()
    expect(await successor).toMatchObject({ modelTestStatus: 'testing' })
    await service.waitForModelTest()
    expect(service.get()).toMatchObject({ modelTestStatus: 'verified' })
    expect(provider.testSolModel).toHaveBeenCalledTimes(2)
  })
  it('owns delayed renewal, durably saves cancelled rotation and never launches inference', async () => {
    let now = 1000
    const { service, ai, provider, stored } = setup(credential, () => now)
    await service.initialize()
    now = credential.expiresAt + 1
    vi.mocked(provider.renew).mockClear()
    let finish!: (value: AccountCredential) => void
    vi.mocked(provider.renew).mockImplementation(() => new Promise(resolve => { finish = resolve }))
    expect(await service.testSolModel()).toMatchObject({ modelTestStatus: 'testing' })
    await vi.waitFor(() => expect(provider.renew).toHaveBeenCalledOnce())
    await expect(service.testLunaModel()).rejects.toMatchObject({ code: 'BUSY' })
    const cancel = service.cancelModelTest()
    finish({ ...credential, accessToken: 'rotated-private', expiresAt: 20_000_000 })
    await cancel
    expect(stored()?.accessToken).toBe('rotated-private')
    expect(provider.testSolModel).not.toHaveBeenCalled()
    expect(ai.get().settled?.outcome).toBe('cancelled')
  })
  it('keeps Sol and Luna as extra choices, verifies each independently, and clears proof after reconnect', async () => {
    const { service, provider, store } = setup(credential)
    await service.initialize()
    expect(provider.testSolModel).not.toHaveBeenCalled()
    expect(provider.testLunaModel).not.toHaveBeenCalled()
    expect(service.get().models.map(model => model.id)).toEqual(['test-model', 'gpt-6.1-sol', 'gpt-6-luna'])
    expect(service.get().verifiedModelIds).toEqual([])
    expect(await service.authorizeModel('gpt-6-luna')).toMatchObject({ model: { id: 'gpt-6-luna' } })
    await service.testSolModel(); await service.waitForModelTest()
    expect(service.get()).toMatchObject({ modelTestStatus: 'verified', modelTestTarget: 'gpt-6.1-sol', verifiedModelIds: ['gpt-6.1-sol'], modelsStatus: 'ready', models: choices })
    expect(await service.authorizeModel('gpt-6.1-sol')).toMatchObject({ model: { id: 'gpt-6.1-sol' } })
    await service.testSolModel(); await service.waitForModelTest()
    expect(provider.testSolModel).toHaveBeenCalledOnce()
    await service.testLunaModel(); await service.waitForModelTest()
    expect(service.get()).toMatchObject({ modelTestTarget: 'gpt-6-luna', verifiedModelIds: ['gpt-6.1-sol', 'gpt-6-luna'] })
    await service.testLunaModel(); await service.waitForModelTest()
    expect(provider.testLunaModel).toHaveBeenCalledOnce()
    await service.refreshModels()
    expect(service.get().models.map(model => model.id)).toEqual(['test-model', 'gpt-6.1-sol', 'gpt-6-luna'])
    expect(store.write).not.toHaveBeenCalled()
    await service.connect(); await service.waitForConnection()
    expect(service.get()).toMatchObject({ modelTestStatus: 'idle', modelTestTarget: null, verifiedModelIds: [], models: choices })
  })

  it('preserves the usable catalogue and sanitizes a failed model test', async () => {
    const { service, provider } = setup(credential)
    await service.initialize()
    vi.mocked(provider.testSolModel).mockRejectedValue(new Error('private-access'))
    await service.testSolModel(); await service.waitForModelTest()
    expect(service.get()).toMatchObject({ status: 'connected', modelsStatus: 'ready', modelTestStatus: 'failed', models: choices })
    expect(JSON.stringify(service.get())).not.toContain('private-access')
    expect(await service.authorizeModel('test-model')).toBeDefined()
  })

  it('deduplicates tests, guards competing targets and account operations, and prevents cancelled verification', async () => {
    const { service, provider } = setup(credential)
    await service.initialize()
    let finish!: () => void
    vi.mocked(provider.testSolModel).mockImplementation(() => new Promise<void>(resolve => { finish = resolve }))
    const testing = service.testSolModel()
    await vi.waitFor(() => expect(provider.testSolModel).toHaveBeenCalledOnce())
    const duplicate = service.testSolModel()
    await expect(service.testLunaModel()).rejects.toMatchObject({ code: 'BUSY' })
    expect(provider.testLunaModel).not.toHaveBeenCalled()
    await expect(service.connect()).rejects.toMatchObject({ code: 'BUSY' })
    await expect(service.disconnect()).rejects.toMatchObject({ code: 'BUSY' })
    await expect(service.authorizeModel('test-model')).rejects.toMatchObject({ code: 'BUSY' })
    await service.refreshModels()
    expect(provider.listModels).toHaveBeenCalledOnce()
    const cancelling = service.cancelModelTest()
    finish()
    await Promise.all([testing, duplicate, cancelling])
    expect(service.get()).toMatchObject({ modelTestStatus: 'idle', verifiedModelIds: [], models: choices })
  })

  it('blocks a model test while an outline owns the connection', async () => {
    const { ai, service, provider } = setup(credential)
    await service.initialize(); ai.claim({ kind: 'create-outline', projectId: 'project', model: { id: 'test-model', name: 'Test' }, heading: 'Create', requestSummary: 'Learn' })
    await expect(service.testSolModel()).rejects.toMatchObject({ code: 'BUSY' })
    expect(provider.testSolModel).not.toHaveBeenCalled()
  })

  it('shows account recovery when the test detects revoked credentials without losing catalogue choices', async () => {
    const { service, provider } = setup(credential)
    await service.initialize()
    vi.mocked(provider.testSolModel).mockRejectedValue(new ApplicationError('AUTH_REQUIRED', 'Please reconnect.'))
    await service.testSolModel(); await service.waitForModelTest()
    expect(service.get()).toMatchObject({ status: 'reconnect-required', modelTestStatus: 'failed', models: choices })
  })
  it('copies only the active authorization link and sanitizes clipboard failures', async () => {
    const { service, provider, copyToClipboard } = setup()
    const url = 'https://auth.openai.com/api/accounts/authorize?id_token_hint=private-identity'
    vi.mocked(provider.signIn).mockImplementation(async ({ signal, onAuthorizationUrl }) => {
      await onAuthorizationUrl(url)
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new ApplicationError('CANCELLED', 'Sign-in cancelled.')), { once: true }))
    })
    await expect(service.copySignInLink()).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    expect(copyToClipboard).not.toHaveBeenCalled()
    await service.connect()
    await vi.waitFor(() => expect(service.get().canReopenBrowser).toBe(true))
    copyToClipboard.mockRejectedValueOnce(new Error(url))
    await expect(service.copySignInLink()).rejects.toMatchObject({ code: 'UNAVAILABLE', message: 'The sign-in link could not be copied. Try copying again or choose Open browser.' })
    const snapshot = await service.copySignInLink()
    expect(copyToClipboard).toHaveBeenLastCalledWith(url)
    expect(snapshot.message).toContain('Sign-in link copied')
    expect(JSON.stringify(snapshot)).not.toContain('private-identity')
    expect(provider.signIn).toHaveBeenCalledOnce()
    await service.cancel()
    await expect(service.copySignInLink()).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    expect(copyToClipboard).toHaveBeenCalledTimes(2)
  })

  it('does not overwrite completed sign-in with late clipboard feedback', async () => {
    const { service, provider, copyToClipboard } = setup()
    let finishSignIn!: () => void
    let finishCopy!: () => void
    vi.mocked(provider.signIn).mockImplementation(async ({ onAuthorizationUrl }) => {
      await onAuthorizationUrl('https://auth.openai.com/api/accounts/authorize')
      await new Promise<void>(resolve => { finishSignIn = resolve })
      return structuredClone(credential)
    })
    copyToClipboard.mockImplementation(() => new Promise<void>(resolve => { finishCopy = resolve }))
    await service.connect()
    await vi.waitFor(() => expect(finishSignIn).toBeTypeOf('function'))
    const copying = service.copySignInLink()
    finishSignIn()
    await service.waitForConnection()
    finishCopy()
    expect(await copying).toMatchObject({ status: 'connected', message: null, canReopenBrowser: false })
    await expect(service.copySignInLink()).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    expect(copyToClipboard).toHaveBeenCalledOnce()
  })

  it('restores a protected connection and its available models without leaking credentials', async () => {
    const { service } = setup(credential)
    await service.initialize()
    expect(service.get()).toMatchObject({ status: 'connected', name: 'Test Learner', modelsStatus: 'ready', verifiedModelIds: [], models: choices })
    expect(JSON.stringify(service.get())).not.toContain('private')
    const snapshot = service.get(); snapshot.models.length = 0
    expect(service.get().models).toHaveLength(3)
  })

  it('shows signed-in identity without claiming plan permission', async () => {
    const { service, provider, ai, testModel } = setup({ ...credential, scopes: ['openid'], accessToken: null })
    await service.initialize()
    expect(service.get().status).toBe('permission-required')
    expect(service.get().models).toEqual([])
    expect(provider.listModels).not.toHaveBeenCalled()
    await expect(service.authorizeModel('test-model')).rejects.toMatchObject({ code: 'PLAN_PERMISSION_REQUIRED' })
    await expect(service.testSolModel()).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    await expect(service.testLunaModel()).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    expect(testModel).not.toHaveBeenCalled()
    expect(provider.testSolModel).not.toHaveBeenCalled()
    expect(provider.testLunaModel).not.toHaveBeenCalled()
    expect(ai.get().active).toBeNull()
  })

  it('connects through the browser and persists only after sign-in succeeds', async () => {
    const { service, store, openBrowser } = setup()
    const changes: string[] = []
    const stop = service.subscribe(snapshot => changes.push(snapshot.status))
    await service.connect(); await service.waitForConnection()
    expect(openBrowser).toHaveBeenCalledOnce()
    expect(store.write).toHaveBeenCalledOnce()
    expect(changes).toContain('connecting')
    expect(service.get().status).toBe('connected')
    expect(service.get().canReopenBrowser).toBe(false)
    stop()
  })

  it('cancels a pending login while preserving a previously usable account', async () => {
    const { service, provider, stored } = setup(credential)
    await service.initialize()
    vi.mocked(provider.signIn).mockImplementation(async ({ signal, onAuthorizationUrl }) => {
      await onAuthorizationUrl('https://auth.openai.com/api/accounts/authorize')
      if (signal.aborted) throw new ApplicationError('CANCELLED', 'Sign-in cancelled.')
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new ApplicationError('CANCELLED', 'Sign-in cancelled.')), { once: true }))
    })
    await service.connect()
    await vi.waitFor(() => expect(service.get().canReopenBrowser).toBe(true))
    await service.cancel()
    expect(service.get().status).toBe('connected')
    expect(stored()?.accessToken).toBe(credential.accessToken)
    expect(service.get().message).toBe('Sign-in cancelled.')
  })

  it('serializes concurrent renewal and model refresh', async () => {
    const { service, provider } = setup({ ...credential, expiresAt: 1 })
    await service.initialize()
    const results = await Promise.all([service.authorizeModel('test-model'), service.authorizeModel('test-model')])
    expect(provider.renew).toHaveBeenCalledOnce()
    expect(results.every(value => value.accessToken === 'renewed-private')).toBe(true)
  })

  it('reports revoked refresh credentials as reconnect-required', async () => {
    const { service, provider } = setup({ ...credential, expiresAt: 1 })
    vi.mocked(provider.renew).mockRejectedValue(new ApplicationError('AUTH_REQUIRED', 'Please reconnect.'))
    await service.initialize()
    expect(service.get()).toMatchObject({ status: 'reconnect-required', modelsStatus: 'failed' })
  })

  it('requires a current available model and never substitutes another one', async () => {
    const { service } = setup(credential)
    await service.initialize()
    await expect(service.authorizeModel('missing')).rejects.toMatchObject({ code: 'UNAVAILABLE' })
  })

  it('clears local credentials even if provider revocation cannot be reached', async () => {
    const { service, provider, stored } = setup(credential)
    await service.initialize()
    vi.mocked(provider.revoke).mockRejectedValue(new Error('secret provider response'))
    await service.disconnect()
    expect(stored()).toBeNull()
    expect(service.get()).toMatchObject({ status: 'disconnected', name: null, models: [] })
    expect(service.get().message).toContain('Signed out here')
    expect(JSON.stringify(service.get())).not.toContain('secret')
    await expect(service.authorizeModel('test-model')).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
  })

  it('blocks account replacement while an outline owns the connection', async () => {
    const { ai, service } = setup(credential)
    await service.initialize(); ai.claim({ kind: 'create-outline', projectId: 'project', model: { id: 'test-model', name: 'Test' }, heading: 'Create', requestSummary: 'Learn' })
    await expect(service.connect()).rejects.toMatchObject({ code: 'BUSY' })
    await expect(service.disconnect()).rejects.toMatchObject({ code: 'BUSY' })
  })

  it('keeps provider errors safe and exposes retryable model failure', async () => {
    const { service, provider } = setup(credential)
    vi.mocked(provider.listModels).mockRejectedValue(new Error('access_token=private-key'))
    await service.initialize()
    expect(service.get().modelsStatus).toBe('failed')
    expect(service.get().models).toEqual([])
    expect(JSON.stringify(service.get())).not.toContain('private-key')
    vi.mocked(provider.listModels).mockResolvedValue([{ id: 'test-model', name: 'Test Model' }])
    await service.refreshModels()
    expect(service.get().modelsStatus).toBe('ready')
  })

  it('does not let a concurrent connection or inference race with sign-out', async () => {
    const { service, provider } = setup(credential)
    await service.initialize()
    let finish!: () => void
    vi.mocked(provider.revoke).mockImplementation(() => new Promise<void>(resolve => { finish = resolve }))
    const signingOut = service.disconnect()
    await vi.waitFor(() => expect(provider.revoke).toHaveBeenCalled())
    await expect(service.connect()).rejects.toMatchObject({ code: 'BUSY' })
    await expect(service.authorizeModel('test-model')).rejects.toMatchObject({ code: 'BUSY' })
    finish(); await signingOut
    expect(service.get().status).toBe('disconnected')
  })

  it('exposes ineligible account access as a distinct recoverable state', async () => {
    const { service, provider } = setup()
    vi.mocked(provider.signIn).mockRejectedValue(new ApplicationError('ACCESS_RESTRICTED', 'Access unavailable.'))
    await service.connect(); await service.waitForConnection()
    expect(service.get().status).toBe('restricted')
  })

  it('preserves catalogue ordering and names without duplicating the extra choices', async () => {
    const { service, provider } = setup(credential)
    vi.mocked(provider.listModels).mockResolvedValue([{ id: 'gpt-6-luna', name: 'Server Luna' }, { id: 'gpt-6.1-sol', name: 'Server Sol' }])
    await service.initialize()
    expect(service.get().models).toEqual([{ id: 'gpt-6-luna', name: 'Server Luna' }, { id: 'gpt-6.1-sol', name: 'Server Sol' }])
    expect(service.get().verifiedModelIds).toEqual([])
  })

  it('keeps successful Sol evidence when a Luna test fails without changing either choice', async () => {
    const { service, provider } = setup(credential)
    await service.initialize(); await service.testSolModel(); await service.waitForModelTest()
    vi.mocked(provider.testLunaModel).mockRejectedValue(new ApplicationError('UNAVAILABLE', 'This model is not available.'))
    await service.testLunaModel(); await service.waitForModelTest()
    expect(service.get()).toMatchObject({ modelTestStatus: 'failed', modelTestTarget: 'gpt-6-luna', verifiedModelIds: ['gpt-6.1-sol'], models: choices })
  })
})

describe('outline account ownership', () => {
  it('commits rotated credentials despite synchronous owner cancellation before renewal continuation', async () => {
    let currentTime = 1000
    const { ai, service, provider, store, stored } = setup({ ...credential, expiresAt: 181001 }, () => currentTime)
    await service.initialize()
    const { lease } = ai.claim({ kind: 'create-outline', projectId: 'project', model: { id: 'test-model', name: 'Test' }, heading: 'Create', requestSummary: 'Learn' })
    let finish!: (value: AccountCredential) => void
    vi.mocked(provider.renew).mockImplementation(() => new Promise(resolve => { finish = resolve }))
    currentTime = 2000
    const authorization = service.authorizeModel('test-model', lease)
    lease.setCancellation(async () => { await authorization.catch(() => {}) })
    await vi.waitFor(() => expect(provider.renew).toHaveBeenCalledOnce())
    const rotated = { ...credential, accessToken: 'rotated-access', refreshToken: 'rotated-refresh', expiresAt: 20_000_000 }
    finish(rotated)
    const cancellation = ai.cancel({ operationId: lease.operationId })
    await expect(authorization).rejects.toMatchObject({ code: 'CANCELLED' }); await cancellation
    expect(store.write).toHaveBeenCalledWith(rotated); expect(stored()?.refreshToken).toBe('rotated-refresh')
    expect(service.get()).toMatchObject({ status: 'connected', modelsStatus: 'ready' })
    expect(JSON.stringify(service.get())).not.toContain('rotated-')
  })
  it('permits owner authorization but blocks unowned callers and isolates notification rejections', async () => {
    const { ai, service } = setup(credential)
    service.subscribe(() => { throw new Error('Observer') }); service.subscribe(async () => { throw new Error('Async observer') })
    await service.initialize()
    const { lease } = ai.claim({ kind: 'rewrite-outline', projectId: 'project', model: { id: 'test-model', name: 'Test' }, heading: 'Rewrite', requestSummary: 'Learn' })
    await expect(service.authorizeModel('test-model')).rejects.toMatchObject({ code: 'BUSY' })
    await expect(service.authorizeModel('test-model', lease)).resolves.toMatchObject({ model: { id: 'test-model' } })
    expect(service.get()).toMatchObject({ status: 'connected', modelsStatus: 'ready' }); lease.settle('failed')
  })
})
