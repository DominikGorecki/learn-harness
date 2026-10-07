import { expect, test } from '../flows/fixture'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { topicContentProject, contentManifest, topicPng } from '../fixtures/topic-content'
import { startChapterFixture } from '../fixtures/chapter-provider'
import { startImageFixture } from '../fixtures/image-provider'
import { holdChapterExit, holdImageExit, barrierState, releaseBarrier } from '../fixtures/desktop-ai-barriers'
import { imageWriteGate, writeGateState, releaseWriteGate } from '../fixtures/chapter-write-barriers'
import { topicMediaUrl } from '../../src/shared/topic-content-media'
import { topicManifestPath } from '../../src/main/storage/topic-content-files'
import type { TopicContentSnapshot } from '../../src/shared/topic-content'
import type { AiActivitySnapshot } from '../../src/shared/ai/activity'
import type { AccountApi } from '../../src/shared/account'
import type { WorkspaceApi } from '../../src/shared/workspace'
import type { AiApi } from '../../src/shared/ai/activity'
import type { TopicChapterApi } from '../../src/shared/topic-content'
import type { OpenRouterApi } from '../../src/shared/openrouter'
declare global { interface Window { learning: AccountApi & WorkspaceApi & AiApi & TopicChapterApi & OpenRouterApi } }

const environment = () => Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
async function open(desktop: ElectronApplication, path: string): Promise<{ page: Page; projectId: string }> {
  await desktop.evaluate(({ dialog, shell }, path) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] }); shell.openExternal = async url => { await fetch(url) } }, path)
  const page = await desktop.firstWindow(), result = await page.evaluate(() => window.learning.openProject())
  if (!result.ok || !result.data.activeProject) throw new Error('Fixture project failed to open')
  return { page, projectId: result.data.activeProject.id }
}
async function settled(page: Page) { await expect.poll(async () => { const state = await page.evaluate(() => window.learning.getAiActivity()); return state.ok ? state.data.active : 'error' }, { timeout: 30_000 }).toBeNull() }

test('explicit image preflight recovers cold and stale caches without background HTTP or paid retries', { tag: '@topic-content-preflight', annotation: { type: 'flow', description: 'topic-content-preflight' } }, async ({ playwright }) => {
  test.setTimeout(180_000)
  const fixture = await startChapterFixture(), images = await startImageFixture()
  try {
    for (const scenario of ['empty', 'aged', 'fresh', 'failed', 'failure', 'no-key', 'text-only', 'cancel'] as const) {
      let root = '', desktop: ElectronApplication | undefined
      images.failMetadata(false)
      try {
        const project = await topicContentProject(value => { root = value }), profile = join(root, 'desktop-profile')
        project.document.selectedModel = { id: 'fixture-model', name: 'Learning model' }; project.document.outline!.model = project.document.selectedModel
        await writeFile(join(project.path, '.edu/project.json'), JSON.stringify(project.document)); await writeFile(join(project.path, 'notes.md'), 'Visible assumptions and observed evidence.')
        const before = await readFile(join(project.path, '.edu/project.json'))
        const launch = () => playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...environment(), EDU_HARNESS_TEST_DATA_DIR: profile, EDU_HARNESS_TEST_PROVIDER_URL: fixture.baseUrl, EDU_HARNESS_TEST_OPENROUTER_URL: images.baseUrl } })
        desktop = await launch(); let { page, projectId } = await open(desktop, project.path)
        await page.evaluate(() => window.learning.connectAccount())
        await expect.poll(async () => { const result = await page.evaluate(() => window.learning.getAccount()); return result.ok ? result.data.modelsStatus : 'error' }).toBe('ready')
        if (scenario !== 'no-key') expect(await page.evaluate(() => window.learning.saveOpenRouterKey({ key: 'sk-or-fixture-private-key' }))).toMatchObject({ ok: true })
        await desktop.close()
        const cachePath = join(profile, 'openrouter/openrouter-cache.json')
        if (['empty', 'text-only', 'cancel', 'failure'].includes(scenario)) await rm(cachePath)
        if (scenario === 'aged') {
          const cache = JSON.parse(await readFile(cachePath, 'utf8'))
          for (const model of cache.models) model.checkedAt = '2026-10-01T00:00:00Z'
          await writeFile(cachePath, JSON.stringify(cache))
        }
        const start = images.requests.length, textStart = fixture.inferenceRequests.length
        desktop = await launch(); ({ page, projectId } = await open(desktop, project.path))
        const identity = { projectId, topicId: 'beliefs' }
        await page.evaluate(async identity => { await window.learning.getOpenRouterSettings(); await window.learning.getTopicImageConfiguration({ imageCount: 2 }); await window.learning.getTopicContent(identity) }, identity)
        expect(images.requests.length, `${scenario}: startup/read/quote`).toBe(start)
        if (scenario === 'failed') {
          images.failMetadata(true)
          expect(await page.evaluate(() => window.learning.refreshOpenRouterMetadata())).toMatchObject({ ok: false })
          expect(await page.evaluate(() => window.learning.getOpenRouterSettings())).toMatchObject({ ok: true, data: { metadataStale: true, connection: 'offline' } })
          images.failMetadata(false)
        }
        if (scenario === 'failure') images.failMetadata(true)
        if (scenario === 'cancel') images.holdMetadata()
        const activationStart = images.requests.length
        if (scenario === 'cancel') {
          await page.evaluate(identity => {
            const state = globalThis as unknown as { preflightStart: Promise<unknown> }
            state.preflightStart = window.learning.generateTopicContent({ ...identity, mode: 'illustrated', replace: false, expectedRevisionId: null })
          }, identity)
          await expect.poll(() => images.requests.length).toBe(activationStart + 1)
          expect(await page.evaluate(() => window.learning.removeOpenRouterKey())).toMatchObject({ ok: false, error: { code: 'BUSY' } })
          expect(await page.evaluate(() => window.learning.setOpenRouterImageModel({ modelId: 'google/gemini-3.1-flash-image' }))).toMatchObject({ ok: false, error: { code: 'BUSY' } })
          expect(await page.evaluate(() => window.learning.testSolModel())).toMatchObject({ ok: false, error: { code: 'BUSY' } })
          await page.evaluate(async () => {
            const activity = await window.learning.getAiActivity()
            if (!activity.ok || !activity.data.active) throw new Error('Preflight ownership missing')
            ;(globalThis as unknown as { preflightCancel: Promise<unknown> }).preflightCancel = window.learning.cancelAiOperation({ operationId: activity.data.active.operationId })
          })
          expect(await page.evaluate(() => window.learning.removeOpenRouterKey())).toMatchObject({ ok: false, error: { code: 'BUSY' } })
          images.releaseMetadata()
          await page.evaluate(() => (globalThis as unknown as { preflightStart: Promise<unknown> }).preflightStart)
          expect(await page.evaluate(() => (globalThis as unknown as { preflightCancel: Promise<unknown> }).preflightCancel)).toMatchObject({ ok: true })
          await settled(page)
          expect(await page.evaluate(() => window.learning.getAiActivity())).toMatchObject({ ok: true, data: { settled: { outcome: 'cancelled' } } })
          expect(fixture.inferenceRequests).toHaveLength(textStart)
          expect(images.requests.slice(activationStart).filter(request => request.path === '/api/v1/images')).toHaveLength(0)
          expect(await page.evaluate(() => window.learning.removeOpenRouterKey())).toMatchObject({ ok: true })
        } else {
          expect(await page.evaluate(({ identity, textOnly }) => window.learning.generateTopicContent({ ...identity, mode: textOnly ? 'text-only' : 'illustrated', replace: false, expectedRevisionId: null }), { identity, textOnly: scenario === 'text-only' })).toMatchObject({ ok: true })
          await settled(page)
          const content = await page.evaluate(identity => window.learning.getTopicContent(identity), identity)
          if (!content.ok || !content.data) throw new Error(`${scenario}: Chapter missing`)
          const illustrated = ['empty', 'aged', 'fresh', 'failed'].includes(scenario)
          expect(content.data.status).toBe(illustrated ? 'illustrated' : scenario === 'text-only' ? 'text-only' : 'needs-images')
          const calls = images.requests.slice(activationStart), posts = calls.filter(request => request.path === '/api/v1/images')
          expect(posts).toHaveLength(illustrated ? 2 : 0)
          expect(calls.filter(request => request.path !== '/api/v1/images')).toHaveLength(['empty', 'aged', 'failed'].includes(scenario) ? 5 : scenario === 'failure' ? 1 : 0)
          if (illustrated) expect(await readFile(join(project.path, content.data.images[0]!.asset!.path))).toEqual(images.png)
          if (scenario === 'failure') {
            const count = fixture.inferenceRequests.length
            expect(await page.evaluate(request => window.learning.completeTopicContentImages(request), { ...identity, chapterId: content.data.identity.chapterId, revisionId: content.data.identity.revisionId })).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } })
            await settled(page); expect(fixture.inferenceRequests).toHaveLength(count)
            expect(images.requests.slice(activationStart).filter(request => request.path === '/api/v1/images')).toHaveLength(0)
            expect(await page.evaluate(() => window.learning.removeOpenRouterKey())).toMatchObject({ ok: true })
          }
        }
        expect(await readFile(join(project.path, '.edu/project.json'))).toEqual(before)
      } finally { images.releaseMetadata(); if (desktop) await desktop.close(); if (root) await rm(root, { recursive: true, force: true }) }
    }
  } finally { await fixture.close(); await images.close() }
})

test('chapter tools checkpoint two decoded illustrations through global admission and reopen without inference', { tag: '@topic-content', annotation: { type: 'flow', description: 'topic-content' } }, async ({ playwright }) => {
  test.setTimeout(120_000)
  let root = '', desktop: ElectronApplication | undefined
  const fixture = await startChapterFixture(), images = await startImageFixture(); images.alternateImages()
  try {
    const project = await topicContentProject(value => { root = value })
    project.document.selectedModel = { id: 'fixture-model', name: 'Learning model' }; project.document.outline!.model = project.document.selectedModel
    await writeFile(join(project.path, '.edu/project.json'), JSON.stringify(project.document))
    await writeFile(join(project.path, 'notes.md'), Buffer.from('\ufeffVisible assumptions and observed evidence.'))
    await mkdir(join(project.path, 'unrelated')); await writeFile(join(project.path, 'unrelated/notes.md'), 'Other topic source bytes.')
    const before = await readFile(join(project.path, '.edu/project.json')), source = await readFile(join(project.path, 'notes.md')), other = await readFile(join(project.path, 'unrelated/notes.md'))
    const launch = () => playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...environment(), EDU_HARNESS_TEST_DATA_DIR: join(root, 'desktop-profile'), EDU_HARNESS_TEST_PROVIDER_URL: fixture.baseUrl, EDU_HARNESS_TEST_OPENROUTER_URL: images.baseUrl } })
    desktop = await launch(); let { page, projectId } = await open(desktop, project.path)
    expect(images.requests).toHaveLength(0)
    await page.evaluate(() => window.learning.connectAccount())
    await expect.poll(async () => { const result = await page.evaluate(() => window.learning.getAccount()); return result.ok ? result.data.modelsStatus : 'error' }).toBe('ready')
    const key = await page.evaluate(() => window.learning.saveOpenRouterKey({ key: 'sk-or-fixture-private-key' })); expect(key.ok).toBe(true)
    const requestsBefore = images.requests.length
    await page.evaluate(async () => { await window.learning.getOpenRouterSettings(); await window.learning.listOpenRouterCalls({ limit: 20 }); await window.learning.getTopicImageConfiguration({ imageCount: 2 }) })
    expect(images.requests).toHaveLength(requestsBefore)
    await page.evaluate(() => {
      const store = globalThis as unknown as { chapterStates: TopicContentSnapshot[]; chapterActivity: AiActivitySnapshot[] }
      store.chapterStates = []; store.chapterActivity = []
      window.learning.onTopicContentChanged(value => store.chapterStates.push(value)); window.learning.onAiActivityChanged(value => store.chapterActivity.push(value))
    })
    await holdChapterExit(desktop)
    const identity = { projectId, topicId: 'beliefs' }
    expect((await page.evaluate(identity => window.learning.generateTopicContent({ ...identity, mode: 'illustrated', replace: false, expectedRevisionId: null }), identity)).ok).toBe(true)
    await expect.poll(() => barrierState(desktop!, 'exitBarrier'), { timeout: 30_000 }).toMatchObject({ held: true })
    const barrier = await barrierState(desktop, 'exitBarrier')
    expect(await desktop.evaluate((_, pid) => { try { process.kill(pid!, 0); return true } catch { return false } }, barrier.pid)).toBe(false)
    const competing = await page.evaluate(() => window.learning.testSolModel()); expect(competing).toMatchObject({ ok: false, error: { code: 'BUSY' } })
    expect(await page.evaluate(() => window.learning.removeOpenRouterKey())).toMatchObject({ ok: false, error: { code: 'BUSY' } })
    await releaseBarrier(desktop, 'exitBarrier'); await settled(page)
    const result = await page.evaluate(identity => window.learning.getTopicContent(identity), identity)
    expect(result.ok).toBe(true); if (!result.ok || !result.data) throw new Error('Chapter missing')
    expect(result.data.status).toBe('illustrated'); expect(result.data.plan.images).toHaveLength(2); expect(result.data.sections).toHaveLength(2)
    const posts = images.requests.filter(request => request.path === '/api/v1/images')
    expect(posts).toHaveLength(2); expect(fixture.inferenceRequests).toHaveLength(7)
    expect(posts.every(request => request.body?.model === 'openai/gpt-image-2' && (request.body.provider as { only: string[]; allow_fallbacks: boolean }).allow_fallbacks === false)).toBe(true)
    const assetBytes = await Promise.all(result.data.images.map(image => readFile(join(project.path, image.asset!.path))))
    expect(assetBytes).toEqual([images.png, images.secondPng]); expect(assetBytes[0]).not.toEqual(assetBytes[1])
    const manifest = JSON.parse(await readFile(join(project.path, topicManifestPath('beliefs')), 'utf8'))
    expect(manifest.baseline.sources).toEqual([{ path: 'notes.md', digest: createHash('sha256').update(source).digest('hex') }])
    const activity = await page.evaluate(() => (globalThis as unknown as { chapterActivity: AiActivitySnapshot[] }).chapterActivity)
    expect(activity.some(snapshot => snapshot.active?.activity.some(entry => entry.id === 'chapter-plan'))).toBe(true)
    expect(activity.some(snapshot => snapshot.active?.activity.some(entry => entry.id === 'chapter-sections'))).toBe(true)
    expect(activity.some(snapshot => snapshot.active?.preview.kind === 'image')).toBe(true)
    const calls = await page.evaluate(() => window.learning.listOpenRouterCalls({ limit: 50 }))
    expect(calls.ok && calls.data.calls.filter(call => call.intent.endpoint === 'images').every(call => call.latest?.disposition === 'published')).toBe(true)
    expect(await readFile(join(project.path, '.edu/project.json'))).toEqual(before); expect(await readFile(join(project.path, 'notes.md'))).toEqual(source); expect(await readFile(join(project.path, 'unrelated/notes.md'))).toEqual(other)
    const count = fixture.inferenceRequests.length, imageCount = posts.length
    await desktop.close(); desktop = await launch(); ({ page, projectId } = await open(desktop, project.path))
    const reopened = await page.evaluate(identity => window.learning.getTopicContent(identity), { ...identity, projectId }); expect(reopened.ok && reopened.data?.status).toBe('illustrated')
    expect(fixture.inferenceRequests).toHaveLength(count); expect(images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(imageCount)
    const names = ['getTopicContentState', 'getTopicContent', 'generateTopicContent', 'continueTopicContent', 'discardTopicContentProgress', 'retryTopicContentSave', 'completeTopicContentImages', 'retryTopicContentImage', 'saveOpenRouterKey', 'setOpenRouterImageModel', 'listOpenRouterCalls', 'getOpenRouterCall', 'getTopicImageConfiguration']
    for (const name of names) expect(await page.evaluate(async name => { const api = window.learning as unknown as Record<string, (request: unknown) => Promise<unknown>>; return api[name]!({ injected: true }) }, name)).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
  } finally { if (desktop) { try { await releaseBarrier(desktop, 'exitBarrier') } catch { /* Already closed. */ } await desktop.close() }; await fixture.close(); await images.close(); if (root) await rm(root, { recursive: true, force: true }) }
})

test('local media scheme permits only canonical owning-window image GETs and the trusted initiator', { tag: '@topic-media', annotation: { type: 'flow', description: 'topic-media' } }, async ({ playwright }) => {
  let root = '', desktop: ElectronApplication | undefined
  try {
    const project = await topicContentProject(value => { root = value }), manifest = await contentManifest(project.storage, project.authority, 'media-revision', true)
    await project.storage.publish(project.authority, manifest)
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...environment(), EDU_HARNESS_TEST_DATA_DIR: join(root, 'desktop-profile') } })
    const { page, projectId } = await open(desktop, project.path), image = manifest.images[0]!.asset!
    expect(await page.evaluate(() => window.learning.getAccount())).toMatchObject({ ok: true, data: { status: 'disconnected' } })
    expect(await page.evaluate(() => window.learning.getOpenRouterSettings())).toMatchObject({ ok: true, data: { connection: 'absent' } })
    const prose = await page.evaluate(identity => window.learning.getTopicContent(identity), { projectId, topicId: manifest.topicId })
    expect(prose).toMatchObject({ ok: true, data: { introduction: manifest.document.introduction, synthesis: manifest.document.synthesis } })
    const url = topicMediaUrl({ projectHandle: projectId, topicId: manifest.topicId, chapterId: manifest.chapterId, imageId: image.imageId, versionId: image.versionId })
    const load = (value: string) => page.evaluate(value => new Promise<{ loaded: boolean; width: number }>(resolve => { const image = new Image(); image.onload = () => resolve({ loaded: true, width: image.naturalWidth }); image.onerror = () => resolve({ loaded: false, width: 0 }); image.src = value; document.body.append(image) }), value)
    expect(await load(url)).toEqual({ loaded: true, width: 1 })
    expect(await load(url.replace('/beliefs/', '/%62eliefs/'))).toMatchObject({ loaded: false })
    expect(await load(url + '?candidate=unknown')).toMatchObject({ loaded: false })
    expect(await load('data:image/png;base64,' + topicPng.toString('base64'))).toMatchObject({ loaded: false })
    expect(await desktop.evaluate(async ({ net }, url) => { try { return (await net.fetch(url)).status } catch { return 403 } }, url)).toBe(403)
    expect(await desktop.evaluate(async ({ net }, url) => { try { return (await net.fetch(url, { method: 'POST' })).status } catch { return 403 } }, url)).toBe(403)
    const wrongWindow = await desktop.evaluate(async ({ BrowserWindow }, input) => {
      const window = new BrowserWindow({ show: false, webPreferences: { preload: input.preload, partition: 'persist:edu-harness', sandbox: true, contextIsolation: true, nodeIntegration: false } })
      try {
        await window.loadURL('learningapp://workspace/index.html')
        const capabilities = await window.webContents.executeJavaScript(`Promise.all(${JSON.stringify(['getTopicContentState', 'getTopicContent', 'generateTopicContent', 'continueTopicContent', 'discardTopicContentProgress', 'retryTopicContentSave', 'completeTopicContentImages', 'retryTopicContentImage', 'getOpenRouterSettings', 'saveOpenRouterKey', 'removeOpenRouterKey', 'setOpenRouterImageModel', 'refreshOpenRouterMetadata', 'listOpenRouterCalls', 'getOpenRouterCall', 'getTopicImageConfiguration'])}.map(name => window.learning[name]({injected: true})))`)
        const image = await window.webContents.executeJavaScript(`new Promise(resolve => { const image = new Image(); image.onload = () => resolve(true); image.onerror = () => resolve(false); image.src = ${JSON.stringify(input.url)}; document.body.append(image) })`)
        return { capabilities, image }
      }
      finally { window.destroy() }
    }, { url, preload: resolve('out/preload/index.cjs') })
    expect(wrongWindow.image).toBe(false)
    expect(wrongWindow.capabilities).toHaveLength(16)
    expect(wrongWindow.capabilities.every((value: { ok: boolean; error: { code: string } }) => !value.ok && value.error.code === 'FORBIDDEN')).toBe(true)
  } finally { await desktop?.close(); if (root) await rm(root, { recursive: true, force: true }) }
})

test('text-only prose completes images without ChatGPT and requires explicit uncertainty retry lineage', { tag: '@topic-content-recovery', annotation: { type: 'flow', description: 'topic-content-recovery' } }, async ({ playwright }) => {
  test.setTimeout(120_000)
  let root = '', desktop: ElectronApplication | undefined
  const fixture = await startChapterFixture(), images = await startImageFixture(); images.alternateImages()
  try {
    const project = await topicContentProject(value => { root = value })
    project.document.selectedModel = { id: 'fixture-model', name: 'Learning model' }; project.document.outline!.model = project.document.selectedModel
    await writeFile(join(project.path, '.edu/project.json'), JSON.stringify(project.document)); await writeFile(join(project.path, 'notes.md'), 'Original learning source.')
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...environment(), EDU_HARNESS_TEST_DATA_DIR: join(root, 'desktop-profile'), EDU_HARNESS_TEST_PROVIDER_URL: fixture.baseUrl, EDU_HARNESS_TEST_OPENROUTER_URL: images.baseUrl } })
    const { page, projectId } = await open(desktop, project.path), identity = { projectId, topicId: 'beliefs' }
    await page.evaluate(() => window.learning.connectAccount())
    await expect.poll(async () => { const result = await page.evaluate(() => window.learning.getAccount()); return result.ok ? result.data.modelsStatus : 'error' }).toBe('ready')
    expect((await page.evaluate(identity => window.learning.generateTopicContent({ ...identity, mode: 'text-only', replace: false, expectedRevisionId: null }), identity)).ok).toBe(true)
    await settled(page)
    const original = await page.evaluate(identity => window.learning.getTopicContent(identity), identity)
    if (!original.ok || !original.data) throw new Error('Text-only chapter missing')
    expect(original.data.status).toBe('text-only'); expect(original.data.plan.images).toHaveLength(2)
    expect(fixture.inferenceRequests).toHaveLength(5); expect(images.requests).toHaveLength(0)
    const completion = { ...identity, chapterId: original.data.identity.chapterId, revisionId: original.data.identity.revisionId }
    expect(await page.evaluate(request => window.learning.completeTopicContentImages(request), completion)).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } })
    await settled(page)
    expect((await page.evaluate(identity => window.learning.getTopicContentState(identity), identity))).toMatchObject({ ok: true, data: { progress: null } })
    await page.evaluate(() => window.learning.disconnectAccount())
    expect((await page.evaluate(() => window.learning.saveOpenRouterKey({ key: 'fixture-private-key' }))).ok).toBe(true)
    images.failNext(402)
    expect((await page.evaluate(request => window.learning.completeTopicContentImages(request), completion)).ok).toBe(true)
    await settled(page)
    const paused = await page.evaluate(identity => window.learning.getTopicContentState(identity), identity)
    if (!paused.ok || !paused.data.progress) throw new Error('Image failure progress missing')
    const progress = paused.data.progress, slot = progress.imageSlots!.find(slot => slot.status === 'unresolved')!
    expect(progress.status).toBe('paused'); expect(slot.callId).toBeTruthy(); expect(images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(2)
    const run = { ...identity, chapterId: progress.chapterId, runId: progress.runId, checkpointRevision: progress.checkpointRevision }
    expect((await page.evaluate(request => window.learning.continueTopicContent(request), run)).ok).toBe(true); await settled(page)
    expect(images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(2)
    const current = await page.evaluate(identity => window.learning.getTopicContentState(identity), identity)
    if (!current.ok || !current.data.progress) throw new Error('Resume progress missing')
    const retry = { ...run, checkpointRevision: current.data.progress.checkpointRevision, imageId: slot.imageId, priorCallId: slot.callId!, acknowledgeUncertainCharge: false }
    expect(await page.evaluate(request => window.learning.retryTopicContentImage(request), retry)).toMatchObject({ ok: false, error: { code: 'CONFLICT' } }); await settled(page)
    expect(images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(2)
    expect((await page.evaluate(request => window.learning.retryTopicContentImage({ ...request, acknowledgeUncertainCharge: true }), retry)).ok).toBe(true); await settled(page)
    const completed = await page.evaluate(identity => window.learning.getTopicContent(identity), identity)
    if (!completed.ok || !completed.data) throw new Error('Completed images missing')
    expect(completed.data.status).toBe('illustrated'); expect(completed.data.identity.revisionId).not.toBe(original.data.identity.revisionId)
    expect(completed.data.sections).toEqual(original.data.sections); expect(completed.data.introduction).toBe(original.data.introduction)
    const retried = completed.data.images.find(image => image.imageId === slot.imageId)!
    expect(retried.previousAttempts).toEqual([{ callId: slot.callId, status: 'unresolved', uncertaintyAcknowledged: true }]); expect(retried.callId).not.toBe(slot.callId)
    expect(images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(3); expect(fixture.inferenceRequests).toHaveLength(5)
    expect(await page.evaluate(() => window.learning.getAccount())).toMatchObject({ ok: true, data: { status: 'disconnected' } })
  } finally { await desktop?.close(); await fixture.close(); await images.close(); if (root) await rm(root, { recursive: true, force: true }) }
})

test('chapter image dispatch and global cleanup wait for exact durable writes and genuine exits', { tag: '@topic-content-barriers', annotation: { type: 'flow', description: 'topic-content-barriers' } }, async ({ playwright }) => {
  test.setTimeout(240_000)
  const roots: string[] = [], fixture = await startChapterFixture(), images = await startImageFixture()
  let desktop: ElectronApplication | undefined
  try {
    for (const stage of ['intent', 'requested', 'terminal', 'exit-first', 'write-first'] as const) {
      const project = await topicContentProject(root => roots.push(root))
      project.document.selectedModel = { id: 'fixture-model', name: 'Learning model' }; project.document.outline!.model = project.document.selectedModel
      await writeFile(join(project.path, '.edu/project.json'), JSON.stringify(project.document)); await writeFile(join(project.path, 'notes.md'), 'Original learning source.')
      const launch = () => playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...environment(), EDU_HARNESS_TEST_DATA_DIR: join(project.root, 'desktop-profile'), EDU_HARNESS_TEST_PROVIDER_URL: fixture.baseUrl, EDU_HARNESS_TEST_OPENROUTER_URL: images.baseUrl } })
      desktop = await launch(); let { page, projectId } = await open(desktop, project.path)
      const identity = { projectId, topicId: 'beliefs' }
      await page.evaluate(() => window.learning.connectAccount())
      await expect.poll(async () => { const result = await page.evaluate(() => window.learning.getAccount()); return result.ok ? result.data.modelsStatus : 'error' }).toBe('ready')
      expect((await page.evaluate(() => window.learning.saveOpenRouterKey({ key: 'fixture-private-key' }))).ok).toBe(true)
      const held = stage === 'exit-first' || stage === 'write-first'
      await imageWriteGate(desktop, join(project.root, 'write-sample'), held ? 'terminal' : stage, !held)
      if (held) await holdImageExit(desktop)
      const count = images.requests.filter(request => request.path === '/api/v1/images').length
      expect((await page.evaluate(identity => window.learning.generateTopicContent({ ...identity, mode: 'illustrated', replace: false, expectedRevisionId: null }), identity)).ok).toBe(true)
      await expect.poll(() => writeGateState(desktop!), { timeout: 30_000 }).toMatchObject({ held: true })
      const write = await writeGateState(desktop)
      if (held) {
        await page.evaluate(async () => { const result = await window.learning.getAiActivity(); if (result.ok && result.data.active) { const store = globalThis as unknown as { cancellation?: Promise<unknown> }; store.cancellation = window.learning.cancelAiOperation({ operationId: result.data.active.operationId }) } })
        await expect.poll(() => barrierState(desktop!, 'exitBarrier'), { timeout: 15_000 }).toMatchObject({ held: true })
        const exit = await barrierState(desktop, 'exitBarrier')
        expect(await desktop.evaluate((_, pid) => { try { process.kill(pid!, 0); return true } catch { return false } }, exit.pid)).toBe(false)
        expect(await page.evaluate(() => window.learning.testSolModel())).toMatchObject({ ok: false, error: { code: 'BUSY' } })
        if (stage === 'exit-first') await releaseBarrier(desktop, 'exitBarrier'); else await releaseWriteGate(desktop)
        if (stage === 'write-first') await expect.poll(() => page.evaluate(callId => window.learning.getOpenRouterCall({ callId: callId! }), write.callId), { timeout: 15_000 }).toMatchObject({ ok: true, data: { latest: { cost: { kind: 'known', usd: '0.04500000000000001' } } } })
        expect(await page.evaluate(() => window.learning.testLunaModel())).toMatchObject({ ok: false, error: { code: 'BUSY' } })
        if (stage === 'exit-first') await releaseWriteGate(desktop); else await releaseBarrier(desktop, 'exitBarrier')
        await settled(page)
        const call = await page.evaluate(callId => window.learning.getOpenRouterCall({ callId: callId! }), write.callId)
        expect(call).toMatchObject({ ok: true, data: { latest: { cost: { kind: 'known', usd: '0.04500000000000001' } } } })
      } else {
        await settled(page); await releaseWriteGate(desktop)
        const state = await page.evaluate(identity => window.learning.getTopicContentState(identity), identity)
        if (!state.ok || !state.data.progress) throw new Error('Failure progress missing')
        expect(state.data.progress.imageSlots!.every(slot => slot.status !== 'complete')).toBe(true)
        if (stage === 'requested') {
          const progress = state.data.progress
          expect(progress.pendingResultId).toBeTruthy()
          await imageWriteGate(desktop, join(project.root, 'retry-gate-sample'), 'requested', false, progress.imageSlots![0]!.callId!)
          await page.evaluate(request => { (globalThis as unknown as { storageRetry: Promise<unknown> }).storageRetry = window.learning.retryTopicContentSave(request) }, { ...identity, chapterId: progress.chapterId, runId: progress.runId, checkpointRevision: progress.checkpointRevision, pendingResultId: progress.pendingResultId! })
          await expect.poll(() => writeGateState(desktop!), { timeout: 15_000 }).toMatchObject({ held: true })
          expect(await page.evaluate(() => window.learning.testSolModel())).toMatchObject({ ok: false, error: { code: 'BUSY' } })
          expect(await page.evaluate(() => window.learning.getAiActivity())).toMatchObject({ ok: true, data: { active: null } })
          await releaseWriteGate(desktop)
          expect(await page.evaluate(() => (globalThis as unknown as { storageRetry: Promise<unknown> }).storageRetry)).toMatchObject({ ok: true })
          expect(images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(count)
        }
        if (stage === 'terminal') {
          const oldCallId = write.callId
          await desktop.close(); desktop = await launch(); ({ page, projectId } = await open(desktop, project.path))
          const restartIdentity = { ...identity, projectId }, restart = await page.evaluate(identity => window.learning.getTopicContentState(identity), restartIdentity)
          if (!restart.ok || !restart.data.progress) throw new Error('Interrupted request missing after restart')
          expect(restart.data.progress.unresolvedImageIds).toContain('illustration-0')
          expect(images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(count + 1)
          // writeFile failed after wx creation: preserve the unknown empty record and block paid recovery.
          expect(await page.evaluate(callId => window.learning.getOpenRouterCall({ callId: callId! }), oldCallId)).toMatchObject({ ok: true, data: { latest: null } })
          expect(await page.evaluate(() => window.learning.getOpenRouterSettings())).toMatchObject({ ok: true, data: { errorCode: 'STORAGE' } })
        }
      }
      expect(images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(count + (stage === 'intent' || stage === 'requested' ? 0 : 1))
      const state = await page.evaluate(identity => window.learning.getTopicContentState(identity), { projectId, topicId: identity.topicId })
      expect(state.ok && state.data.published).toBeNull()
      await desktop.close(); desktop = undefined
    }
  } finally {
    if (desktop) { await releaseWriteGate(desktop); await releaseBarrier(desktop, 'exitBarrier'); await desktop.close() }
    await fixture.close(); await images.close(); for (const root of roots) await rm(root, { recursive: true, force: true })
  }
})
