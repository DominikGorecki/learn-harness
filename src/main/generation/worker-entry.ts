import { ApplicationError } from '../../shared/contracts'
import { generateWithPi } from './pi-outline-engine'
import type { WorkerRequest, WorkerReply } from './worker-protocol'
import { safeLogData } from '../../shared/diagnostics'

const controller = new AbortController()
let started = false
const reply = (value: WorkerReply) => process.parentPort?.postMessage(value)
for (const method of ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const) {
  console[method] = (...args: unknown[]) => {
    try {
      reply({ type: 'diagnostic', event: 'console.output', data: safeLogData({ method, arguments: args.length,
        omittedCharacters: args.reduce<number>((count, value) => count + (typeof value === 'string' ? value.length : 0), 0),
        errorType: args.find(value => value instanceof Error)?.constructor.name }) })
    } catch { /* The worker's ignored stdio must never turn logging into inference failure. */ }
  }
}
process.on('uncaughtExceptionMonitor', (error, origin) => {
  try { reply({ type: 'diagnostic', event: 'process.unhandled', data: safeLogData({ errorType: error.constructor.name, origin }) }) }
  catch { /* Main still observes unexpected utility exit if this port is unavailable. */ }
})
process.parentPort?.on('message', (event: { data: WorkerRequest }) => {
  if (event.data.type === 'cancel') { controller.abort(); return }
  if (event.data.type !== 'start' || started) return
  started = true
  void generateWithPi(event.data.input, { signal: controller.signal, onPhase: phase => reply({ type: 'phase', phase }),
    onDiagnostic: (event, data) => reply({ type: 'diagnostic', event, data: safeLogData(data) }) })
    .then(result => reply({ type: 'result', result }))
    .catch(error => {
      const safe = error instanceof ApplicationError ? error : new ApplicationError('INTERNAL', 'Outline creation could not finish. Please try again.')
      reply({ type: 'error', code: safe.code, message: safe.message })
    })
})
