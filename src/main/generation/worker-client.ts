import { utilityProcess } from 'electron'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { OutlineEngineInput, OutlineEngineResult, EnginePhase } from './pi-outline-engine'
import type { WorkerProfile } from './worker-protocol'
import { startPiWorker } from './worker-lifecycle'
import type { PiWorkerTask, WorkerRunOptions } from './worker-lifecycle'
import { diagnosticRequestId, logDiagnostic } from '../logging/logger'

/** Private sanctioned profiles only; no renderer registration or arbitrary process arguments. */
export function runPiWorker(profile: WorkerProfile, options: WorkerRunOptions): PiWorkerTask {
  const workerId = randomUUID(), started = performance.now(), requestId = diagnosticRequestId()
  const log: typeof logDiagnostic = (level, source, event, data) => {
    try { logDiagnostic(level, source, event, { ...data as Record<string, unknown>, requestId, workerId }) } catch { /* Diagnostics cannot change lifecycle. */ }
  }
  log('info', 'utility', 'worker.started', { rewriting: profile.profile === 'outline' && profile.input.changes !== undefined })
  const env = Object.fromEntries(['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'LC_ALL', 'SSL_CERT_FILE', 'SSL_CERT_DIR']
    .flatMap(key => process.env[key] ? [[key, process.env[key]!]] : []))
  const task = startPiWorker(profile, { ...options,
    onLifecycle: (event, data) => {
      log(event === 'stopping' ? 'debug' : 'info', 'utility', event === 'spawned' ? 'worker.spawned' : event === 'health' ? 'worker.health' : event === 'exited' ? 'worker.exited' : 'worker.stopping', data)
      return options.onLifecycle?.(event, data)
    },
    onPhase: phase => { log('debug', 'utility', 'worker.phase', { phase }); return options.onPhase?.(phase) },
    onDiagnostic: (event, data) => { log(event === 'process.unhandled' ? 'error' : 'debug', 'utility', event, data); return options.onDiagnostic?.(event, data) }
  }, () => utilityProcess.fork(join(import.meta.dirname, 'outline-worker.js'), [], { env, stdio: 'ignore', serviceName: profile.profile === 'outline' ? 'Learning outline' : profile.profile === 'chapter' ? 'Learning chapter' : profile.profile === 'fixed-image' ? 'Learning illustration' : 'Learning model access' }))
  void task.result.then(result => log('info', 'utility', 'worker.completed', { elapsedMs: Math.round(performance.now() - started), kind: 'kind' in result ? result.kind : undefined }),
    error => log('warn', 'utility', 'worker.failed', { elapsedMs: Math.round(performance.now() - started), code: error.code }))
  return task
}
export function runOutlineWorker(input: OutlineEngineInput, options: { signal: AbortSignal; onPhase(phase: EnginePhase): void } & Pick<WorkerRunOptions, 'onTransport' | 'onProgress'>): Promise<OutlineEngineResult> {
  return runPiWorker({ profile: 'outline', input }, options).result as Promise<OutlineEngineResult>
}
