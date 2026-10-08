import { expect, test } from '../flows/fixture'
import type { ElectronApplication, Page } from '@playwright/test'
import { readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { topicContentProject } from '../fixtures/topic-content'
import { readerManifest } from '../fixtures/chapter-reader'
import { startChapterBudgetFixture } from '../fixtures/chapter-budget'
import { startChapterFixture } from '../fixtures/chapter-provider'
import { startImageFixture } from '../fixtures/image-provider'
import { startSettingsFixture } from '../fixtures/openrouter-settings'
import { createOpenRouterLedger } from '../../src/main/openrouter/ledger'
import { topicManifestPath, topicCheckpointPath, contentDigest } from '../../src/main/storage/topic-content-files'
import { aiActivity } from '../fixtures/ai-activity'

const environment = () => Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
async function open(desktop: ElectronApplication, path: string) {
  await desktop.evaluate(({ dialog, shell }, path) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] }); shell.openExternal = async url => { await fetch(url) } }, path)
  const page = await desktop.firstWindow()
  await page.getByRole('main').getByRole('button', { name: 'Open project', exact: true }).click()
  await expect.poll(async () => { const reply = await page.evaluate(() => window.learning.getWorkspace()); return reply.ok ? reply.data.activeProject?.id : null }).toBeTruthy()
  const reply = await page.evaluate(() => window.learning.getWorkspace())
  if (!reply.ok || !reply.data.activeProject) throw new Error('Fixture project not opened')
  return { page, projectId: reply.data.activeProject.id }
}
async function settled(page: Page) { await expect.poll(async () => (await aiActivity(page)).active, { timeout: 60_000 }).toBeNull() }
async function connect(page: Page) {
  expect(await page.evaluate(() => window.learning.connectAccount())).toMatchObject({ ok: true })
  await expect.poll(async () => { const reply = await page.evaluate(() => window.learning.getAccount()); return reply.ok ? reply.data.modelsStatus : null }).toBe('ready')
}

test('real chapter turn budgets distinguish failed admission from durable pause and preserve recorded continuation model and source baselines', { tag: '@topic-content-budget', annotation: { type: 'flow', description: 'topic-content-budget' } }, async ({ playwright }) => {
  test.setTimeout(240_000)
  for (const scenario of ['no-plan', 'resume', 'stale'] as const) {
    let root = '', desktop: ElectronApplication | undefined
    const text = await startChapterBudgetFixture(scenario !== 'no-plan'), images = await startImageFixture()
    try {
      const project = await topicContentProject(value => { root = value }), profile = join(root, 'profile')
      project.document.selectedModel = { id: 'fixture-model', name: 'Learning model' }; project.document.outline!.model = project.document.selectedModel
      await writeFile(join(project.path, '.edu/project.json'), JSON.stringify(project.document))
      await writeFile(join(project.path, 'extra-progress.md'), 'Exact additional source delivered to Pi.')
      const prepared = await readerManifest(project.storage, project.authority); await project.storage.publish(project.authority, prepared.manifest)
      const markerPath = join(project.path, topicManifestPath('beliefs')), oldMarker = await readFile(markerPath), oldText = await readFile(join(project.path, prepared.manifest.outputDirectory, 'chapter.md'))
      const launch = () => playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...environment(), EDU_HARNESS_TEST_DATA_DIR: profile, EDU_HARNESS_TEST_PROVIDER_URL: text.baseUrl, EDU_HARNESS_TEST_OPENROUTER_URL: images.baseUrl } })
      desktop = await launch(); let { page, projectId } = await open(desktop, project.path); await connect(page)
      let identity = { projectId, topicId: 'beliefs' }
      expect(await page.evaluate(request => window.learning.generateTopicContent(request), { ...identity, mode: 'text-only' as const, replace: true, expectedRevisionId: prepared.manifest.revisionId })).toMatchObject({ ok: true })
      await settled(page)
      expect(text.inferenceRequests).toHaveLength(48); expect(text.inferenceRequests.every(request => request.model === 'fixture-model')).toBe(true); expect(images.requests).toHaveLength(0)
      const reply = await page.evaluate(identity => window.learning.getTopicContentState(identity), identity)
      if (!reply.ok) throw new Error('State missing')
      const progress = reply.data.progress
      if (scenario === 'no-plan') {
        expect(progress).toBeNull(); expect(reply.data.errorCode).toBe('UNAVAILABLE'); expect((await aiActivity(page)).settled?.outcome).toBe('failed')
        expect(await readdir(join(project.path, '.edu/content-runs')).catch(() => [])).toEqual([])
      } else {
        expect(progress).toMatchObject({ status: 'paused', baselineStatus: 'current', textModelId: 'fixture-model', completedSectionIds: ['section-0'] })
        expect((await aiActivity(page)).settled?.outcome).toBe('paused')
        const checkpoint = JSON.parse(await readFile(join(project.path, topicCheckpointPath(progress!.runId)), 'utf8'))
        expect(checkpoint).toMatchObject({ textTurns: 48, activationTextTurns: 48, baseline: { sources: [{ path: 'extra-progress.md', digest: contentDigest(await readFile(join(project.path, 'extra-progress.md'))) }] } })
      }
      expect(await readFile(markerPath)).toEqual(oldMarker); expect(await readFile(join(project.path, prepared.manifest.outputDirectory, 'chapter.md'))).toEqual(oldText)
      await desktop.close(); desktop = await launch(); ({ page, projectId } = await open(desktop, project.path)); identity = { projectId, topicId: 'beliefs' }
      await page.getByRole('button', { name: 'Beliefs before evidence', exact: true }).click(); await expect(page.locator('#topic-heading')).toHaveText(prepared.manifest.plan.title)
      expect(text.inferenceRequests).toHaveLength(48); expect(images.requests).toHaveLength(0)
      if (scenario === 'resume') {
        expect(await page.evaluate(request => window.learning.setProjectModel(request), { projectId, modelId: 'fixture-model-fast' })).toMatchObject({ ok: true })
        await page.locator('details.chapter-generation > summary').click()
        await expect(page.locator('.chapter-preflight').first()).toContainText('Fresh-generation model: Learning model')
        await expect(page.locator('.chapter-preflight').first()).toContainText('Fast')
        await expect(page.getByText('Continuation model: fixture-model.', { exact: true })).toBeVisible()
        text.resume(); await page.getByRole('button', { name: 'Continue', exact: true }).click(); await settled(page)
        expect(text.inferenceRequests).toHaveLength(50); expect(text.inferenceRequests.slice(48).every(request => request.model === 'fixture-model')).toBe(true)
        const current = await page.evaluate(identity => window.learning.getTopicContent(identity), identity)
        expect(current).toMatchObject({ ok: true, data: { status: 'text-only', sections: [{ id: 'section-0', markdown: 'Retained accepted explanation of the first objective.' }, { id: 'section-1' }] } })
        expect(await readFile(join(project.path, 'extra-progress.md'), 'utf8')).toBe('Exact additional source delivered to Pi.')
      } else if (scenario === 'stale') {
        const checkpointPath = join(project.path, topicCheckpointPath(progress!.runId)), checkpointBytes = await readFile(checkpointPath)
        await writeFile(join(project.path, 'extra-progress.md'), 'Externally edited additional source.')
        await page.getByRole('button', { name: 'Reload saved content', exact: true }).click()
        await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
        await expect(page.getByText('Saved progress uses changed topic, learning context, sources or publication. Discard it and generate a fresh chapter.', { exact: true })).toBeVisible()
        expect(await page.evaluate(identity => window.learning.getTopicContentState(identity), identity)).toMatchObject({ ok: true, data: { stale: false, progress: { baselineStatus: 'stale' } } })
        expect(await page.evaluate(request => window.learning.continueTopicContent(request), { ...identity, chapterId: progress!.chapterId, runId: progress!.runId, checkpointRevision: progress!.checkpointRevision })).toMatchObject({ ok: false, error: { code: 'CONFLICT' } }); await settled(page)
        expect(await readFile(checkpointPath)).toEqual(checkpointBytes); expect(await readFile(markerPath)).toEqual(oldMarker)
        await page.getByRole('button', { name: 'Discard progress', exact: true }).click(); await expect.poll(async () => { const state = await page.evaluate(identity => window.learning.getTopicContentState(identity), identity); return state.ok ? state.data.progress : 'error' }).toBeNull()
        await expect(page.locator('#topic-heading')).toHaveText(prepared.manifest.plan.title)
      }
      expect(images.requests).toHaveLength(0); expect(text.inferenceRequests).toHaveLength(scenario === 'resume' ? 50 : 48)
      for (const [index, image] of prepared.manifest.images.entries()) expect(await readFile(join(project.path, image.asset!.path))).toEqual(prepared.rasters[index])
      console.log(`chapter-budget ${scenario}: initial text48, continuation ${text.inferenceRequests.length - 48}, image0`)
    } finally { await desktop?.close(); await text.close(); await images.close(); if (root) await rm(root, { recursive: true, force: true }) }
  }
})

test('reader keeps stale prose readable and restores current shorter revisions or safe corruption recovery through history', { tag: '@chapter-reader-recovery', annotation: { type: 'flow', description: 'chapter-reader-recovery' } }, async ({ playwright }) => {
  test.setTimeout(90_000)
  let root = '', desktop: ElectronApplication | undefined
  const text = await startChapterFixture(), images = await startImageFixture()
  try {
    const project = await topicContentProject(value => { root = value }), prepared = await readerManifest(project.storage, project.authority)
    const sourcePath = join(project.path, 'chapter-source.md'); await writeFile(sourcePath, 'Original evidence.')
    prepared.manifest.baseline = await project.storage.captureBaseline(project.authority, ['chapter-source.md']); await project.storage.publish(project.authority, prepared.manifest)
    const originalMetadata = await readFile(join(project.path, '.edu/project.json')), originalText = await readFile(join(project.path, prepared.manifest.outputDirectory, 'chapter.md'))
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...environment(), EDU_HARNESS_TEST_DATA_DIR: join(root, 'profile'), EDU_HARNESS_TEST_PROVIDER_URL: text.baseUrl, EDU_HARNESS_TEST_OPENROUTER_URL: images.baseUrl } })
    const { page } = await open(desktop, project.path)
    await page.getByRole('button', { name: 'Beliefs before evidence', exact: true }).click(); await expect(page.locator('.chapter-section')).toHaveCount(7)
    await writeFile(sourcePath, 'Changed evidence.'); await page.getByRole('button', { name: 'Reload saved content', exact: true }).click()
    await expect(page.getByText('This chapter is based on older topic or source context.', { exact: false })).toBeVisible(); await expect(page.locator('.chapter-section')).toHaveCount(7)
    await writeFile(sourcePath, 'Original evidence.')
    const changed = structuredClone(project.document); changed.outline!.document.lessons[0]!.overview += ' Updated orientation.'
    await writeFile(join(project.path, '.edu/project.json'), JSON.stringify(changed)); await page.getByRole('button', { name: 'Reload saved content', exact: true }).click()
    await expect(page.getByText('This chapter is based on older topic or source context.', { exact: false })).toBeVisible(); await expect(page.locator('.chapter-section')).toHaveCount(7)
    await writeFile(join(project.path, '.edu/project.json'), originalMetadata); await page.getByRole('button', { name: 'Reload saved content', exact: true }).click()
    await page.getByRole('navigation', { name: 'Chapter contents' }).getByRole('button', { name: 'Apply the idea' }).focus(); await page.keyboard.press('Enter')
    await expect(page.locator('[data-focus-anchor="chapter-section:reading-6"]')).toBeFocused()
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    const next = structuredClone(prepared.manifest); next.revisionId = 'shorter-revision'; next.outputDirectory = `${project.authority.folderName}/content/${next.chapterId}/${next.revisionId}`; next.plan.title = 'A shorter current chapter'
    next.plan.sections = next.plan.sections.slice(0, 2); next.document.sections = next.document.sections.slice(0, 2); next.plan.images[1]!.sectionId = 'reading-1'
    for (const [index, image] of next.images.entries()) {
      image.asset = { ...image.asset!, path: `${next.outputDirectory}/images/${image.imageId}-${image.asset!.versionId}.png` }
      await project.storage.stageAsset(project.authority, next.plan, next.revisionId, image.asset, prepared.rasters[index]!)
    }
    next.provenance.runId = 'shorter-run'; next.previousRevisionIds = [prepared.manifest.revisionId]; next.baseline = await project.storage.captureBaseline(project.authority, ['chapter-source.md'])
    await project.storage.publish(project.authority, next)
    await page.getByRole('button', { name: 'Forward', exact: true }).click(); await expect(page.locator('#topic-heading')).toHaveText(next.plan.title); await expect(page.locator('.chapter-section')).toHaveCount(2)
    await expect(page.locator('#topic-heading')).toBeFocused(); expect(await page.locator('main').evaluate(element => element.scrollTop <= element.scrollHeight - element.clientHeight)).toBe(true)
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    const marker = join(project.path, topicManifestPath('beliefs')), goodMarker = await readFile(marker), corrupt = 'Externally supplied corrupt chapter marker'
    await writeFile(marker, corrupt); await page.getByRole('button', { name: 'Forward', exact: true }).click()
    await expect(page.locator('.chapter-section')).toHaveCount(0); await expect(page.getByRole('alert')).toBeVisible(); await expect(page.locator('#topic-heading')).toHaveText('Beliefs before evidence')
    expect(await readFile(marker, 'utf8')).toBe(corrupt); expect(await readFile(join(project.path, prepared.manifest.outputDirectory, 'chapter.md'))).toEqual(originalText)
    await writeFile(marker, goodMarker); await page.getByRole('button', { name: 'Reload saved content', exact: true }).click(); await expect(page.locator('#topic-heading')).toHaveText(next.plan.title); await expect(page.locator('.chapter-section')).toHaveCount(2)
    expect(await readFile(join(project.path, '.edu/project.json'))).toEqual(originalMetadata)
    for (const [index, image] of prepared.manifest.images.entries()) expect(await readFile(join(project.path, image.asset!.path))).toEqual(prepared.rasters[index])
    expect(text.inferenceRequests).toHaveLength(0); expect(images.requests).toHaveLength(0); expect(await aiActivity(page)).toMatchObject({ active: null, settled: null })
  } finally { await desktop?.close(); await text.close(); await images.close(); if (root) await rm(root, { recursive: true, force: true }) }
})

test('explicit request-detail cost recheck preserves exact ledger totals and publication without inference or replay', { tag: '@openrouter-reconciliation', annotation: { type: 'flow', description: 'openrouter-reconciliation' } }, async ({ playwright }) => {
  test.setTimeout(90_000)
  let root = '', desktop: ElectronApplication | undefined
  const fixture = await startSettingsFixture()
  try {
    await topicContentProject(value => { root = value }); const profile = join(root, 'profile')
    const launch = () => playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...environment(), EDU_HARNESS_TEST_DATA_DIR: profile, EDU_HARNESS_TEST_OPENROUTER_URL: fixture.baseUrl } })
    desktop = await launch(); let page = await desktop.firstWindow()
    expect(await page.evaluate(() => window.learning.saveOpenRouterKey({ key: 'fixture-key' }))).toMatchObject({ ok: true }); await desktop.close()
    const cache = JSON.parse(await readFile(join(profile, 'openrouter/openrouter-cache.json'), 'utf8')), ledger = createOpenRouterLedger(join(profile, 'openrouter/calls')), at = new Date().toISOString()
    await ledger.initialize()
    for (const id of ['known-id', 'missing-id', 'foreign-epoch']) {
      await ledger.intent({ schemaVersion: 1, id, startedAt: at, connectionEpoch: id === 'foreign-epoch' ? 'different-epoch' : cache.epoch, endpoint: 'images', purpose: 'chapter-image', operationId: 'historical-operation', runId: 'historical-run', context: { projectId: 'portable-project', topicId: 'beliefs', projectName: 'Learning project', topicTitle: 'Starting beliefs' }, modelId: 'openai/gpt-image-2', estimate: { kind: 'unknown', reason: 'Historical quote unavailable.' } })
      await ledger.transition(id, { recordedAt: at, status: 'succeeded', httpStatus: 200, errorCode: null, generationId: id === 'missing-id' ? null : 'gen-known', returnedModelId: 'openai/gpt-image-2', cost: { kind: 'unknown' }, disposition: 'published' })
    }
    desktop = await launch(); page = await desktop.firstWindow()
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
    await dialog.locator('.settings-call').filter({ hasText: 'Cost unknown' }).first().click()
    const before = fixture.requests.length
    expect(await page.evaluate(() => window.learning.reconcileOpenRouterCall({ callId: 'missing-id' }))).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } })
    expect(await page.evaluate(() => window.learning.reconcileOpenRouterCall({ callId: 'foreign-epoch' }))).toMatchObject({ ok: false, error: { code: 'AUTH_REQUIRED' } }); expect(fixture.requests).toHaveLength(before)
    // Invoke the exact authorized production handler with forged sender/payload shapes.
    const rejected = await desktop.evaluate(async ({ ipcMain, BrowserWindow }) => {
      type Handler = (event: unknown, payload: unknown) => Promise<unknown>
      const handler = (ipcMain as unknown as { _invokeHandlers: Map<string, Handler> })._invokeHandlers.get('openrouter:reconcile-call')!, contents = BrowserWindow.getAllWindows()[0]!.webContents
      const event = { sender: contents, senderFrame: contents.mainFrame }
      return [await handler({ sender: {} }, { callId: 'known-id' }), await handler(event, { callId: 'known-id', generationId: 'gen-known' }), await handler(event, { callId: '../escape' })]
    })
    expect(rejected).toEqual(expect.arrayContaining([expect.objectContaining({ ok: false, error: expect.objectContaining({ code: 'FORBIDDEN' }) }), expect.objectContaining({ ok: false, error: expect.objectContaining({ code: 'INVALID_INPUT' }) })])); expect(fixture.requests).toHaveLength(before)
    // Target known-id through the actual details button, then the explicit product action.
    const history = await page.evaluate(() => window.learning.listOpenRouterCalls({ limit: 100 }))
    if (!history.ok) throw new Error('History missing')
    const index = history.data.calls.findIndex(call => call.intent.id === 'known-id')
    await dialog.locator('.settings-call').nth(index).click(); await expect(dialog.locator('.router-detail')).toContainText('Unknown; not counted as zero')
    for (const mode of ['unsupported', 'mismatch', 'failed'] as const) {
      fixture.generation(mode); await dialog.getByRole('button', { name: 'Recheck cost', exact: true }).click()
      await expect(dialog.getByRole('alert')).toBeVisible(); await expect(dialog.locator('.router-detail')).toContainText('Unknown; not counted as zero')
    }
    fixture.generation('matching'); await dialog.getByRole('button', { name: 'Recheck cost', exact: true }).click()
    await expect(dialog.locator('.router-detail')).toContainText('$0.123456789123456789 USD'); await expect(dialog.locator('.router-detail')).toContainText('published')
    await expect(dialog.getByRole('button', { name: 'Recheck cost', exact: true })).toBeEnabled()
    const previous = await page.evaluate(() => window.learning.getOpenRouterCall({ callId: 'known-id' }))
    if (!previous.ok || !previous.data.latest) throw new Error('Recorded cost missing')
    await dialog.getByRole('button', { name: 'Recheck cost', exact: true }).click()
    await expect.poll(async () => { const value = await page.evaluate(() => window.learning.getOpenRouterCall({ callId: 'known-id' })); return value.ok ? value.data.latest?.sequence : null }).toBe(previous.data.latest.sequence + 1)
    await expect.poll(async () => { const value = await page.evaluate(() => window.learning.getOpenRouterSettings()); return value.ok ? value.data.spend.allTimeUsd : null }).toBe('0.123456789123456789')
    expect(await page.evaluate(() => window.learning.getOpenRouterCall({ callId: 'known-id' }))).toMatchObject({ ok: true, data: { latest: { disposition: 'published', cost: { kind: 'known', usd: '0.123456789123456789' } } } })
    fixture.exhaustAllowance(true)
    expect(await page.evaluate(() => window.learning.refreshOpenRouterMetadata())).toMatchObject({ ok: true, data: { connection: 'limited' } })
    await expect(dialog.getByRole('button', { name: 'Recheck cost', exact: true })).toBeEnabled()
    const limited = await page.evaluate(() => window.learning.getOpenRouterCall({ callId: 'known-id' }))
    if (!limited.ok || !limited.data.latest) throw new Error('Limited-allowance historical call missing')
    await dialog.getByRole('button', { name: 'Recheck cost', exact: true }).click()
    await expect.poll(async () => { const value = await page.evaluate(() => window.learning.getOpenRouterCall({ callId: 'known-id' })); return value.ok ? value.data.latest?.sequence : null }).toBe(limited.data.latest.sequence + 1)
    expect(await page.evaluate(() => window.learning.getOpenRouterSettings())).toMatchObject({ ok: true, data: { connection: 'limited', spend: { allTimeUsd: '0.123456789123456789' } } })
    await page.evaluate(() => window.learning.removeOpenRouterKey()); const removed = fixture.requests.length
    expect(await page.evaluate(() => window.learning.reconcileOpenRouterCall({ callId: 'known-id' }))).toMatchObject({ ok: false, error: { code: 'AUTH_REQUIRED' } }); expect(fixture.requests).toHaveLength(removed)
    expect(fixture.requests.filter(request => request.path.endsWith('/images'))).toHaveLength(0); expect(await aiActivity(page)).toMatchObject({ active: null, settled: null }); await expect(page.locator('.ai-panel')).toHaveCount(0)
    console.log(`reconciliation: metadata GETs ${fixture.requests.filter(request => request.path.startsWith('/api/v1/generation?')).length}, image POST0, exact spend0.123456789123456789`)
  } finally { await desktop?.close(); await fixture.close(); if (root) await rm(root, { recursive: true, force: true }) }
})
