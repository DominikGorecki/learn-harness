import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'
import { noPayload, registerCapability } from '../../src/main/ipc/capability'
import { providerEnvironment } from '../../src/main/auth/provider-environment'
import { chatgptEndpoints } from '../../src/main/auth/chatgpt-provider'
import { appOrigin } from '../../src/main/security/policy'
import { ApplicationError } from '../../src/shared/contracts'
import { AiCoordinator } from '../../src/core/ai/coordinator'
import { registerAiHandlers } from '../../src/main/ipc/ai-handlers'
import { aiChannels } from '../../src/shared/ai/activity'

const handlers = vi.hoisted(() => new Map<string, (event: IpcMainInvokeEvent, payload?: unknown) => Promise<unknown>>())
vi.mock('electron', () => ({ ipcMain: { handle: (channel: string, handler: (event: IpcMainInvokeEvent, payload?: unknown) => Promise<unknown>) => handlers.set(channel, handler) } }))

describe('asynchronous privileged capabilities', () => {
  const mainFrame = { origin: appOrigin, url: `${appOrigin}/index.html` }
  const webContents = { mainFrame }
  const window = { webContents, isDestroyed: () => false } as unknown as BrowserWindow
  const event = { sender: webContents, senderFrame: mainFrame } as unknown as IpcMainInvokeEvent
  beforeEach(() => handlers.clear())

  it('awaits the operation before constructing a serializable reply', async () => {
    registerCapability('account:test', async payload => { noPayload(payload); return { status: 'connected' } }, () => window, appOrigin)
    await expect(handlers.get('account:test')!(event)).resolves.toEqual({ ok: true, data: { status: 'connected' } })
    await expect(handlers.get('account:test')!(event, { url: 'https://other.example' })).resolves.toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
  })
  it('rejects a sibling window or frame before starting asynchronous work', async () => {
    const action = vi.fn(async () => true)
    registerCapability('account:test', action, () => window, appOrigin)
    await expect(handlers.get('account:test')!({ ...event, sender: {} } as IpcMainInvokeEvent)).resolves.toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
    await expect(handlers.get('account:test')!({ ...event, senderFrame: { ...mainFrame } } as IpcMainInvokeEvent)).resolves.toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
    expect(action).not.toHaveBeenCalled()
  })
  it('returns expected errors safely and hides rejected-provider internals', async () => {
    registerCapability('account:expected', async () => { throw new ApplicationError('AUTH_REQUIRED', 'Reconnect.') }, () => window, appOrigin)
    await expect(handlers.get('account:expected')!(event)).resolves.toMatchObject({ ok: false, error: { code: 'AUTH_REQUIRED' } })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    registerCapability('account:unexpected', async () => { throw new Error('private token') }, () => window, appOrigin)
    const reply = await handlers.get('account:unexpected')!(event)
    expect(JSON.stringify(reply)).not.toContain('private token')
    expect(log.mock.calls.flat().join(' ')).not.toContain('private token')
    log.mockRestore()
  })
  it('authorizes named AI capabilities and rejects malformed, stale and privileged cancellation input', async () => {
    const coordinator = new AiCoordinator({ now: () => 0, createId: () => 'operation' })
    const unsubscribe = registerAiHandlers(coordinator, () => window, appOrigin)
    const get = handlers.get(aiChannels.get)!, cancel = handlers.get(aiChannels.cancel)!
    await expect(get(event)).resolves.toEqual({ ok: true, data: { revision: 0, active: null, settled: null } })
    await expect(get(event, {})).resolves.toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
    for (const payload of [undefined, {}, { operationId: 1 }, { operationId: 'a/b' }, { operationId: 'operation', model: 'other' }, { operationId: 'operation', timeout: 0 }]) {
      await expect(cancel(event, payload)).resolves.toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
    }
    await expect(cancel(event, { operationId: 'stale' })).resolves.toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } })
    for (const hostile of [{ ...event, sender: {} }, { ...event, senderFrame: { ...mainFrame, url: `${appOrigin}/other.html` } },
      { ...event, senderFrame: { ...mainFrame, origin: 'https://evil.example' } }]) {
      await expect(get(hostile as IpcMainInvokeEvent)).resolves.toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
      await expect(cancel(hostile as IpcMainInvokeEvent, { operationId: 'operation' })).resolves.toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
    }
    const { lease } = coordinator.claim({ kind: 'test-sol', model: { id: 'gpt-6.1-sol', name: 'Sol' }, heading: 'Testing Sol', requestSummary: '' })
    const cleanup = vi.fn(async () => {}); lease.setCancellation(cleanup)
    await expect(cancel(event, { operationId: lease.operationId })).resolves.toMatchObject({ ok: true, data: { active: null, settled: { outcome: 'cancelled' } } })
    expect(cleanup).toHaveBeenCalledOnce()
    unsubscribe(); await coordinator.dispose()
  })
})

describe('protocol fixture isolation', () => {
  it('uses official endpoints in packaged operation regardless of environment values', () => {
    expect(providerEnvironment({ packaged: true, testProfile: '/tmp/test', fixtureOrigin: 'http://evil.example' })).toBe(chatgptEndpoints)
    expect(providerEnvironment({ packaged: false, fixtureOrigin: 'http://127.0.0.1:1234' })).toBe(chatgptEndpoints)
  })
  it('accepts only a local explicit port in an isolated unpackaged profile', () => {
    expect(providerEnvironment({ packaged: false, testProfile: '/tmp/test', fixtureOrigin: 'http://127.0.0.1:1234' }).models).toBe('http://127.0.0.1:1234/models')
    for (const origin of ['https://remote.example', 'http://localhost:1234', 'http://127.0.0.1:1234/path', 'http://user@127.0.0.1:1234']) {
      expect(() => providerEnvironment({ packaged: false, testProfile: '/tmp/test', fixtureOrigin: origin })).toThrow()
    }
  })
})
