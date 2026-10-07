import { expect, test } from '../flows/fixture'
import { build } from 'vite'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { ElectronApplication } from '@playwright/test'
import { startImageFixture } from '../fixtures/image-provider'
import type { runImageWorkerFixture } from '../fixtures/image-worker-harness'

type State = Awaited<ReturnType<typeof runImageWorkerFixture>>
interface Globals { imageFixture?: State; imageExit?: { held: boolean; release(): void } }
test('image utility awaits durable authority, terminal billing, assets and actual exit across real buffered waits', { tag: '@image-worker', annotation: { type: 'flow', description: 'image-worker' } }, async ({ playwright }) => {
  test.setTimeout(600_000)
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-image-worker-'))), harness = resolve('out/main/image-test-harness.mjs'), fixture = await startImageFixture()
  let desktop: ElectronApplication | undefined
  try {
    // This test-only bundle loads the real runPiWorker/service/ledger. Remove it
    // before package so no fixture entry is shipped in the application.
    await build({ configFile: false, logLevel: 'error', build: { ssr: resolve('tests/fixtures/image-worker-harness.ts'), target: 'node24', emptyOutDir: false, outDir: 'out/main', rollupOptions: { external: ['electron', 'sharp', '@earendil-works/pi-ai', '@earendil-works/pi-agent-core'], output: { entryFileNames: 'image-test-harness.mjs' } } } })
    const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env, EDU_HARNESS_TEST_DATA_DIR: join(root, 'host') } }); await desktop.firstWindow()
    const start = async (name: string, failure?: 'intent' | 'checkpoint' | 'terminal', hold?: 'terminal') => {
      const directory = join(root, name); await mkdir(directory)
      await desktop!.evaluate(async (_, input) => { const modules = process.getBuiltinModule('module') as typeof import('node:module'); const module = modules.createRequire(input.module)(input.module) as { runImageWorkerFixture: typeof runImageWorkerFixture }; (globalThis as Globals).imageFixture = await module.runImageWorkerFixture(input) }, { module: harness, directory, baseUrl: fixture.baseUrl, failure, hold })
      return directory
    }
    const state = () => desktop!.evaluate(() => { const value = (globalThis as Globals).imageFixture!; return { held: value.held, settled: value.settled, exited: value.exited, accepted: value.accepted, pid: value.pid, error: value.error, firstByteAt: value.firstByteAt, endedAt: value.endedAt, health: value.health, waitingHint: value.waitingHint, resultDigest: value.resultDigest } })
    const finish = async () => { await expect.poll(async () => (await state()).settled, { timeout: 30_000 }).toBe(true); return state() }
    const imageCount = () => fixture.requests.filter(request => request.path === '/api/v1/images').length
    const directory = await start('success'), completed = await finish()
    expect(completed).toMatchObject({ accepted: true, exited: true, error: null }); expect(imageCount()).toBe(1)
    expect(await readFile(join(directory, 'accepted.png'))).toEqual(fixture.png)
    expect(completed.resultDigest).toBe(createHash('sha256').update(fixture.png).digest('hex'))
    expect(fixture.requests.find(request => request.path === '/api/v1/images')).toMatchObject({ authorization: 'Bearer fixture-image-key', body: { model: 'openai/gpt-image-2', n: 1, aspect_ratio: '1:1', provider: { only: ['fixture-provider'], allow_fallbacks: false } } })
    expect(await desktop.evaluate(() => (globalThis as Globals).imageFixture!.calls().calls.find(call => call.intent.endpoint === 'images')?.latest)).toMatchObject({ disposition: 'checkpointed', cost: { kind: 'known', usd: '0.04500000000000001' } })
    for (const failure of ['intent', 'checkpoint', 'terminal'] as const) {
      const before = imageCount(), directory = await start(failure, failure), result = await finish()
      expect(result).toMatchObject({ accepted: false, exited: true, error: 'STORAGE' }); expect(imageCount() - before).toBe(failure === 'terminal' ? 1 : 0)
      await expect(readFile(join(directory, 'accepted.png'))).rejects.toMatchObject({ code: 'ENOENT' })
      if (failure !== 'intent') expect(await desktop.evaluate(() => (globalThis as Globals).imageFixture!.calls().calls.find(call => call.intent.endpoint === 'images')?.latest)).toBeNull()
    }
    // A valid EOF can be charged even while its terminal fsync is withheld. Real
    // process exit does not release the lease until that durable write finishes.
    await start('exit-before-accounting', undefined, 'terminal'); await expect.poll(async () => (await state()).held).toBe(true)
    await desktop.evaluate(() => (globalThis as Globals).imageFixture!.cancel())
    await expect.poll(async () => (await state()).exited, { timeout: 15_000 }).toBe(true)
    expect((await state()).settled).toBe(false); expect(await desktop.evaluate(() => (globalThis as Globals).imageFixture!.leaseProbe())).toBe('BUSY')
    await desktop.evaluate(() => (globalThis as Globals).imageFixture!.release()); expect(await finish()).toMatchObject({ error: 'CANCELLED', accepted: false })
    expect(await desktop.evaluate(() => (globalThis as Globals).imageFixture!.calls().calls.find(call => call.intent.endpoint === 'images')?.latest?.cost)).toMatchObject({ kind: 'known', usd: '0.04500000000000001' })
    // Conversely retain the genuine utility exit event after billing and asset
    // checkpointing: no fabricated exit is used to settle admission.
    await desktop.evaluate(({ utilityProcess }) => {
      const original = utilityProcess.fork
      utilityProcess.fork = function (...args) {
        const worker = original.apply(this, args); if (args[2]?.serviceName !== 'Learning illustration') return worker
        utilityProcess.fork = original; const emit = worker.emit; let actual: Parameters<typeof worker.emit> | null = null
        const gate = { held: false, release: () => { worker.emit = emit; if (actual) { const event = actual; actual = null; emit.apply(worker, event) } } }; (globalThis as Globals).imageExit = gate
        worker.emit = function (...event) { if (event[0] === 'exit') { actual = event; gate.held = true; return true }; return emit.apply(this, event) }; return worker
      }
    })
    await start('accounting-before-exit'); await expect.poll(() => desktop!.evaluate(() => (globalThis as Globals).imageExit!.held)).toBe(true)
    expect(await state()).toMatchObject({ accepted: true, exited: false, settled: false })
    expect(await desktop.evaluate(() => (globalThis as Globals).imageFixture!.leaseProbe())).toBe('BUSY')
    expect(await desktop.evaluate(() => { try { process.kill((globalThis as Globals).imageFixture!.pid!, 0); return true } catch { return false } })).toBe(false)
    await desktop.evaluate(() => (globalThis as Globals).imageExit!.release()); expect(await finish()).toMatchObject({ error: null, exited: true })
    // Real headers arrive immediately, but the first body byte arrives beyond the
    // former 180s deadline. Receiving then also spans >180s without byte-idle.
    fixture.delay(185_000); fixture.chunkEvery(30_000)
    const before = imageCount(), began = Date.now(), longDirectory = await start('long-buffered')
    await expect.poll(async () => (await state()).waitingHint, { timeout: 45_000 }).toBe(true)
    expect((await state()).accepted).toBe(false)
    await expect.poll(async () => (await state()).settled, { timeout: 500_000, intervals: [5000] }).toBe(true)
    const long = await state(); expect(long).toMatchObject({ error: null, accepted: true, exited: true }); expect(long.firstByteAt! - began).toBeGreaterThan(180_000)
    expect(long.endedAt! - long.firstByteAt!).toBeGreaterThan(180_000); expect(long.health).toBeGreaterThan(60); expect(imageCount() - before).toBe(1)
    expect(await readFile(join(longDirectory, 'accepted.png'))).toEqual(fixture.png)
    console.log('image-worker buffered evidence', JSON.stringify({ initialWaitMs: long.firstByteAt! - began, receivingMs: long.endedAt! - long.firstByteAt!, imageBytes: fixture.png.byteLength, healthFrames: long.health, imageRequests: imageCount() - before }))
  } finally {
    await desktop?.evaluate(() => { (globalThis as Globals).imageExit?.release(); (globalThis as Globals).imageFixture?.release(); (globalThis as Globals).imageFixture?.cancel() }).catch(() => {})
    await desktop?.close(); await fixture.close(); await rm(harness, { force: true }); await rm(root, { recursive: true, force: true })
  }
})
