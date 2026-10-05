import { ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'
import { ApplicationError } from '../../shared/contracts'
import type { ApiResult } from '../../shared/contracts'
import { isTrustedFrame } from '../security/policy'
import { errorDiagnostic, logDiagnostic, withDiagnosticRequest } from '../logging/logger'

export function isCapabilitySender(event: IpcMainInvokeEvent, window: BrowserWindow | null, expectedOrigin: string): boolean {
  return Boolean(window && !window.isDestroyed() && event.sender === window.webContents &&
    event.senderFrame === window.webContents.mainFrame && isTrustedFrame(event.senderFrame, expectedOrigin))
}

export function registerCapability<T>(
  channel: string,
  action: (payload: unknown) => T | Promise<T>,
  currentWindow: () => BrowserWindow | null,
  expectedOrigin: string
): void {
  ipcMain.handle(channel, async (event: IpcMainInvokeEvent, payload: unknown): Promise<ApiResult<T>> => {
    return withDiagnosticRequest(randomUUID(), async () => {
      const started = performance.now()
      logDiagnostic('debug', 'main', 'ipc.started', { channel })
      try {
        if (!isCapabilitySender(event, currentWindow(), expectedOrigin)) {
          throw new ApplicationError('FORBIDDEN', 'This request is not permitted.')
        }
        const data = await action(payload)
        logDiagnostic('info', 'main', 'ipc.completed', { channel, elapsedMs: Math.round(performance.now() - started) })
        return { ok: true, data }
      } catch (error) {
        logDiagnostic('error', 'main', 'ipc.failed', { channel, elapsedMs: Math.round(performance.now() - started),
          code: error instanceof ApplicationError ? error.code : 'INTERNAL', ...errorDiagnostic(error) })
        if (error instanceof ApplicationError) return { ok: false, error: { code: error.code, message: error.message } }
        console.error(`Unexpected failure in ${channel}`)
        return { ok: false, error: { code: 'INTERNAL', message: 'The request could not be completed. Please try again.' } }
      }
    })
  })
}

export function noPayload(payload: unknown): void {
  if (payload !== undefined) throw new ApplicationError('INVALID_INPUT', 'This action does not accept input.')
}
