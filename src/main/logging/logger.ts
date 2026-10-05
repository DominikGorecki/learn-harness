import { randomUUID } from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'
import { appendFileSync } from 'node:fs'
import { chmod, lstat, mkdir, open, readdir, unlink } from 'node:fs/promises'
import type { FileHandle } from 'node:fs/promises'
import { join } from 'node:path'
import { safeLogData } from '../../shared/diagnostics'
import type { LogEvent, LogLevel, LogSource } from '../../shared/diagnostics'

export interface DiagnosticLogger {
  log(level: LogLevel, source: LogSource, event: LogEvent, data?: unknown): void
  flush(): Promise<void>
  close(): Promise<void>
  emergencyFlush(data?: unknown): void
}
export const silentLogger: DiagnosticLogger = { log() {}, async flush() {}, async close() {}, emergencyFlush() {} }
const ownedFile = /^session-\d{13}-[0-9a-f-]{36}-\d{8}\.jsonl$/

/** One main-process writer; bounded memory and disk, failures never escape into app work. */
export async function createFileLogger(directory: string, options: {
  maxFileBytes?: number; maxFiles?: number; maxQueue?: number; onFailure?: () => void
} = {}): Promise<DiagnosticLogger> {
  const maxBytes = Math.max(1024, options.maxFileBytes ?? 5 * 1024 * 1024)
  const maxFiles = Math.max(1, options.maxFiles ?? 10)
  const maxQueue = Math.max(1, options.maxQueue ?? 2000)
  const sessionId = randomUUID()
  const prefix = `session-${Date.now()}-${sessionId}`
  let handle: FileHandle | undefined, path = '', size = 0, part = 0, sequence = 0
  let failed = false, closed = false, dropped = 0
  const queue: string[] = []
  let draining: Promise<void> | undefined
  const fail = () => {
    if (failed) return
    failed = true; queue.length = 0
    try { options.onFailure?.() } catch { /* Diagnostics must be best effort. */ }
  }
  const prune = async () => {
    const files = (await readdir(directory)).filter(name => ownedFile.test(name)).sort()
    for (const name of files.slice(0, Math.max(0, files.length - maxFiles))) {
      const target = join(directory, name)
      const stat = await lstat(target)
      if (stat.isFile() && !stat.isSymbolicLink() && target !== path) await unlink(target)
    }
  }
  const rotate = async () => {
    await handle?.close()
    path = join(directory, `${prefix}-${String(part++).padStart(8, '0')}.jsonl`)
    handle = await open(path, 'ax', 0o600); size = 0
    await prune()
  }
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 })
    const stat = await lstat(directory)
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Unsafe diagnostic directory')
    if (process.platform !== 'win32') await chmod(directory, 0o700)
    await rotate()
  } catch { fail(); await handle?.close().catch(() => {}); return silentLogger }
  const line = (level: LogLevel, source: LogSource, event: LogEvent, data?: unknown) => JSON.stringify({
    schemaVersion: 1, timestamp: new Date().toISOString(), sessionId, sequence: ++sequence,
    pid: process.pid, level, source, event, data: safeLogData(data)
  }) + '\n'
  const drain = async () => {
    try {
      while (queue.length || dropped) {
        if (dropped) { queue.push(line('warn', 'main', 'logging.dropped', { dropped })); dropped = 0 }
        const batch = queue.splice(0, 100)
        for (const entry of batch) {
          const bytes = Buffer.byteLength(entry)
          if (size && size + bytes > maxBytes) await rotate()
          await handle!.writeFile(entry); size += bytes
        }
      }
    } catch { fail() }
  }
  const flush = async () => {
    if (failed) return
    do {
      if (!draining) draining = drain().finally(() => { draining = undefined })
      await draining
    } while (!failed && (queue.length || dropped))
  }
  return {
    log(level, source, event, data) {
      if (closed || failed) return
      if (queue.length >= maxQueue) { dropped++; return }
      try {
        queue.push(line(level, source, event, data))
        void flush()
      } catch { /* Malformed diagnostic data cannot interrupt application work. */ }
    },
    flush,
    async close() {
      closed = true; await flush()
      try { await handle?.close() } catch { fail() }
    },
    emergencyFlush(data) {
      // Fatal exception monitoring preserves Node's default termination behavior.
      // Pending async I/O may be lost at termination; this final marker is synchronous.
      if (failed || closed) return
      try { appendFileSync(path, line('error', 'main', 'process.unhandled', data)) } catch { fail() }
    }
  }
}

let active: DiagnosticLogger = silentLogger
const context = new AsyncLocalStorage<{ requestId: string }>()
export function setDiagnosticLogger(logger: DiagnosticLogger): void { active = logger }
export function withDiagnosticRequest<T>(requestId: string, action: () => T): T { return context.run({ requestId }, action) }
export function diagnosticRequestId(): string | undefined { return context.getStore()?.requestId }
export function logDiagnostic(level: LogLevel, source: LogSource, event: LogEvent, data?: unknown): void {
  try { active.log(level, source, event, { ...context.getStore(), ...safeLogData(data) }) } catch { /* Best effort. */ }
}

/** Retain type and app bundle locations, never error messages, paths or function names. */
export function errorDiagnostic(error: unknown): Record<string, unknown> {
  try {
    if (!(error instanceof Error)) return { errorType: 'unknown' }
    const type = error.constructor.name
    const frame = error.stack?.split('\n').slice(1, 20).map(frame => frame.match(/(?:index\.(?:js|cjs)|outline-worker\.js):(\d+):(\d+)/)).find(Boolean)
    return { errorType: type, ...(frame ? { line: Number(frame[1]), column: Number(frame[2]) } : {}) }
  } catch { return { errorType: 'unknown' } }
}
