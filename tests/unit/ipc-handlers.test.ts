import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'
import { createLearningService } from '../../src/core/learning/service'
import { createMemorySessionRepository } from '../../src/main/adapters/memory-session-repository'
import { registerLearningHandlers } from '../../src/main/ipc/handlers'
import { appOrigin } from '../../src/main/security/policy'
import { channels } from '../../src/shared/contracts'

const handlers = vi.hoisted(() => new Map<string, (event: IpcMainInvokeEvent, payload?: unknown) => unknown>())
vi.mock('electron', () => ({ ipcMain: { handle: (channel: string, handler: (event: IpcMainInvokeEvent, payload?: unknown) => unknown) => handlers.set(channel, handler) } }))

describe('IPC authorization and translation', () => {
  const mainFrame = { origin: appOrigin, url: `${appOrigin}/index.html` }
  const webContents = { mainFrame }
  const window = { webContents, isDestroyed: () => false } as unknown as BrowserWindow
  const event = { sender: webContents, senderFrame: mainFrame } as unknown as IpcMainInvokeEvent
  let service: ReturnType<typeof createLearningService>

  beforeEach(() => {
    handlers.clear()
    service = createLearningService({ sessions: createMemorySessionRepository(), createId: () => 'session-1', now: () => '2026-10-04T12:00:00Z' })
    registerLearningHandlers(service, () => window, appOrigin)
  })

  it('routes a valid authorized request through the real service', () => {
    expect(handlers.get(channels.startSession)!(event, { courseId: 'web', goal: 'Learn HTTP' })).toMatchObject({ ok: true, data: { id: 'session-1', goal: 'Learn HTTP' } })
  })

  it('rejects another window and a same-origin subframe before calling core', () => {
    const list = vi.spyOn(service, 'listCourses')
    expect(handlers.get(channels.listCourses)!({ ...event, sender: {} } as IpcMainInvokeEvent)).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
    expect(handlers.get(channels.listCourses)!({ ...event, senderFrame: { ...mainFrame } } as IpcMainInvokeEvent)).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
    expect(list).not.toHaveBeenCalled()
  })

  it('rejects a missing or navigated frame', () => {
    expect(handlers.get(channels.listSessions)!({ ...event, senderFrame: null } as IpcMainInvokeEvent)).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
    const previous = mainFrame.origin
    mainFrame.origin = 'https://example.com'
    try { expect(handlers.get(channels.listSessions)!(event)).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } }) }
    finally { mainFrame.origin = previous }
  })

  it('returns INVALID_INPUT and leaves state unchanged on forged fields', () => {
    expect(handlers.get(channels.startSession)!(event, { courseId: 'web', goal: 'Learn', path: '/tmp/a' })).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
    expect(service.listSessions()).toEqual([])
  })

  it('does not expose unexpected error details to renderer', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(service, 'listCourses').mockImplementation(() => { throw new Error('private path and stack') })
    expect(handlers.get(channels.listCourses)!(event)).toEqual({ ok: false, error: { code: 'INTERNAL', message: 'The request could not be completed. Please try again.' } })
    expect(log.mock.calls.flat().join(' ')).not.toContain('private path')
    log.mockRestore()
  })
})
