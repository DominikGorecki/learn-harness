import type { BrowserWindow } from 'electron'
import { accountChannels } from '../../shared/account'
import type { AccountService } from '../auth/account-service'
import { noPayload, registerCapability } from './capability'
import { logDiagnostic } from '../logging/logger'

export function registerAccountHandlers(account: AccountService, currentWindow: () => BrowserWindow | null, expectedOrigin: string): () => void {
  const actions = {
    [accountChannels.get]: () => account.get(),
    [accountChannels.connect]: () => account.connect(),
    [accountChannels.cancel]: () => account.cancel(),
    [accountChannels.reopen]: () => account.reopenBrowser(),
    [accountChannels.copyLink]: () => account.copySignInLink(),
    [accountChannels.models]: () => account.refreshModels(),
    [accountChannels.testSol]: () => account.testSolModel(),
    [accountChannels.testLuna]: () => account.testLunaModel(),
    [accountChannels.cancelTest]: () => account.cancelModelTest(),
    [accountChannels.disconnect]: () => account.disconnect()
  }
  for (const [channel, action] of Object.entries(actions)) {
    registerCapability(channel, payload => { noPayload(payload); return action() }, currentWindow, expectedOrigin)
  }
  return account.subscribe(snapshot => {
    logDiagnostic('info', 'main', 'account.changed', { status: snapshot.status, modelsStatus: snapshot.modelsStatus })
    const window = currentWindow()
    if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) window.webContents.send(accountChannels.changed, snapshot)
  })
}
