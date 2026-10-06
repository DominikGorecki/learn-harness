import { ApplicationError } from './contracts'
import type { ApiResult } from './contracts'
import { identifier, strictRecord } from './validation'

export const applicationMenus = ['file', 'edit', 'view', 'help', 'compact'] as const
export type ApplicationMenu = typeof applicationMenus[number]
export interface MenuAnchor { x: number; y: number }
export interface ShowApplicationMenuRequest { menu: ApplicationMenu; anchor: MenuAnchor }
export interface ApplicationMenuState {
  revision: number; canGoBack: boolean; canGoForward: boolean; navigationPending: boolean; sidebarVisible: boolean
}
export type WindowAppearance = 'light' | 'dark'
export type ApplicationCommand = { revision: number } & (
  { command: 'open-project' | 'go-back' | 'go-forward' | 'toggle-sidebar' | 'show-appearance' } |
  { command: 'select-recent-project'; projectHandle: string }
)
export interface ApplicationMenuApi {
  /** Resolves after native dismissal, so the caller can restore its trigger focus. */
  showApplicationMenu(request: ShowApplicationMenuRequest): Promise<ApiResult<{ closed: true }>>
  setApplicationMenuState(request: ApplicationMenuState): Promise<ApiResult<{ revision: number }>>
  setWindowAppearance(request: { mode: WindowAppearance }): Promise<ApiResult<{ applied: boolean }>>
  onApplicationCommand(listener: (command: ApplicationCommand) => void): () => void
}
export const applicationMenuChannels = {
  show: 'application-menu:show', state: 'application-menu:state', appearance: 'application-menu:appearance', command: 'application-menu:command'
} as const

function invalid(): never { throw new ApplicationError('INVALID_INPUT', 'Invalid application menu request.') }
function revision(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) invalid()
  return value
}
function flag(value: unknown): boolean { if (typeof value !== 'boolean') invalid(); return value }
function coordinate(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 100_000) invalid()
  return value
}
export function parseShowApplicationMenu(value: unknown): ShowApplicationMenuRequest {
  const data = strictRecord(value, ['menu', 'anchor'])
  if (!applicationMenus.includes(data.menu as ApplicationMenu)) invalid()
  const anchor = strictRecord(data.anchor, ['x', 'y'])
  return { menu: data.menu as ApplicationMenu, anchor: { x: coordinate(anchor.x), y: coordinate(anchor.y) } }
}
export function parseApplicationMenuState(value: unknown): ApplicationMenuState {
  const data = strictRecord(value, ['revision', 'canGoBack', 'canGoForward', 'navigationPending', 'sidebarVisible'])
  return { revision: revision(data.revision), canGoBack: flag(data.canGoBack), canGoForward: flag(data.canGoForward),
    navigationPending: flag(data.navigationPending), sidebarVisible: flag(data.sidebarVisible) }
}
export function parseWindowAppearance(value: unknown): { mode: WindowAppearance } {
  const data = strictRecord(value, ['mode'])
  if (data.mode !== 'light' && data.mode !== 'dark') invalid()
  return { mode: data.mode }
}
export function parseApplicationCommand(value: unknown): ApplicationCommand {
  const data = strictRecord(value, ['command', 'revision', 'projectHandle'])
  const currentRevision = revision(data.revision)
  if (data.command === 'select-recent-project') return { command: data.command, revision: currentRevision, projectHandle: identifier(data.projectHandle) }
  if (Object.hasOwn(data, 'projectHandle')) invalid()
  switch (data.command) {
    case 'open-project': case 'go-back': case 'go-forward': case 'toggle-sidebar': case 'show-appearance':
      return { command: data.command, revision: currentRevision }
    default: return invalid()
  }
}
