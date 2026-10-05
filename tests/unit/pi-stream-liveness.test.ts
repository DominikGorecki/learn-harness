import { describe, expect, it, vi } from 'vitest'
import type { Model } from '@earendil-works/pi-ai'
import { PiStreamLiveness } from '../../src/main/generation/pi-stream-liveness'
import type { TransportState } from '../../src/main/generation/pi-stream-liveness'
import { streamPiTurn } from '../../src/main/generation/pi-transport'
import { runModelAccessProfile } from '../../src/main/generation/pi-model-access-profile'
import { FakeMonotonicClock, flushMicrotasks } from '../fixtures/monotonic-clock'

const encoder = new TextEncoder()
const frame = (event: unknown) => `data: ${JSON.stringify(event)}\r\n\r\n`
const completion = frame({ type: 'response.completed', response: { id: 'resp_test', status: 'completed', model: 'gpt-6.1-sol', output: [] } })
const model: Model<'openai-responses'> = { id: 'gpt-6.1-sol', name: 'Sol', api: 'openai-responses', provider: 'openai', baseUrl: 'http://127.0.0.1:12345/v1',
  reasoning: false, input: ['text'], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1000, maxTokens: 100 }
function controlled() {
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const cancel = vi.fn()
  const body = new ReadableStream<Uint8Array>({ start(value) { controller = value }, cancel })
  return { body, cancel, write: (value: string) => controller.enqueue(encoder.encode(value)), empty: () => controller.enqueue(new Uint8Array()), end: () => controller.close() }
}
function start(body: ReadableStream<Uint8Array>, clock = new FakeMonotonicClock(), controller = new AbortController(), maximumResponseBytes = 8 * 1024 * 1024) {
  const states: TransportState[] = []
  const request = vi.fn<typeof fetch>(async () => new Response(body, { headers: { 'content-type': 'text/event-stream' } }))
  const turn = streamPiTurn(model, { messages: [{ role: 'user', content: 'PRIVATE_PROMPT', timestamp: 0 }] },
    { accessToken: 'PRIVATE_TOKEN', signal: controller.signal, turn: 1, maximumResponseBytes, request, clock, onTransport: state => states.push(state) })
  const done = (async () => { const events: string[] = []; for await (const event of turn.stream) events.push(event.type); await turn.evidence; return events })()
  return { turn, done, states, request, clock, controller }
}
describe('raw-byte per-turn inactivity', () => {
  it('classifies an oversized request before network admission and disarms its timer', async () => {
    const clock = new FakeMonotonicClock(), states: TransportState[] = [], request = vi.fn<typeof fetch>()
    const turn = streamPiTurn(model, { messages: [{ role: 'user', content: '界'.repeat(1_500_000), timestamp: 0 }] },
      { accessToken: 'PRIVATE_TOKEN', signal: new AbortController().signal, turn: 1, maximumResponseBytes: 1000, request, clock, onTransport: state => states.push(state) })
    expect((await turn.stream.result()).stopReason).toBe('error'); expect(await turn.evidence).toBeNull()
    expect(turn.failure).toMatchObject({ code: 'UNAVAILABLE' }); expect(request).not.toHaveBeenCalled()
    expect(states.at(-1)).toMatchObject({ stage: 'ended', reason: 'request-limit', bytes: 0 }); expect(clock.timers.size).toBe(0)
  })
  it('survives receiving comments and incomplete fragments past old deadlines and SDK defaults', async () => {
    const source = controlled(), run = start(source.body)
    await flushMicrotasks()
    for (let i = 0; i < 8; i++) { run.clock.advance(100_000); source.write(i % 2 ? 'beat\r\n\r\n' : ': heart'); await flushMicrotasks() }
    source.write(frame({ type: 'response.output_text.delta', delta: 'PRIVATE_REPLY' }) + completion); source.end()
    expect(await run.done).toContain('done'); expect(run.turn.accepted).toBe(true)
    expect(run.request).toHaveBeenCalledTimes(1); expect(run.clock.timers.size).toBe(0)
    expect(JSON.stringify(run.states)).not.toMatch(/PRIVATE_/)
  })
  it('silence after completed and DONE still expires; local/empty activity cannot reset it', async () => {
    const source = controlled(), run = start(source.body)
    await flushMicrotasks(); source.write(completion + 'data: [DONE]\n\n'); await flushMicrotasks()
    run.clock.advance(179_999); source.empty(); await flushMicrotasks(); run.clock.advance(1)
    expect(await run.done).toContain('error'); expect(run.turn.failure).toMatchObject({ code: 'NETWORK' })
    expect(run.states.at(-1)).toMatchObject({ reason: 'network-idle' }); expect(source.cancel).toHaveBeenCalledTimes(1); expect(run.clock.timers.size).toBe(0)
  })
  it('headers reset once; headers without bytes and no headers remain bounded', async () => {
    const clock = new FakeMonotonicClock(), idle = vi.fn(), states: TransportState[] = []
    const live = new PiStreamLiveness({ turn: 1, clock, onIdle: idle, onState: state => states.push(state) })
    clock.advance(179_000); live.headers(); clock.advance(179_000); live.headers(); live.received(0)
    expect(idle).not.toHaveBeenCalled(); clock.advance(1000); expect(idle).toHaveBeenCalledTimes(1)
    expect(states.some(state => state.waiting)).toBe(true); live.stop('network-idle'); expect(clock.timers.size).toBe(0)
    const second = new PiStreamLiveness({ turn: 2, clock, onIdle: idle }); clock.advance(180_000)
    expect(idle).toHaveBeenCalledTimes(2); second.stop('network-idle')
  })
  it('a completed turn disarms while local work runs, and the next turn has a fresh interval', async () => {
    const clock = new FakeMonotonicClock(), first = controlled(), run = start(first.body, clock)
    await flushMicrotasks(); first.write(completion); first.end(); await run.done
    clock.advance(900_000); expect(clock.timers.size).toBe(0)
    const second = controlled(), next = start(second.body, clock)
    await flushMicrotasks(); clock.advance(179_000); second.write(': still alive\n\n'); await flushMicrotasks(); clock.advance(179_000)
    second.write(completion); second.end(); expect(await next.done).toContain('done')
  })
  it.each([
    ['data: [DONE]\n\n' + frame({ type: 'response.failed', response: { error: { code: 'subscription_sharing_usage_limit_exceeded', message: 'PRIVATE_SECRET' } } }), 'USAGE_LIMIT'],
    ['event: error\ndata: {"code":"model_not_found","message":"PRIVATE_SECRET"}\n\n', 'UNAVAILABLE'],
    [frame({ error: { code: 'model_not_found', message: 'PRIVATE_SECRET' } }), 'UNAVAILABLE'],
    ['data: broken-json\n\n', 'NETWORK'], [frame({ foo: 1 }), 'NETWORK'], [frame({ type: 3 }), 'NETWORK']
  ])('rejects an unsafe post-completion tail (%s)', async (tail, code) => {
    const run = start(new Response(completion + tail).body!)
    expect(await run.done).toContain('error'); expect(run.turn.failure).toMatchObject({ code }); expect(run.turn.accepted).toBe(false)
    expect(run.turn.failure!.message).not.toContain('PRIVATE_SECRET'); expect(run.clock.timers.size).toBe(0)
  })
  it('aborts SDK-only protocol failure before an open receiving tail can strand the turn', async () => {
    const source = controlled(), run = start(source.body)
    await flushMicrotasks(); source.write(frame({ type: 'response.created' }) + completion + 'data: [DONE]\n\n: heartbeat\n\n')
    expect(await run.done).toContain('error'); expect(run.turn.accepted).toBe(false); expect(source.cancel).toHaveBeenCalledTimes(1); expect(run.clock.timers.size).toBe(0)
  })
  it('counts/caps bytes after DONE and cancels every branch', async () => {
    const source = controlled(), run = start(source.body, undefined, undefined, 500)
    await flushMicrotasks(); source.write(completion + 'data: [DONE]\n\n' + ':' + 'x'.repeat(600)); await flushMicrotasks()
    expect(await run.done).toContain('error'); expect(run.turn.failure).toMatchObject({ code: 'UNAVAILABLE' }); expect(source.cancel).toHaveBeenCalledTimes(1)
    expect(run.states.at(-1)?.reason).toBe('response-limit')
  })
  it('cleans a response that arrives immediately before synchronous cancellation', async () => {
    const source = controlled(), clock = new FakeMonotonicClock(), controller = new AbortController()
    let resolve!: (response: Response) => void
    const request = vi.fn<typeof fetch>(() => new Promise<Response>(done => { resolve = done }))
    const turn = streamPiTurn(model, { messages: [] }, { accessToken: 'PRIVATE_TOKEN', signal: controller.signal, turn: 1, maximumResponseBytes: 1000, clock, request })
    await flushMicrotasks(); resolve(new Response(source.body)); controller.abort()
    const result = await turn.stream.result(); await turn.evidence
    expect(result.stopReason).toBe('aborted'); expect(source.cancel).toHaveBeenCalledTimes(1); expect(clock.timers.size).toBe(0)
  })
  it('preserves delayed non-OK error-code classification without retaining its text', async () => {
    const source = controlled(), clock = new FakeMonotonicClock(), request = vi.fn<typeof fetch>(async () => new Response(source.body, { status: 403 }))
    const turn = streamPiTurn(model, { messages: [] }, { accessToken: 'PRIVATE_TOKEN', signal: new AbortController().signal, turn: 1, maximumResponseBytes: 1000, clock, request })
    await flushMicrotasks(); clock.advance(100_000); source.write('{"error":{"code":"subscription_sharing_usage_limit_exceeded","message":"PRIVATE_SECRET"}}'); source.end()
    expect((await turn.stream.result()).stopReason).toBe('error'); const evidence = await turn.evidence
    expect(turn.failure).toMatchObject({ code: 'USAGE_LIMIT' }); expect(evidence?.providerCode).toBe('subscription_sharing_usage_limit_exceeded'); expect(clock.timers.size).toBe(0)
  })
  it('supports fixed tool-free private proof with delta-only and final-only evidence', async () => {
    for (const body of [frame({ type: 'response.output_text.delta', delta: 'PRIVATE_REPLY' }) + completion,
      frame({ type: 'response.completed', response: { status: 'completed', model: 'gpt-6.1-sol', output: [{ type: 'message', content: [{ type: 'output_text', text: 'PRIVATE_REPLY' }] }] } })]) {
      const request = vi.fn<typeof fetch>(async () => new Response(body, { headers: { 'content-type': 'text/event-stream' } }))
      const evidence = await runModelAccessProfile({ target: 'gpt-6.1-sol', accessToken: 'PRIVATE_TOKEN', baseUrl: model.baseUrl }, { signal: new AbortController().signal, request })
      expect(evidence.hasStreamedText || evidence.hasFinalText).toBe(true); expect(evidence.returnedModel).toBe('gpt-6.1-sol'); expect(evidence.cleanEof).toBe(true)
      const payload = JSON.parse(request.mock.calls[0]![1]!.body as string)
      expect(Object.keys(payload).sort()).toEqual(['input', 'model', 'store', 'stream']); expect(JSON.stringify(evidence)).not.toMatch(/PRIVATE_/)
    }
  })
})
