import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'
import { noPayload, registerCapability } from '../../src/main/ipc/capability'
import { providerEnvironment } from '../../src/main/auth/provider-environment'
import { chatgptEndpoints } from '../../src/main/auth/chatgpt-provider'
import { appOrigin } from '../../src/main/security/policy'
import { ApplicationError } from '../../src/shared/contracts'

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
