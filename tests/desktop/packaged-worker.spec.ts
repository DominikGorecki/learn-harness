import { expect, test } from '../flows/fixture'
import type { ElectronApplication } from '@playwright/test'
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'
import type { WorkerReply } from '../../src/main/generation/worker-protocol'

test('packaged ASAR worker loads its Pi dependencies and reads only scoped material', { tag: '@packaged-worker', annotation: { type: 'flow', description: 'packaged-worker' } }, async ({ playwright }) => {
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
    const result = await desktop.evaluate(async ({ utilityProcess }, input) => new Promise<WorkerReply>((resolve, reject) => {
      const workerEnv = Object.fromEntries(['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'LC_ALL', 'SSL_CERT_FILE', 'SSL_CERT_DIR']
        .flatMap(key => process.env[key] ? [[key, process.env[key]!]] : []))
      const worker = utilityProcess.fork(input.workerPath, [], { env: workerEnv, stdio: 'ignore' })
      let stopping = false, terminal: WorkerReply | undefined, failure: Error | undefined
      const finish = (message?: WorkerReply, error?: Error) => {
        if (stopping) return
        stopping = true; terminal = message; failure = error; clearTimeout(timeout); worker.kill()
      }
      const timeout = setTimeout(() => finish(undefined, new Error('Packaged worker timed out')), 15_000)
      worker.once('spawn', () => worker.postMessage({ type: 'start', profile: 'outline', input: { model: { id: 'fixture-model', name: 'Fixture model' }, accessToken: 'fixture-access',
        baseUrl: input.baseUrl, brief: '', path: input.project } }))
      worker.on('message', (message: WorkerReply) => { if (message.type === 'result' || message.type === 'error') finish(message) })
      worker.on('error', () => finish(undefined, new Error('Packaged worker could not start or continue')))
      worker.once('exit', () => {
        clearTimeout(timeout); worker.removeAllListeners()
        if (failure) reject(failure)
        else if (terminal) resolve(terminal)
        else reject(new Error('Packaged worker exited before completing'))
      })
    }), { workerPath: join(asar!, 'out/main/outline-worker.js'), baseUrl: `${fixture.baseUrl}/v1`, project })
    expect(result).toMatchObject({ type: 'result', profile: 'outline', result: { kind: 'outline', document: { title: 'Bayesian reasoning' }, coverage: { files: [{ path: 'notes.md', status: 'read' }] } } })
    expect(fixture.inferenceRequests).toHaveLength(3)
  } finally { await desktop?.close(); await fixture.close(); await rm(root, { recursive: true, force: true }) }
})
