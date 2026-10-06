import type { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import type { MenuAnchor, WindowAppearance } from '../../shared/application-menu'

export const nativeOverlayHeight = 40
export function nativeOverlay(mode: WindowAppearance): { color: string; symbolColor: string; height: number } {
  return mode === 'dark' ? { color: '#1c2424', symbolColor: '#f3f3f3', height: nativeOverlayHeight } :
    { color: '#eaf4f5', symbolColor: '#222426', height: nativeOverlayHeight }
}
/** Activated with the renderer strip in T03; native controls remain Electron-owned. */
export function integratedChromeOptions(platform: NodeJS.Platform, mode: WindowAppearance): Pick<BrowserWindowConstructorOptions, 'titleBarStyle' | 'titleBarOverlay'> {
  return { titleBarStyle: 'hidden', ...(platform === 'darwin' ? {} : { titleBarOverlay: nativeOverlay(mode) }) }
}
export function applyWindowAppearance(window: BrowserWindow, mode: WindowAppearance): boolean {
  try { window.setTitleBarOverlay(nativeOverlay(mode)); return true } catch { return false }
}
/** Renderer anchors are CSS viewport pixels; popup positions are native content DIPs. */
export function popupAnchor(anchor: MenuAnchor, size: readonly number[], zoom: number): MenuAnchor {
  const scale = Number.isFinite(zoom) && zoom > 0 ? zoom : 1
  return { x: Math.max(0, Math.min(Math.max(0, size[0]! - 1), Math.round(anchor.x * scale))),
    y: Math.max(0, Math.min(Math.max(0, size[1]! - 1), Math.round(anchor.y * scale))) }
}
