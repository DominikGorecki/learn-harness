import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { startPiWorker } from '../../src/main/generation/worker-lifecycle'
import type { WorkerRequest, WorkerProfile } from '../../src/main/generation/worker-protocol'
import { maximumWorkerResultBytes, parseWorkerReply, parseWorkerRequest, workerFrameBytes } from '../../src/main/generation/worker-protocol'
import { safeLogData } from '../../src/shared/diagnostics'
import { learningOutline } from '../fixtures/learning-outline'
import { FakeMonotonicClock, flushMicrotasks } from '../fixtures/monotonic-clock'

class Worker extends EventEmitter {
  pid = 123
  requests: WorkerRequest[] = []
  kills = 0
  postMessage(value: WorkerRequest): void { this.requests.push(value) }
  kill(): boolean { this.kills++; return true }
}
const profile: WorkerProfile = { profile: 'outline', input: { model: { id: 'fixture-model', name: 'Fixture' }, accessToken: 'PRIVATE_TOKEN', baseUrl: 'http://127.0.0.1:12345/v1', brief: 'PRIVATE_GOAL' } }
function setup() {
  const worker = new Worker(), clock = new FakeMonotonicClock(), controller = new AbortController()
  const task = startPiWorker(profile, { signal: controller.signal, clock }, () => worker)
  return { worker, clock, controller, task }
}
describe('independent AI worker lifecycle', () => {
  it('does not settle success until exit and clears all timers/listeners', async () => {
    const { worker, clock, task } = setup(), settled = vi.fn()
    void task.result.then(settled)
    worker.emit('spawn'); worker.emit('message', { type: 'result', sequence: 1, profile: 'outline', result: { kind: 'outline', document: learningOutline() } })
    await flushMicrotasks(); expect(settled).not.toHaveBeenCalled(); expect(worker.kills).toBe(1)
    worker.emit('exit', 0); await expect(task.result).resolves.toMatchObject({ kind: 'outline' })
    expect(clock.timers.size).toBe(0); expect(worker.eventNames()).toEqual([])
  })
  it('has a spawn deadline and awaits failed process exit', async () => {
    const { worker, clock, task } = setup()
    clock.advance(30_000); expect(worker.kills).toBe(1); worker.emit('exit', 1)
    await expect(task.result).rejects.toMatchObject({ code: 'INTERNAL', message: expect.stringContaining('did not start') }); expect(clock.timers.size).toBe(0)
  })
  it('health survives old elapsed deadlines while received bytes cannot substitute for heartbeats', async () => {
    const { worker, clock, task } = setup(); worker.emit('spawn')
    let sequence = 0
    for (let i = 0; i < 160; i++) { clock.advance(5000); worker.emit('message', { type: 'health', sequence: ++sequence, phase: 'waiting' }) }
    expect(worker.kills).toBe(0)
    clock.advance(29_000)
    worker.emit('message', { type: 'transport', sequence: sequence + 1, state: { turn: 1, stage: 'receiving', bytes: 100, chunks: 1, events: 0, lastByteAgeMs: 0, semanticAgeMs: null, waiting: false, reason: null } })
    clock.advance(1000); expect(worker.kills).toBe(1); worker.emit('exit', 1)
    await expect(task.result).rejects.toMatchObject({ code: 'INTERNAL', message: expect.stringContaining('stopped responding') })
  })
  it('cancellation requests cooperative cleanup, then awaits process exit', async () => {
    const { worker, clock, controller, task } = setup(); worker.emit('spawn'); controller.abort()
    const stopped = vi.fn(); void task.stop().then(stopped)
    expect(worker.requests.at(-1)).toEqual({ type: 'cancel' }); expect(worker.kills).toBe(0)
    worker.emit('message', { type: 'error', sequence: 1, code: 'CANCELLED' }); await flushMicrotasks()
    expect(worker.kills).toBe(1); expect(stopped).not.toHaveBeenCalled()
    worker.emit('exit', 0); await task.stop(); expect(stopped).toHaveBeenCalledTimes(1); expect(clock.timers.size).toBe(0)
  })
  it('terminates a worker whose cancellation cleanup stops responding', async () => {
    const { worker, clock, controller, task } = setup(); worker.emit('spawn'); controller.abort(); clock.advance(5000)
    expect(worker.kills).toBe(1); worker.emit('exit', 1); await expect(task.result).rejects.toMatchObject({ code: 'CANCELLED' })
  })
  it('retains safe cleanup diagnostics without publishing cancelled progress or extending health', async () => {
    const worker = new Worker(), clock = new FakeMonotonicClock(), controller = new AbortController(), diagnostic = vi.fn(), progress = vi.fn()
    const task = startPiWorker(profile, { signal: controller.signal, clock, onDiagnostic: diagnostic, onProgress: progress }, () => worker)
    worker.emit('spawn'); controller.abort()
    worker.emit('message', { type: 'diagnostic', sequence: 1, event: 'engine.transport', data: { terminalReason: 'cancelled' } })
    worker.emit('message', { type: 'progress', sequence: 2, turn: 1, revision: 1, preview: { kind: 'none' } })
    worker.emit('message', { type: 'health', sequence: 3, phase: 'receiving' })
    expect(diagnostic).toHaveBeenCalledWith('engine.transport', { terminalReason: 'cancelled' }); expect(progress).not.toHaveBeenCalled()
    clock.advance(5000); expect(worker.kills).toBe(1); worker.emit('exit', 0)
    await expect(task.result).rejects.toMatchObject({ code: 'CANCELLED' }); expect(clock.timers.size).toBe(0)
  })
  it.each([null, { type: 'health', sequence: 0, phase: 'invalid' }, { type: 'error', sequence: 1, code: 'PRIVATE_SECRET' },
    { type: 'progress', sequence: 1, turn: 1, revision: 1, preview: { kind: 'text', text: 'x'.repeat(100_000) } }])('rejects malformed/oversized private messages safely (%s)', async value => {
    const { worker, task } = setup(); worker.emit('spawn'); worker.emit('message', value); expect(worker.kills).toBe(1); worker.emit('exit', 1)
    await expect(task.result).rejects.toMatchObject({ code: 'INTERNAL', message: expect.not.stringContaining('PRIVATE_SECRET') })
  })
  it('rejects replayed health sequences and wrong-profile results', async () => {
    for (const bad of [{ type: 'health', sequence: 1, phase: 'waiting' }, { type: 'result', sequence: 2, profile: 'model-access', result: {} }]) {
      const { worker, task } = setup(); worker.emit('spawn'); worker.emit('message', { type: 'health', sequence: 1, phase: 'waiting' }); worker.emit('message', bad)
      worker.emit('exit', 1); await expect(task.result).rejects.toMatchObject({ code: 'INTERNAL' })
    }
  })
  it('handles immediate spawn failure, exit and already-aborted calls', async () => {
    const clock = new FakeMonotonicClock()
    const failed = startPiWorker(profile, { signal: new AbortController().signal, clock }, () => { throw new Error('PRIVATE_SECRET') })
    await expect(failed.result).rejects.toMatchObject({ code: 'INTERNAL' }); expect(clock.timers.size).toBe(0)
    const { worker, task } = setup(); worker.emit('spawn'); worker.emit('exit', 1); await expect(task.result).rejects.toMatchObject({ code: 'INTERNAL' })
    const controller = new AbortController(); controller.abort(); const fork = vi.fn(() => new Worker())
    await expect(startPiWorker(profile, { signal: controller.signal }, fork).result).rejects.toMatchObject({ code: 'CANCELLED' }); expect(fork).not.toHaveBeenCalled()
  })
  it('isolates async rejecting phase, progress, lifecycle and diagnostic subscribers', async () => {
    const worker = new Worker(), clock = new FakeMonotonicClock(), rejected = vi.fn(async () => { throw new Error('PRIVATE_SECRET') })
    const task = startPiWorker(profile, { signal: new AbortController().signal, clock, onPhase: rejected, onProgress: rejected, onLifecycle: rejected, onDiagnostic: rejected }, () => worker)
    worker.emit('spawn'); worker.emit('message', { type: 'phase', sequence: 1, phase: 'planning' })
    worker.emit('message', { type: 'progress', sequence: 2, turn: 1, revision: 1, preview: { kind: 'none' } })
    worker.emit('message', { type: 'diagnostic', sequence: 3, event: 'engine.request', data: { bytes: 10 } })
    worker.emit('message', { type: 'result', sequence: 4, profile: 'outline', result: { kind: 'outline', document: learningOutline() } }); worker.emit('exit', 0)
    await expect(task.result).resolves.toMatchObject({ kind: 'outline' }); await flushMicrotasks(); expect(rejected).toHaveBeenCalled()
  })
})
describe('private profile and result budgets', () => {
  it('forbids project fields/tools/arbitrary diagnostic targets and wrong-topic preview', () => {
    const input = { target: 'gpt-6.1-sol', accessToken: 'PRIVATE_TOKEN', baseUrl: 'https://api.openai.com/v1' }
    expect(parseWorkerRequest({ type: 'start', profile: 'model-access', input })).toMatchObject({ profile: 'model-access' })
    for (const additional of [{ path: 'PRIVATE_PATH' }, { tools: [] }, { target: 'anything' }, { brief: 'PRIVATE_GOAL' }]) {
      expect(() => parseWorkerRequest({ type: 'start', profile: 'model-access', input: { ...input, ...additional } })).toThrow()
    }
    expect(() => parseWorkerReply({ type: 'result', sequence: 1, profile: 'model-access', result: {} }, profile)).toThrow()
  })
  it('accepts escaped/Unicode staged results larger than a provider response, with independent domain validation', () => {
    const controls = '\u0001'.repeat(250_000), unicode = '学'.repeat(50_000)
    const projectEdits = Array.from({ length: 8 }, (_, i) => ({ path: `topic/file-${i}.txt`, content: i ? controls : unicode, expectedContent: null }))
    const frame = { type: 'result', sequence: 1, profile: 'outline', result: { kind: 'outline', document: learningOutline(), projectEdits } }
    expect(workerFrameBytes(frame)).toBeGreaterThan(8 * 1024 * 1024); expect(workerFrameBytes(frame)).toBeLessThan(maximumWorkerResultBytes)
    expect(parseWorkerReply(frame, profile)).toMatchObject({ result: { projectEdits } })
    expect(() => parseWorkerReply({ ...frame, result: { ...frame.result, projectEdits: [...projectEdits, ...projectEdits] } }, profile)).toThrow()
  })
  it('projects byte/health diagnostics and ADR19 tools without content leakage', () => {
    const value = safeLogData({ transportStage: 'receiving', bytes: 100, chunks: 2, lastByteAgeMs: 0, semanticAgeMs: 20, terminalReason: 'completed',
      tool: 'write_project_file', waiting: false, token: 'PRIVATE_TOKEN', path: 'PRIVATE_PATH', content: 'PRIVATE_TEXT', message: 'PRIVATE_ERROR' })
    expect(value).toMatchObject({ tool: 'write_project_file', lastByteAgeMs: 0, semanticAgeMs: 20 }); expect(JSON.stringify(value)).not.toMatch(/PRIVATE_/)
  })
})
