import { ipcMain } from 'electron'
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'
import type { LearningService } from '../../core/learning/service'
import { ApplicationError, channels, parseStartSession, parseSubmitAnswer } from '../../shared/contracts'
import type { ApiResult } from '../../shared/contracts'
import { isTrustedFrame } from '../security/policy'

export function registerLearningHandlers(service: LearningService, currentWindow: () => BrowserWindow | null, expectedOrigin: string): void {
  const handle = <T>(channel: string, action: (payload: unknown) => T) => {
    ipcMain.handle(channel, (event: IpcMainInvokeEvent, payload: unknown): ApiResult<T> => {
      try {
        const window = currentWindow()
        if (!window || window.isDestroyed() || event.sender !== window.webContents ||
            event.senderFrame !== window.webContents.mainFrame ||
            !isTrustedFrame(event.senderFrame, expectedOrigin)) {
          throw new ApplicationError('FORBIDDEN', 'This request is not permitted.')
        }
        return { ok: true, data: action(payload) }
      } catch (error) {
        if (error instanceof ApplicationError) return { ok: false, error: { code: error.code, message: error.message } }
        console.error(`Unexpected failure in ${channel}`)
        return { ok: false, error: { code: 'INTERNAL', message: 'The request could not be completed. Please try again.' } }
      }
    })
  }
  handle(channels.listCourses, () => service.listCourses())
  handle(channels.listSessions, () => service.listSessions())
  handle(channels.startSession, payload => service.startSession(parseStartSession(payload)))
  handle(channels.submitAnswer, payload => service.submitAnswer(parseSubmitAnswer(payload)))
}
