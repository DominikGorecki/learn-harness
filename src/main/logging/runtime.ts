import { app, ipcMain } from 'electron'
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'
import { join } from 'node:path'
import { rendererDiagnosticChannel } from '../../shared/diagnostics'
import type { LogLevel } from '../../shared/diagnostics'
import { isCapabilitySender } from '../ipc/capability'
import { createFileLogger, errorDiagnostic, logDiagnostic, setDiagnosticLogger, silentLogger } from './logger'
import type { DiagnosticLogger } from './logger'

export async function initializeDiagnostics(): Promise<DiagnosticLogger> {
  if (app.isPackaged) return silentLogger
  const directory = join(app.getPath('userData'), 'logs')
  const warn = console.warn.bind(console)
  const logger = await createFileLogger(directory, { onFailure: () => warn('Development file logging is unavailable; app operation continues.') })
  setDiagnosticLogger(logger)
  console.info(`Development JSONL logs: ${directory}`)
  logDiagnostic('info', 'main', 'session.started', {
    appVersion: app.getVersion(), electronVersion: process.versions.electron, nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome, platform: process.platform, packaged: false,
    development: Boolean(process.env.ELECTRON_RENDERER_URL)
  })
  for (const method of ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const) {
    const original = console[method].bind(console)
    console[method] = (...args: unknown[]) => {
      const level: LogLevel = method === 'error' ? 'error' : method === 'warn' ? 'warn' : method === 'debug' || method === 'trace' ? 'debug' : 'info'
      logDiagnostic(level, 'main', 'console.output', { method, arguments: args.length,
        omittedCharacters: args.reduce<number>((count, value) => count + (typeof value === 'string' ? value.length : 0), 0),
        ...errorDiagnostic(args.find(value => value instanceof Error)) })
      original(...args)
    }
  }
  process.on('uncaughtExceptionMonitor', (error, origin) => logger.emergencyFlush({ origin, ...errorDiagnostic(error) }))
  app.on('child-process-gone', (_event, details) => logDiagnostic('error', 'main', 'process.gone', {
    processType: details.type, reason: details.reason, exitCode: details.exitCode
  }))
  return logger
}

export function registerRendererDiagnostics(currentWindow: () => BrowserWindow | null, expectedOrigin: string): void {
  if (app.isPackaged) return
  let count = 0, interval = Date.now(), dropped = 0
  ipcMain.on(rendererDiagnosticChannel, (event, value: unknown) => {
    if (!isCapabilitySender(event as IpcMainInvokeEvent, currentWindow(), expectedOrigin)) return
    if (Date.now() - interval >= 1000) {
      if (dropped) logDiagnostic('warn', 'renderer', 'logging.dropped', { dropped })
      count = 0; dropped = 0; interval = Date.now()
    }
    if (++count > 100) { dropped++; return }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return
    const data = value as Record<string, unknown>
    if (data.event !== 'renderer.error' && data.event !== 'renderer.rejection') return
    logDiagnostic('error', 'renderer', data.event, { errorType: data.errorType, line: data.line, column: data.column })
  })
}

export function observeWindow(window: BrowserWindow): void {
  if (app.isPackaged) return
  const windowId = window.id
  const log = (level: LogLevel, event: Parameters<typeof logDiagnostic>[2], data?: Record<string, unknown>) =>
    logDiagnostic(level, 'renderer', event, { windowId, ...data })
  log('info', 'window.created')
  window.on('closed', () => log('info', 'window.closed'))
  window.webContents.on('did-finish-load', () => log('info', 'window.loaded'))
  window.webContents.on('did-fail-load', (_event, code, _description, _url, isMainFrame) => {
    if (isMainFrame) log('error', 'window.load-failed', { exitCode: code })
  })
  window.webContents.on('preload-error', (_event, _path, error) => logDiagnostic('error', 'preload', 'preload.failed', { windowId, ...errorDiagnostic(error) }))
  window.webContents.on('render-process-gone', (_event, details) => log('error', 'process.gone', { reason: details.reason, exitCode: details.exitCode }))
  window.webContents.on('console-message', details => log(details.level === 'error' ? 'error' : details.level === 'warning' ? 'warn' : 'debug',
    'console.output', { omittedCharacters: details.message.length, line: details.lineNumber }))
}
