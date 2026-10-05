import { expect, test } from '../flows/fixture'
import type { ElectronApplication } from '@playwright/test'
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'
import type { WorkerReply } from '../../src/main/generation/worker-protocol'
import type { WorkerProfile } from '../../src/main/generation/worker-protocol'

test('packaged ASAR worker runs scoped outline and both fixed tool-free diagnostic profiles', { tag: '@packaged-worker', annotation: { type: 'flow', description: 'packaged-worker' } }, async ({ playwright }) => {
  const asar = process.env.EDU_PACKAGED_WORKER_ASAR
  test.skip(!asar, 'Run npm run test:packaged after packaging to test the current artifact explicitly.')
  const fixture = await startChatGPTFixture({ inferenceMode: 'materials' })
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-asar-worker-')))
  const project = join(root, 'project'); await mkdir(project)
  await writeFile(join(project, 'notes.md'), '# Bayesian reasoning\nPriors and evidence.')
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  let desktop: ElectronApplication | undefined
  try {
    // The development host allows automation; the utility entry and every Pi
    // runtime dependency load from the actual packaged ASAR. Hardened app startup
    // is verified separately without disabling production fuses.
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env, EDU_HARNESS_TEST_DATA_DIR: join(root, 'profile') } })
    await desktop.firstWindow()
    const run = (profile: WorkerProfile) => desktop!.evaluate(async ({ utilityProcess }, input) => new Promise<{ terminal: WorkerReply; pid: number | null; exitCode: number; envKeys: string[] }>((resolve, reject) => {
      const workerEnv = Object.fromEntries(['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'LC_ALL', 'SSL_CERT_FILE', 'SSL_CERT_DIR']
        .flatMap(key => process.env[key] ? [[key, process.env[key]!]] : []))
      const worker = utilityProcess.fork(input.workerPath, [], { env: workerEnv, stdio: 'ignore' })
      let pid: number | null = null
      let stopping = false, terminal: WorkerReply | undefined, failure: Error | undefined
      const finish = (message?: WorkerReply, error?: Error) => {
        if (stopping) return
        stopping = true; terminal = message; failure = error; clearTimeout(timeout); worker.kill()
      }
      const timeout = setTimeout(() => finish(undefined, new Error('Packaged worker timed out')), 30_000)
      worker.once('spawn', () => { pid = worker.pid ?? null; worker.postMessage({ type: 'start', ...input.profile }) })
      worker.on('message', (message: WorkerReply) => { if (message.type === 'result' || message.type === 'error') finish(message) })
      worker.on('error', () => finish(undefined, new Error('Packaged worker could not start or continue')))
      worker.once('exit', exitCode => {
        clearTimeout(timeout); worker.removeAllListeners()
        if (failure) reject(failure)
        else if (terminal) resolve({ terminal, pid, exitCode, envKeys: Object.keys(workerEnv) })
        else reject(new Error('Packaged worker exited before completing'))
      })
    }), { workerPath: join(asar!, 'out/main/outline-worker.js'), profile })
    const result = await run({ profile: 'outline', input: { model: { id: 'fixture-model', name: 'Fixture model' }, accessToken: 'fixture-access',
      baseUrl: `${fixture.baseUrl}/v1`, brief: '', path: project } })
    expect(result.terminal).toMatchObject({ type: 'result', profile: 'outline', result: { kind: 'outline', document: { title: 'Bayesian reasoning' }, coverage: { files: [{ path: 'notes.md', status: 'read' }] } } })
    expect(fixture.inferenceRequests).toHaveLength(3)
    const results = [result]
    for (const target of ['gpt-6.1-sol', 'gpt-6-luna'] as const) {
      const diagnostic = await run({ profile: 'model-access', input: { target, accessToken: 'fixture-access', baseUrl: `${fixture.baseUrl}/v1` } })
      expect(diagnostic.terminal).toMatchObject({ type: 'result', profile: 'model-access', result: {
        cleanEof: true, returnedModel: target, responseStatus: 'completed', completedEvents: 1, hasFinalText: true } })
      results.push(diagnostic)
      expect(fixture.inferenceRequests.at(-1)).toMatchObject({ model: target, stream: true, store: false })
      expect(fixture.inferenceRequests.at(-1)).not.toHaveProperty('tools')
      expect(JSON.stringify(fixture.inferenceRequests.at(-1))).not.toMatch(/notes.md|Bayesian|fixture-access/)
    }
    expect(fixture.inferenceRequests).toHaveLength(5)
    for (const completed of results) {
      expect(completed.exitCode).toBe(0)
      expect(completed.envKeys.every(key => ['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'LC_ALL', 'SSL_CERT_FILE', 'SSL_CERT_DIR'].includes(key))).toBe(true)
      expect(completed.pid).toBeGreaterThan(0)
      expect(await desktop.evaluate((_, pid) => { try { process.kill(pid!, 0); return true } catch { return false } }, completed.pid)).toBe(false)
    }
  } finally { await desktop?.close(); await fixture.close(); await rm(root, { recursive: true, force: true }) }
})
