import { ipcMain } from 'electron'
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'
import { ApplicationError } from '../../shared/contracts'
import type { ApiResult } from '../../shared/contracts'
import { isTrustedFrame } from '../security/policy'

export function registerCapability<T>(
  channel: string,
  action: (payload: unknown) => T | Promise<T>,
  currentWindow: () => BrowserWindow | null,
  expectedOrigin: string
): void {
  ipcMain.handle(channel, async (event: IpcMainInvokeEvent, payload: unknown): Promise<ApiResult<T>> => {
    try {
      const window = currentWindow()
      if (!window || window.isDestroyed() || event.sender !== window.webContents ||
          event.senderFrame !== window.webContents.mainFrame || !isTrustedFrame(event.senderFrame, expectedOrigin)) {
        throw new ApplicationError('FORBIDDEN', 'This request is not permitted.')
      }
      return { ok: true, data: await action(payload) }
    } catch (error) {
      if (error instanceof ApplicationError) return { ok: false, error: { code: error.code, message: error.message } }
      console.error(`Unexpected failure in ${channel}`)
      return { ok: false, error: { code: 'INTERNAL', message: 'The request could not be completed. Please try again.' } }
    }
  })
}

export function noPayload(payload: unknown): void {
  if (payload !== undefined) throw new ApplicationError('INVALID_INPUT', 'This action does not accept input.')
}
