import { ApplicationError } from '../../shared/contracts'
import { generateWithPi } from './pi-outline-engine'
import type { WorkerRequest, WorkerReply } from './worker-protocol'

const controller = new AbortController()
let started = false
const reply = (value: WorkerReply) => process.parentPort?.postMessage(value)
process.parentPort?.on('message', (event: { data: WorkerRequest }) => {
  if (event.data.type === 'cancel') { controller.abort(); return }
  if (event.data.type !== 'start' || started) return
  started = true
  void generateWithPi(event.data.input, { signal: controller.signal, onPhase: phase => reply({ type: 'phase', phase }) })
    .then(result => reply({ type: 'result', result }))
    .catch(error => {
      const safe = error instanceof ApplicationError ? error : new ApplicationError('INTERNAL', 'Outline creation could not finish. Please try again.')
      reply({ type: 'error', code: safe.code, message: safe.message })
    })
})
