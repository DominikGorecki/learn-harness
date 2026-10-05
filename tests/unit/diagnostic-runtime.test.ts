import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow, IpcMainEvent } from 'electron'
import { appOrigin } from '../../src/main/security/policy'
import { rendererDiagnosticChannel } from '../../src/shared/diagnostics'
import { logDiagnostic } from '../../src/main/logging/logger'
import { initializeDiagnostics, registerRendererDiagnostics } from '../../src/main/logging/runtime'

const fake = vi.hoisted(() => ({ packaged: false, listeners: new Map<string, (event: IpcMainEvent, value: unknown) => void>() }))
vi.mock('electron', () => ({
  app: { get isPackaged() { return fake.packaged } },
  ipcMain: { on: (channel: string, listener: (event: IpcMainEvent, value: unknown) => void) => fake.listeners.set(channel, listener) }
}))
vi.mock('../../src/main/logging/logger', async importOriginal => ({
  ...await importOriginal<object>(), logDiagnostic: vi.fn()
}))

describe('internal renderer diagnostic collector', () => {
  const mainFrame = { origin: appOrigin, url: `${appOrigin}/index.html` }
  const contents = { mainFrame }
  const window = { webContents: contents, isDestroyed: () => false } as unknown as BrowserWindow
  const trusted = { sender: contents, senderFrame: mainFrame } as unknown as IpcMainEvent
  const payload = { event: 'renderer.error', errorType: 'TypeError', line: 12, column: 3, token: 'private' }
  beforeEach(() => { fake.packaged = false; fake.listeners.clear(); vi.clearAllMocks() })
  afterEach(() => vi.useRealTimers())

  it('requires the owning window, main frame and exact entry before recording fixed metadata', () => {
    registerRendererDiagnostics(() => window, appOrigin)
    const receive = fake.listeners.get(rendererDiagnosticChannel)!
    receive({ ...trusted, sender: {} } as IpcMainEvent, payload)
    receive({ ...trusted, senderFrame: { ...mainFrame } } as IpcMainEvent, payload)
    expect(logDiagnostic).not.toHaveBeenCalled()
    receive(trusted, { event: 'arbitrary', message: 'private' })
    receive(trusted, payload)
    expect(logDiagnostic).toHaveBeenCalledExactlyOnceWith('error', 'renderer', 'renderer.error', { errorType: 'TypeError', line: 12, column: 3 })
  })

  it('bounds bursts and records an overload count when the next time window starts', () => {
    vi.useFakeTimers()
    registerRendererDiagnostics(() => window, appOrigin)
    const receive = fake.listeners.get(rendererDiagnosticChannel)!
    for (let i = 0; i < 110; i++) receive(trusted, payload)
    expect(logDiagnostic).toHaveBeenCalledTimes(100)
    vi.advanceTimersByTime(1001)
    receive(trusted, payload)
    expect(logDiagnostic).toHaveBeenCalledWith('warn', 'renderer', 'logging.dropped', { dropped: 10 })
  })

  it('does not initialize files or accept diagnostic IPC in packaged operation', async () => {
    fake.packaged = true
    registerRendererDiagnostics(() => window, appOrigin)
    expect(fake.listeners.size).toBe(0)
    const logger = await initializeDiagnostics()
    logger.log('info', 'main', 'app.ready')
    await logger.close()
    expect(logDiagnostic).not.toHaveBeenCalled()
  })
})
