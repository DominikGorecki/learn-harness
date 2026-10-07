import { expect, test } from '../flows/fixture'
import type { ElectronApplication } from '@playwright/test'
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'
import type { WorkerReply } from '../../src/main/generation/worker-protocol'
import type { WorkerProfile } from '../../src/main/generation/worker-protocol'
import type { ImageAuthorization, DecodedImage, ImageTerminal } from '../../src/main/generation/image-worker-contract'
import { startImageFixture } from '../fixtures/image-provider'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { startChapterFixture } from '../fixtures/chapter-provider'
import { learningOutline } from '../fixtures/learning-outline'
import type { TopicContentCheckpoint } from '../../src/shared/topic-content'

test('packaged ASAR worker runs outline, fixed diagnostics, image and guided chapter profiles', { tag: '@packaged-worker', annotation: { type: 'flow', description: 'packaged-worker' } }, async ({ playwright }) => {
  const asar = process.env.EDU_PACKAGED_WORKER_ASAR
  test.skip(!asar, 'Run npm run test:packaged after packaging to test the current artifact explicitly.')
  const fixture = await startChatGPTFixture({ inferenceMode: 'materials' })
  const images = await startImageFixture()
  const chapterFixture = await startChapterFixture()
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
    const run = (profile: WorkerProfile, authority?: ImageAuthorization) => desktop!.evaluate(async ({ utilityProcess }, input) => new Promise<{ terminal: WorkerReply; pid: number | null; exitCode: number; envKeys: string[]; imageDigest: string | null; billing: ImageTerminal | null }>((resolve, reject) => {
      const workerEnv = Object.fromEntries(['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'LC_ALL', 'SSL_CERT_FILE', 'SSL_CERT_DIR']
        .flatMap(key => process.env[key] ? [[key, process.env[key]!]] : []))
      const worker = utilityProcess.fork(input.workerPath, [], { env: workerEnv, stdio: 'ignore' })
      let pid: number | null = null
      let stopping = false, terminal: WorkerReply | undefined, failure: Error | undefined
      let pending = Promise.resolve(), requestId: string | null = null, imageDigest: string | null = null, billing: ImageTerminal | null = null
      let checkpoint: TopicContentCheckpoint | null = null, turns = 0
      const persist = async (name: string, bytes: Uint8Array | string) => {
        const fs = process.getBuiltinModule('fs/promises') as typeof import('node:fs/promises'), file = await fs.open(input.auditDirectory + '/' + name, 'wx')
        try { await file.writeFile(bytes); await file.sync() } finally { await file.close() }
      }
      const finish = (message?: WorkerReply, error?: Error) => {
        if (stopping) return
        stopping = true; terminal = message; failure = error; clearTimeout(timeout); worker.kill()
      }
      const timeout = setTimeout(() => finish(undefined, new Error('Packaged worker timed out')), 30_000)
      worker.once('spawn', () => { pid = worker.pid ?? null; worker.postMessage({ type: 'start', ...input.profile }) })
      worker.on('message', (message: WorkerReply) => {
        if (message.type === 'chapter-submission') {
          if (input.profile.profile !== 'chapter') { finish(undefined, new Error('Wrong packaged chapter profile')); return }
          const source = input.profile.input, submission = message.submission
          pending = pending.then(async () => {
            await persist(`chapter-${message.sequence}.json`, JSON.stringify(submission))
            if (submission.kind === 'turn') { turns++; if (checkpoint) { checkpoint.textTurns = turns; checkpoint.activationTextTurns = turns } }
            else if (submission.kind === 'plan') checkpoint = { schemaVersion: 1, projectId: source.projectId, topicId: source.topicId, chapterId: source.chapterId, revisionId: 'packaged-revision', runId: 'packaged-run', checkpointRevision: 1, mode: 'text-only', status: 'working', outputDirectory: `beliefs/content/${source.chapterId}/packaged-revision`, plan: submission.plan,
              sections: [], introduction: null, synthesis: null, sourceNotes: [], images: submission.plan.images.map(image => ({ imageId: image.id, status: 'planned', callId: null, asset: null })),
              baseline: { topicDigest: 'a'.repeat(64), learningContextDigest: 'a'.repeat(64), sources: [], expectedManifestDigest: null }, provenance: { runId: 'packaged-run', textModelId: source.model.id, imageModelId: null, createdAt: new Date().toISOString() },
              textTurns: turns, imageRequests: 0, activationTextTurns: turns, activationImageRequests: 0, updatedAt: new Date().toISOString() }
            else if (submission.kind === 'section' && checkpoint) checkpoint.sections.push(submission.section)
            else if (submission.kind === 'summary' && checkpoint) { checkpoint.introduction = submission.introduction; checkpoint.synthesis = submission.synthesis; checkpoint.sourceNotes = submission.sourceNotes }
            worker.postMessage({ type: 'chapter-ack', requestId: message.requestId, accepted: true, checkpoint })
          })
        } else if (message.type === 'image-intent') {
          if (!input.authority || requestId || message.imageSlotId !== input.authority.imageSlotId) { finish(undefined, new Error('Invalid packaged image intent')); return }
          requestId = message.requestId
          pending = pending.then(async () => { await persist('intent.json', JSON.stringify({ callId: input.authority!.callId, slot: message.imageSlotId })); worker.postMessage({ type: 'image-authorized', requestId, authority: input.authority }) })
        } else if (message.type === 'image-terminal') {
          if (!input.authority || message.requestId !== requestId || message.callId !== input.authority.callId || billing) { finish(undefined, new Error('Invalid packaged billing')); return }
          billing = message.terminal
          pending = pending.then(async () => { await persist('terminal.json', JSON.stringify(billing)); worker.postMessage({ type: 'image-terminal-ack', requestId, callId: message.callId, accepted: true }) })
        } else if (message.type === 'image-asset') {
          const image: DecodedImage = message.image
          if (!billing || message.requestId !== requestId || !input.authority || image.callId !== input.authority.callId || !(image.bytes instanceof Uint8Array) || image.bytes.byteLength > 16 * 1024 * 1024 || Object.keys(image).some(key => !['kind', 'callId', 'imageSlotId', 'bytes', 'mime', 'width', 'height', 'digest'].includes(key))) { finish(undefined, new Error('Invalid packaged illustration')); return }
          imageDigest = image.digest
          pending = pending.then(async () => { await persist('accepted.png', image.bytes); worker.postMessage({ type: 'image-asset-ack', requestId, callId: image.callId, accepted: true }) })
        } else if (message.type === 'result' || message.type === 'error') finish(message)
        void pending.catch(() => finish(undefined, new Error('Packaged accounting write failed')))
      })
      worker.on('error', () => finish(undefined, new Error('Packaged worker could not start or continue')))
      worker.once('exit', exitCode => {
        clearTimeout(timeout); worker.removeAllListeners()
        void pending.then(() => {
          if (failure) reject(failure)
          else if (terminal) resolve({ terminal, pid, exitCode, envKeys: Object.keys(workerEnv), imageDigest, billing })
          else reject(new Error('Packaged worker exited before completing'))
        }, reject)
      })
    }), { workerPath: join(asar!, 'out/main/outline-worker.js'), profile, authority, auditDirectory: root })
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
    const image = await run({ profile: 'fixed-image', input: { imageSlotId: 'packaged-slot' } }, { callId: 'packaged-call', imageSlotId: 'packaged-slot', key: 'packaged-fixture-key', connectionEpoch: 'packaged-epoch', modelId: 'openai/gpt-image-2', baseUrl: images.baseUrl, prompt: 'Fixture illustration', settings: { n: 1, aspectRatio: '1:1' }, provider: { only: ['fixture-provider'], allow_fallbacks: false } })
    expect(image.terminal).toMatchObject({ type: 'result', profile: 'fixed-image', result: { kind: 'image', callId: 'packaged-call' } })
    expect(image.billing?.cost).toMatchObject({ kind: 'known', usd: '0.04500000000000001' }); expect(images.requests).toHaveLength(1)
    expect(await readFile(join(root, 'accepted.png'))).toEqual(images.png)
    expect(image.imageDigest).toBe(createHash('sha256').update(images.png).digest('hex'))
    results.push(image)
    const chapter = await run({ profile: 'chapter', input: { model: { id: 'fixture-model', name: 'Fixture model' }, accessToken: 'fixture-access', baseUrl: `${chapterFixture.baseUrl}/v1`, path: project, brief: 'Reason about beliefs.',
      outline: learningOutline(), topicId: 'beliefs', projectId: 'portable-project', chapterId: 'packaged-chapter', checkpoint: null, settings: null, excludedSourcePaths: [] } })
    expect(chapter.terminal).toMatchObject({ type: 'result', profile: 'chapter', result: { kind: 'chapter', paused: false } })
    expect(chapterFixture.inferenceRequests).toHaveLength(5)
    expect(JSON.stringify(chapterFixture.inferenceRequests[0])).toContain('Educational illustration guidance v1')
    expect(JSON.stringify(chapterFixture.inferenceRequests[0])).toContain('generate_topic_image')
    expect(JSON.stringify(chapterFixture.inferenceRequests[0])).not.toContain('write_project_file')
    results.push(chapter)
    for (const completed of results) {
      expect(completed.exitCode).toBe(0)
      expect(completed.envKeys.every(key => ['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'LC_ALL', 'SSL_CERT_FILE', 'SSL_CERT_DIR'].includes(key))).toBe(true)
      expect(completed.pid).toBeGreaterThan(0)
      expect(await desktop.evaluate((_, pid) => { try { process.kill(pid!, 0); return true } catch { return false } }, completed.pid)).toBe(false)
    }
  } finally { await desktop?.close(); await fixture.close(); await images.close(); await chapterFixture.close(); await rm(root, { recursive: true, force: true }) }
})
