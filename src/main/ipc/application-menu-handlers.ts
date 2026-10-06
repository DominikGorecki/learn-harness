import type { BrowserWindow } from 'electron'
import { applicationMenuChannels, parseApplicationMenuState, parseShowApplicationMenu, parseWindowAppearance } from '../../shared/application-menu'
import type { ApplicationMenus } from '../menus/application-menus'
import { applyWindowAppearance } from '../menus/chrome'
import { registerCapability } from './capability'

export function registerApplicationMenuHandlers(menus: ApplicationMenus, currentWindow: () => BrowserWindow | null, expectedOrigin: string): void {
  registerCapability(applicationMenuChannels.show, payload => menus.show(parseShowApplicationMenu(payload)), currentWindow, expectedOrigin)
  registerCapability(applicationMenuChannels.state, payload => menus.setState(parseApplicationMenuState(payload)), currentWindow, expectedOrigin)
  registerCapability(applicationMenuChannels.appearance, payload => {
    const { mode } = parseWindowAppearance(payload)
    const window = currentWindow()
    return { applied: Boolean(window && !window.isDestroyed() && applyWindowAppearance(window, mode)) }
  }, currentWindow, expectedOrigin)
}
