import { utilityProcess } from 'electron'
import { join } from 'node:path'
import { ApplicationError } from '../../shared/contracts'
import type { OutlineEngineInput, OutlineEngineResult, EnginePhase } from './pi-outline-engine'
import type { WorkerReply, WorkerRequest } from './worker-protocol'

export function runOutlineWorker(input: OutlineEngineInput, options: { signal: AbortSignal; onPhase(phase: EnginePhase): void }): Promise<OutlineEngineResult> {
  if (options.signal.aborted) return Promise.reject(new ApplicationError('CANCELLED', 'Outline creation cancelled.'))
  return new Promise((resolve, reject) => {
    // Keep ambient provider keys, Node options, and project configuration out of
    // the dedicated worker. Credentials travel only over the private process port.
    const env = Object.fromEntries(['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'LC_ALL', 'SSL_CERT_FILE', 'SSL_CERT_DIR']
      .flatMap(key => process.env[key] ? [[key, process.env[key]!]] : []))
    const worker = utilityProcess.fork(join(import.meta.dirname, 'outline-worker.js'), [], { env, stdio: 'ignore', serviceName: 'Learning outline' })
    let settled = false
    const finish = (result?: OutlineEngineResult, error?: ApplicationError) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      options.signal.removeEventListener('abort', cancel)
      worker.removeAllListeners('message')
      worker.kill()
      if (error) reject(error)
      else resolve(result!)
    }
    const send = (value: WorkerRequest) => worker.postMessage(value)
    const cancel = () => finish(undefined, new ApplicationError('CANCELLED', 'Outline creation cancelled. Your previous work is unchanged.'))
    const timeout = setTimeout(() => finish(undefined, new ApplicationError('NETWORK', 'Outline creation took too long. Please try again.')), 190_000)
    options.signal.addEventListener('abort', cancel, { once: true })
    worker.once('spawn', () => { if (!settled) send({ type: 'start', input }) })
    worker.on('message', (message: WorkerReply) => {
      if (settled) return
      if (message.type === 'phase') options.onPhase(message.phase)
      if (message.type === 'result') finish(message.result)
      if (message.type === 'error') finish(undefined, new ApplicationError(message.code, message.message))
    })
    worker.once('exit', () => { if (!settled) finish(undefined, new ApplicationError('INTERNAL', 'The outline process stopped unexpectedly. Your previous work is unchanged.')) })
  })
}
