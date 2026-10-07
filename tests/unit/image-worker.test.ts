import { EventEmitter } from 'node:events'
import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'
import { runImageProfile } from '../../src/main/generation/pi-image-profile'
import { decodeImage } from '../../src/main/generation/image-decoder'
import { ImageResponseLiveness } from '../../src/main/generation/image-response-liveness'
import { parseWorkerReply, parseWorkerRequest } from '../../src/main/generation/worker-protocol'
import type { WorkerRequest } from '../../src/main/generation/worker-protocol'
import { startPiWorker } from '../../src/main/generation/worker-lifecycle'
import type { ImageAuthorization, ImageTerminal } from '../../src/main/generation/image-worker-contract'
import { FakeMonotonicClock, flushMicrotasks } from '../fixtures/monotonic-clock'

const authority: ImageAuthorization = { callId: 'call-image', imageSlotId: 'slot-image', connectionEpoch: 'epoch-fixture', key: 'fixture-secret', modelId: 'openai/gpt-image-2', baseUrl: 'https://openrouter.ai/api/v1', prompt: 'Private illustration prompt', settings: { n: 1, aspectRatio: '1:1' }, provider: { only: ['fixture'], allow_fallbacks: false } }
const profile = { profile: 'fixed-image' as const, input: { imageSlotId: authority.imageSlotId } }
const png = () => sharp({ create: { width: 2, height: 2, channels: 4, background: '#abcdef' } }).png().toBuffer()
const terminal: ImageTerminal = { status: 'succeeded', httpStatus: 200, errorCode: null, generationId: null, returnedModelId: null, cost: { kind: 'known', usd: '0.045', source: 'response', recordedAt: '2026-10-07T00:00:00.000Z' } }
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done }); return { promise, resolve } }
class Worker extends EventEmitter {
  requests: WorkerRequest[] = []; kills = 0
  postMessage(value: WorkerRequest) { this.requests.push(value) }
  kill() { this.kills++; return true }
}
describe('sanctioned image transport and full utility decoding', () => {
  it('uses one explicit authenticated fixed route and awaits exact billing before decoding', async () => {
    const bytes = await png(), bill = deferred(), recorded: ImageTerminal[] = [], fetcher = vi.fn<typeof fetch>(async () => new Response(`{"data":[{"b64_json":"${bytes.toString('base64')}","media_type":"image/png"}],"usage":{"cost":4.500000000000001e-2}}`))
    let finished = false
    const result = runImageProfile(authority, { signal: new AbortController().signal, fetch: fetcher as typeof fetch, onTerminal: async value => { recorded.push(value); await bill.promise } }).then(value => { finished = true; return value })
    await flushMicrotasks(); expect(finished).toBe(false); expect(recorded[0]?.cost).toMatchObject({ kind: 'known', usd: '0.04500000000000001' })
    bill.resolve(); const decoded = await result
    expect(decoded).toMatchObject({ mime: 'image/png', width: 2, height: 2 }); expect(fetcher).toHaveBeenCalledTimes(1)
    expect(Object.keys(decoded).sort()).toEqual(['bytes', 'callId', 'digest', 'height', 'imageSlotId', 'kind', 'mime', 'width'])
    expect(JSON.stringify(decoded)).not.toMatch(/fixture-secret|Private illustration|openrouter\.ai|connectionEpoch/)
    const [url, init] = fetcher.mock.calls[0]!
    expect(url).toBe('https://openrouter.ai/api/v1/images'); expect(init?.redirect).toBe('manual'); expect(init?.headers).toMatchObject({ Authorization: 'Bearer fixture-secret' })
    expect(JSON.parse(init!.body as string)).toEqual({ model: authority.modelId, prompt: authority.prompt, n: 1, aspect_ratio: '1:1', provider: authority.provider })
  })
  it('accepts valid pixels with unknown cost when the exact reported amount is outside supported precision', async () => {
    const bytes = await png(), records: ImageTerminal[] = []
    expect(await runImageProfile(authority, { signal: new AbortController().signal, fetch: vi.fn(async () => new Response(`{"data":[{"b64_json":"${bytes.toString('base64')}"}],"usage":{"cost":1e-19}}`)) as typeof fetch,
      onTerminal: async value => { records.push(value) } })).toMatchObject({ mime: 'image/png' })
    expect(records[0]?.cost).toEqual({ kind: 'unknown' })
  })
  it.each(['mismatch', 'bad-pixels', 'two-images', 'wrong-media', 'cancel-after-eof'])('retains reported cost when rejecting %s', async mode => {
    const bytes = await png(), controller = new AbortController(), records: ImageTerminal[] = []
    const payload = { data: [{ b64_json: (mode === 'bad-pixels' ? Buffer.from('invalid') : bytes).toString('base64'), media_type: mode === 'wrong-media' ? 'image/jpeg' : 'image/png' }], usage: { cost: '0.125' }, ...(mode === 'mismatch' ? { model: 'google/gemini-3.1-flash-image' } : {}) }
    if (mode === 'two-images') payload.data.push(payload.data[0]!)
    await expect(runImageProfile(authority, { signal: controller.signal, fetch: vi.fn(async () => new Response(JSON.stringify(payload))) as typeof fetch,
      onTerminal: async value => { records.push(value); if (mode === 'cancel-after-eof') controller.abort() } })).rejects.toBeDefined()
    expect(records).toHaveLength(1); expect(records[0]?.cost).toMatchObject({ kind: 'known', usd: '0.125' })
  })
  it('cannot accept bytes after terminal persistence failure and never retries', async () => {
    const bytes = await png(), fetcher = vi.fn(async () => new Response(JSON.stringify({ data: [{ b64_json: bytes.toString('base64') }], usage: { cost: '0.045' } })))
    await expect(runImageProfile(authority, { signal: new AbortController().signal, fetch: fetcher as typeof fetch, onTerminal: async () => { throw new Error('write failed') } })).rejects.toMatchObject({ code: 'STORAGE' })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each([[401, 'AUTH_REQUIRED'], [402, 'USAGE_LIMIT'], [403, 'ACCESS_RESTRICTED'], [429, 'USAGE_LIMIT']] as const)('categorizes non-JSON HTTP %i safely', async (status, code) => {
    const records: ImageTerminal[] = []
    await expect(runImageProfile(authority, { signal: new AbortController().signal, fetch: vi.fn(async () => new Response('private provider error', { status })) as typeof fetch, onTerminal: async value => { records.push(value) } })).rejects.toMatchObject({ code })
    expect(records[0]).toMatchObject({ httpStatus: status, errorCode: code, cost: { kind: 'unknown' } })
  })
  it('retains exact cost from a complete provider error JSON', async () => {
    const records: ImageTerminal[] = []
    await expect(runImageProfile(authority, { signal: new AbortController().signal, fetch: vi.fn(async () => new Response('{"usage":{"cost":0.125},"error":{"message":"private"}}', { status: 429 })) as typeof fetch, onTerminal: async value => { records.push(value) } })).rejects.toMatchObject({ code: 'USAGE_LIMIT' })
    expect(records[0]?.cost).toMatchObject({ kind: 'known', usd: '0.125' }); expect(JSON.stringify(records)).not.toContain('private')
  })
  it.each(['trailing', 'truncated', 'oversized', 'redirect', 'unauthorized'])('rejects %s without replay', async mode => {
    const records: ImageTerminal[] = [], bytes = await png(), valid = JSON.stringify({ data: [{ b64_json: bytes.toString('base64') }] })
    const fetcher = vi.fn(async () => new Response(mode === 'trailing' ? valid + '{}' : mode === 'truncated' ? valid.slice(0, -1) : valid, { status: mode === 'redirect' ? 302 : mode === 'unauthorized' ? 401 : 200, headers: mode === 'oversized' ? { 'content-length': '33554433' } : {} }))
    await expect(runImageProfile(authority, { signal: new AbortController().signal, fetch: fetcher as typeof fetch, onTerminal: async value => { records.push(value) } })).rejects.toBeDefined()
    expect(fetcher).toHaveBeenCalledTimes(1); expect(records).toHaveLength(1); expect(records[0]?.status).toBe('failed')
    if (mode === 'unauthorized') expect(records[0]?.errorCode).toBe('AUTH_REQUIRED')
  })
  it('fully decodes PNG, JPEG and WebP; rejects corrupt compressed pixels with valid headers', async () => {
    for (const format of ['png', 'jpeg', 'webp'] as const) {
      const bytes = await sharp({ create: { width: 3, height: 2, channels: 3, background: '#ff0000' } })[format]().toBuffer()
      expect(await decodeImage(bytes, authority)).toMatchObject({ width: 3, height: 2, mime: 'image/' + format })
    }
    const bytes = await png(), corrupt = Buffer.from(bytes), offset = corrupt.indexOf('IDAT') + 4
    corrupt[offset] = 0
    await expect(decodeImage(corrupt, authority)).rejects.toMatchObject({ code: 'UNAVAILABLE' })
  })
  it('waits 300 seconds for first body bytes then only measures byte inactivity, with no total deadline', () => {
    const clock = new FakeMonotonicClock(), timeout = vi.fn(), state = vi.fn(), live = new ImageResponseLiveness({ clock, onTimeout: timeout, onState: state })
    clock.advance(299_000); expect(timeout).not.toHaveBeenCalled(); expect(state.mock.calls.some(([value]) => value.waiting)).toBe(true)
    live.received(2)
    for (let i = 0; i < 10; i++) { clock.advance(59_000); live.received(1) }
    expect(timeout).not.toHaveBeenCalled(); clock.advance(60_000); expect(timeout).toHaveBeenCalledOnce(); live.end('network-idle'); expect(clock.timers.size).toBe(0)
  })
  it('empty bytes and non-network work cannot extend first-byte deadline; ending stops timers', () => {
    const clock = new FakeMonotonicClock(), timeout = vi.fn(), live = new ImageResponseLiveness({ clock, onTimeout: timeout })
    clock.advance(299_000); live.received(0); clock.advance(1000); expect(timeout).toHaveBeenCalledOnce()
    live.end('completed'); clock.advance(1_000_000); expect(timeout).toHaveBeenCalledOnce(); expect(clock.timers.size).toBe(0)
  })
  it('projects fractional monotonic ages as protocol-safe nonnegative integers', () => {
    const clock = new FakeMonotonicClock(), state = vi.fn(), live = new ImageResponseLiveness({ clock, onTimeout: () => {}, onState: state })
    clock.advance(1.125); live.received(1); clock.advance(1.375); live.end('completed')
    for (const [value] of state.mock.calls) expect(() => parseWorkerReply({ type: 'transport', sequence: 1, state: value }, profile)).not.toThrow()
    expect(state.mock.calls.at(-1)?.[0].lastByteAgeMs).toBe(1)
  })
  it('rejects start frames carrying ACK fields instead of silently ignoring them', () => {
    expect(() => parseWorkerRequest({ type: 'start', ...profile, requestId: 'unsolicited' })).toThrow()
  })
  it('rejects hostile binary types/limits without JSON serialization and denies private frames to old profiles', async () => {
    const bytes = await png(), image = await decodeImage(bytes, authority), frame = { type: 'image-asset', sequence: 1, requestId: 'request-image', image }
    expect(parseWorkerReply(frame, profile)).toMatchObject({ type: 'image-asset' })
    const bomb = new Uint8Array(16 * 1024 * 1024 + 1); Object.defineProperty(bomb, 'toJSON', { value: () => { throw new Error('must not stringify') } })
    expect(() => parseWorkerReply({ ...frame, image: { ...image, bytes: bomb } }, profile)).toThrow()
    expect(() => parseWorkerReply({ ...frame, image: { ...image, bytes: [] } }, profile)).toThrow()
    expect(() => parseWorkerReply(frame, { profile: 'model-access', input: { target: 'gpt-6-luna', accessToken: 'fixture', baseUrl: 'fixture' } })).toThrow()
  })
})

describe('awaited private image process barriers', () => {
  async function setup() {
    const worker = new Worker(), controller = new AbortController(), clock = new FakeMonotonicClock(), billing = deferred(), asset = deferred(), calls: string[] = []
    const image = await decodeImage(await png(), authority)
    const task = startPiWorker(profile, { signal: controller.signal, clock, onImageIntent: async () => authority,
      onImageTerminal: async () => { calls.push('billing'); await billing.promise }, onImageAsset: async () => { calls.push('asset'); await asset.promise } }, () => worker)
    worker.emit('spawn'); worker.emit('message', { type: 'image-intent', sequence: 1, requestId: 'request-image', imageSlotId: authority.imageSlotId }); await flushMicrotasks()
    return { worker, controller, task, billing, asset, image, calls }
  }
  it('awaits terminal, asset acceptance and actual exit independently', async () => {
    const { worker, task, billing, asset, image, calls } = await setup(), settled = vi.fn(); void task.result.then(settled)
    worker.emit('message', { type: 'image-terminal', sequence: 2, requestId: 'request-image', callId: authority.callId, terminal }); await flushMicrotasks()
    expect(worker.requests.at(-1)?.type).toBe('image-authorized'); billing.resolve(); await flushMicrotasks(); expect(worker.requests.at(-1)?.type).toBe('image-terminal-ack')
    worker.emit('message', { type: 'image-asset', sequence: 3, requestId: 'request-image', image }); await flushMicrotasks(); expect(calls).toEqual(['billing', 'asset'])
    asset.resolve(); await flushMicrotasks(); expect(worker.requests.at(-1)?.type).toBe('image-asset-ack')
    worker.emit('message', { type: 'result', sequence: 4, profile: 'fixed-image', result: { kind: 'image', callId: authority.callId, imageSlotId: authority.imageSlotId } }); await flushMicrotasks()
    expect(settled).not.toHaveBeenCalled(); worker.emit('exit', 0); expect(await task.result).toMatchObject({ kind: 'image' })
  })
  it.each(['exit-first', 'write-first'])('cancellation retains late authorized billing and settles only after %s barriers', async order => {
    const { worker, controller, task, billing, image, calls } = await setup(), settled = vi.fn(); void task.result.catch(settled)
    controller.abort()
    worker.emit('message', { type: 'image-terminal', sequence: 2, requestId: 'request-image', callId: authority.callId, terminal })
    worker.emit('message', { type: 'image-asset', sequence: 3, requestId: 'request-image', image }); await flushMicrotasks(); expect(calls).toEqual(['billing'])
    if (order === 'exit-first') worker.emit('exit', 0); else billing.resolve()
    await flushMicrotasks(); expect(settled).not.toHaveBeenCalled()
    if (order === 'exit-first') billing.resolve(); else worker.emit('exit', 0)
    await expect(task.result).rejects.toMatchObject({ code: 'CANCELLED' })
  })
  it('rejects premature assets and duplicate intents without invoking asset storage', async () => {
    const { worker, task, image, calls } = await setup()
    worker.emit('message', { type: 'image-asset', sequence: 2, requestId: 'request-image', image }); worker.emit('exit', 0)
    await expect(task.result).rejects.toMatchObject({ code: 'INTERNAL' }); expect(calls).toEqual([])
    const next = await setup(); next.worker.emit('message', { type: 'image-intent', sequence: 2, requestId: 'other', imageSlotId: authority.imageSlotId }); next.worker.emit('exit', 0)
    await expect(next.task.result).rejects.toMatchObject({ code: 'INTERNAL' })
  })
})
