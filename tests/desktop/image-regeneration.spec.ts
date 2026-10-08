import { expect, test } from '../flows/fixture'
import type { ElectronApplication, Page } from '@playwright/test'
import sharp from 'sharp'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { topicContentProject } from '../fixtures/topic-content'
import { readerManifest } from '../fixtures/chapter-reader'
import { startImageFixture } from '../fixtures/image-provider'
import { startChapterFixture } from '../fixtures/chapter-provider'
import { imageWriteGate, releaseWriteGate, writeGateState } from '../fixtures/chapter-write-barriers'
import { barrierState, holdImageExit, releaseBarrier } from '../fixtures/desktop-ai-barriers'
import { workspaceSnapshot } from '../fixtures/desktop-navigation'
import { desktopFocusDiagnostics } from '../fixtures/desktop-focus'
import { contentDigest, topicCandidatePath, topicManifestPath } from '../../src/main/storage/topic-content-files'
import type { TopicContentSnapshot, TopicImageCandidateRequest } from '../../src/shared/topic-content'

const environment = () => Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
async function state(page: Page, identity: { projectId: string; topicId: string }): Promise<TopicContentSnapshot> {
  const reply = await page.evaluate(identity => window.learning.getTopicContentState(identity), identity)
  if (!reply.ok) throw new Error(`Content state: ${reply.error.code}`)
  return reply.data
}
async function settled(page: Page) { await expect.poll(async () => { const result = await page.evaluate(() => window.learning.getAiActivity()); return result.ok ? result.data.active : 'error' }).toBeNull() }
function reviewRequest(identity: { projectId: string; topicId: string }, snapshot: TopicContentSnapshot): TopicImageCandidateRequest {
  const replacement = snapshot.replacement!
  return { ...identity, chapterId: replacement.chapterId, revisionId: replacement.revisionId, imageId: replacement.imageId, expectedImageVersionId: replacement.expectedImageVersionId, candidateId: replacement.candidateId }
}
async function painted(desktop: ElectronApplication, page: Page) {
  const window = await desktop.browserWindow(page); let bitmap: Buffer | null = null
  await expect.poll(async () => {
    const regions = await page.locator('.image-replacement-dialog').evaluate(async dialog => {
      const images = [...dialog.querySelectorAll<HTMLImageElement>('.image-comparison img')]
      await Promise.all(images.map(image => image.decode())); await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      const body = dialog.querySelector('.image-replacement-body')!.getBoundingClientRect(), rect = dialog.getBoundingClientRect()
      const primary = dialog.querySelector<HTMLButtonElement>('footer .primary')!, button = primary.getBoundingClientRect()
      return { width: innerWidth, height: innerHeight, narrow: innerWidth <= 640,
        background: getComputedStyle(dialog).backgroundColor, point: { x: rect.left + 8, y: rect.top + 36 },
        primary: { color: getComputedStyle(primary).backgroundColor, enabled: !primary.disabled, x: button.left + 12, y: button.top + button.height / 2 },
        images: images.map(image => { const bounds = image.getBoundingClientRect(); return { left: Math.max(0, bounds.left, body.left), top: Math.max(0, bounds.top, body.top), right: Math.min(innerWidth, bounds.right, body.right), bottom: Math.min(innerHeight, bounds.bottom, body.bottom) } }) }
    })
    const bytes = Buffer.from(await window.evaluate(async window => (await window.webContents.capturePage()).toPNG().toString('base64')), 'base64')
    const { data, info } = await sharp(bytes).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const scaleX = info.width / regions.width, scaleY = info.height / regions.height
    const match = (offset: number, red: number, green: number, blue: number) => Math.abs(data[offset]! - red) < 12 && Math.abs(data[offset + 1]! - green) < 12 && Math.abs(data[offset + 2]! - blue) < 12
    const pointMatches = (x: number, y: number, color: string) => { const channels = color.match(/[\d.]+/g)?.map(Number); if (!channels || channels.length < 3) return false; const offset = (Math.floor(y * scaleY) * info.width + Math.floor(x * scaleX)) * info.channels; return match(offset, channels[0]!, channels[1]!, channels[2]!) }
    if (!regions.primary.enabled || !pointMatches(regions.point.x, regions.point.y, regions.background) || !pointMatches(regions.primary.x, regions.primary.y, regions.primary.color)) return false
    const visible = regions.narrow ? regions.images.slice(0, 1) : regions.images
    if (!visible.length) return false
    for (const region of visible) {
      let purple = 0, teal = 0
      for (let y = Math.ceil(region.top * scaleY); y < Math.floor(region.bottom * scaleY); y++) for (let x = Math.ceil(region.left * scaleX); x < Math.floor(region.right * scaleX); x++) {
        const offset = (y * info.width + x) * info.channels
        if (match(offset, 129, 96, 179)) purple++
        if (match(offset, 69, 132, 141)) teal++
      }
      if (purple <= 50 || teal <= 50) return false
    }
    bitmap = bytes; return true
  }, { timeout: 20_000 }).toBe(true)
  if (!bitmap) throw new Error('No verified native dialog-image frame')
  return bitmap
}

async function theme(page: Page, value: 'Light' | 'Dark') {
  await page.getByRole('dialog', { name: 'Regenerate illustration' }).getByRole('button', { name: 'Image settings', exact: true }).click()
  await page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Appearance', exact: true }).click()
  await page.getByRole('radio', { name: value, exact: true }).check(); await page.keyboard.press('Escape')
  await expect(page.locator('html')).toHaveAttribute('data-theme', value.toLowerCase())
}
async function prepare() {
  let root = ''; const project = await topicContentProject(value => { root = value }), reader = await readerManifest(project.storage, project.authority)
  await project.storage.publish(project.authority, reader.manifest)
  const images = await startImageFixture([reader.rasters[1], reader.rasters[0]]), text = await startChapterFixture()
  return { ...project, ...reader, root, images, text, profile: join(root, 'replacement-profile') }
}
async function open(desktop: ElectronApplication, path: string) {
  await desktop.evaluate(({ dialog }, path) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] }) }, path)
  const page = await desktop.firstWindow()
  const opened = await page.evaluate(() => window.learning.openProject())
  if (!opened.ok || !opened.data.activeProject) throw new Error('Open failed')
  await page.getByRole('button', { name: 'Beliefs before evidence', exact: true }).click()
  await expect(page.locator('.chapter-illustration')).toHaveCount(2)
  return { page, identity: { projectId: opened.data.activeProject.id, topicId: 'beliefs' } }
}

test('one image candidate keeps the original until explicit Use and restores review after restart', { tag: '@image-regeneration', annotation: { type: 'flow', description: 'image-regeneration' } }, async ({ playwright, flow }) => {
  test.setTimeout(150_000)
  const fixture = await prepare(), originalProject = await readFile(join(fixture.path, '.edu/project.json')), originalMarker = await readFile(join(fixture.path, topicManifestPath('beliefs')))
  const source = join(fixture.path, 'learner.md'); await writeFile(source, 'Unrelated learner bytes')
  let desktop: ElectronApplication | undefined
  const launch = () => playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...environment(), EDU_HARNESS_TEST_DATA_DIR: fixture.profile, EDU_HARNESS_TEST_OPENROUTER_URL: fixture.images.baseUrl, EDU_HARNESS_TEST_PROVIDER_URL: fixture.text.baseUrl } })
  try {
    desktop = await launch(); let { page, identity } = await open(desktop, fixture.path)
    expect(await page.evaluate(() => window.learning.getAccount())).toMatchObject({ ok: true, data: { status: 'disconnected' } })
    expect(await page.evaluate(() => window.learning.saveOpenRouterKey({ key: 'sk-or-fixture-private-key' }))).toMatchObject({ ok: true })
    const trigger = page.locator('.chapter-illustration').first().getByRole('button', { name: /Regenerate illustration/ })
    await trigger.scrollIntoViewIfNeeded(); await trigger.focus(); await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Regenerate illustration' })
    await expect(dialog).toBeVisible(); await theme(page, 'Light')
    await expect(dialog).toContainText('GPT Image 2'); await expect(dialog).toContainText('One image')
    const prompt = 'Draw a labelled updated comparison. Keep the two explanations visible.'
    await dialog.getByLabel('Image prompt', { exact: true }).fill(prompt)
    await flow.capture(desktop, page, 'prompt-light', { verifiedNativeBitmap: await painted(desktop, page) })
    await theme(page, 'Dark'); await flow.capture(desktop, page, 'prompt-dark', { verifiedNativeBitmap: await painted(desktop, page) })
    await dialog.getByRole('button', { name: 'Generate candidate', exact: true }).click()
    await settled(page); await expect(dialog.getByRole('button', { name: 'Use this image', exact: true })).toBeEnabled()
    const candidate = (await state(page, identity)).candidate!
    expect(candidate.asset.digest).toBe(contentDigest(fixture.rasters[1])); expect(await readFile(join(fixture.path, candidate.asset.path))).toEqual(fixture.rasters[1])
    expect(await readFile(join(fixture.path, topicManifestPath('beliefs')))).toEqual(originalMarker)
    expect(fixture.images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(1)
    expect(fixture.images.requests.find(request => request.path === '/api/v1/images')!.body).toMatchObject({ prompt, model: 'openai/gpt-image-2', n: 1, aspect_ratio: '1:1', provider: { only: ['fixture-provider'], allow_fallbacks: false } })
    expect(fixture.text.inferenceRequests).toHaveLength(0)
    expect(await page.evaluate(() => window.learning.setOpenRouterImageModel({ modelId: 'google/gemini-3.1-flash-image' }))).toMatchObject({ ok: true })
    await expect(dialog).toContainText('Original · GPT Image 2'); await expect(dialog).not.toContainText('USD estimated')
    await expect(dialog.getByRole('button', { name: 'Use this image', exact: true })).toBeEnabled(); await expect(dialog.getByRole('button', { name: 'Keep original', exact: true })).toBeEnabled()
    await flow.capture(desktop, page, 'comparison-dark', { verifiedNativeBitmap: await painted(desktop, page) })
    await theme(page, 'Light'); await flow.capture(desktop, page, 'comparison-light', { verifiedNativeBitmap: await painted(desktop, page) })
    // A second image cannot acquire another review while the first candidate is retained.
    await expect(page.locator('.chapter-illustration').nth(1).locator('.chapter-image-regenerate')).toBeDisabled()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await desktop.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]!; window.setContentSize(600, 700); window.webContents.setZoomFactor(2) })
    for (const value of ['Light', 'Dark'] as const) {
      await theme(page, value); await dialog.locator('.image-replacement-body').evaluate(element => { element.scrollTop = 0 })
      await dialog.locator('.image-comparison img').first().scrollIntoViewIfNeeded()
      expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
      await expect(dialog.getByRole('button', { name: 'Keep original', exact: true })).toBeInViewport()
      if (value === 'Light') await flow.capture(desktop, page, 'comparison-narrow-light', { verifiedNativeBitmap: await painted(desktop, page) })
      else await flow.capture(desktop, page, 'comparison-narrow-dark', { verifiedNativeBitmap: await painted(desktop, page) })
    }
    await desktop.close(); desktop = await launch(); ({ page, identity } = await open(desktop, fixture.path))
    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.webContents.setZoomFactor(1))
    expect((await state(page, identity)).candidate?.candidateId).toBe(candidate.candidateId)
    await page.getByRole('button', { name: 'Review retained image', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Regenerate illustration' })).toBeVisible()
    expect(await page.evaluate(() => window.learning.removeOpenRouterKey())).toMatchObject({ ok: true })
    await page.getByLabel('Caption', { exact: true }).fill('An updated comparison of the two explanations.')
    await page.getByLabel('Alternative text', { exact: true }).fill('The labelled bar for explanation A is taller after the illustrative clue.')
    await page.getByRole('button', { name: 'Use this image', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Regenerate illustration' })).not.toBeVisible()
    await expect(page.locator('#topic-heading')).toBeFocused()
    const current = JSON.parse(await readFile(join(fixture.path, topicManifestPath('beliefs')), 'utf8'))
    expect(current.images[1]).toEqual(fixture.manifest.images[1]); expect(current.document).toEqual(fixture.manifest.document)
    expect(current.plan.images[0]).toMatchObject({ prompt, caption: 'An updated comparison of the two explanations.', settings: { n: 1, aspectRatio: '1:1' } })
    expect(current.images[0].asset.previousVersionId).toBe('version-0'); expect(current.previousRevisionIds).toContain(fixture.manifest.revisionId)
    expect(await readFile(join(fixture.path, fixture.manifest.images[0]!.asset!.path))).toEqual(fixture.rasters[0])
    expect(await readFile(join(fixture.path, '.edu/project.json'))).toEqual(originalProject); expect(await readFile(source, 'utf8')).toBe('Unrelated learner bytes')
    const call = await page.evaluate(callId => window.learning.getOpenRouterCall({ callId }), candidate.asset.callId)
    expect(call).toMatchObject({ ok: true, data: { latest: { cost: { kind: 'known', usd: '0.04500000000000001' }, disposition: 'published' } } })
    expect(JSON.stringify(call)).not.toContain(prompt); expect(fixture.text.inferenceRequests).toHaveLength(0)
    expect(fixture.images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(1)
  } finally { await desktop?.close(); await fixture.images.close(); await fixture.text.close(); await rm(fixture.root, { recursive: true, force: true }) }
})

test('replacement faults, cancellation and hostile capabilities preserve originals with zero automatic replay', { tag: '@image-regeneration-recovery', annotation: { type: 'flow', description: 'image-regeneration-recovery' } }, async ({ playwright, flow }, info) => {
  test.setTimeout(180_000)
  const fixture = await prepare(), originalMarker = await readFile(join(fixture.path, topicManifestPath('beliefs')))
  let desktop: ElectronApplication | undefined
  let profile = fixture.profile
  const launch = () => playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...environment(), EDU_HARNESS_TEST_DATA_DIR: profile, EDU_HARNESS_TEST_OPENROUTER_URL: fixture.images.baseUrl, EDU_HARNESS_TEST_PROVIDER_URL: fixture.text.baseUrl } })
  try {
    desktop = await launch(); let { page, identity } = await open(desktop, fixture.path)
    expect(await page.evaluate(() => window.learning.saveOpenRouterKey({ key: 'sk-or-fixture-private-key' }))).toMatchObject({ ok: true })
    const request = { ...identity, chapterId: fixture.manifest.chapterId, revisionId: fixture.manifest.revisionId, imageId: 'diagram-0', expectedImageVersionId: 'version-0', prompt: 'Show an updated labelled comparison.' }
    for (const channel of ['topic-content:image-replacement', 'topic-content:accept-image-replacement', 'topic-content:discard-image-replacement', 'topic-content:retry-image-replacement-save']) {
      const rejection = await desktop.evaluate(({ ipcMain }, channel) => {
        const handler = (ipcMain as unknown as { _invokeHandlers: Map<string, (event: unknown, payload: unknown) => Promise<unknown>> })._invokeHandlers.get(channel)!
        return handler({ sender: { id: -9 }, senderFrame: { url: 'https://hostile.invalid/' } }, {})
      }, channel)
      expect(rejection).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
    }
    expect(await page.evaluate(request => window.learning.generateTopicImageReplacement({ ...request, key: 'not-allowed' } as typeof request), request)).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
    for (const fault of ['intent', 'requested', 'terminal', 'candidate'] as const) {
      // Intent/terminal corruption deliberately blocks later paid calls in that profile.
      // Each independent fault therefore has its own ledger, while project recovery persists.
      await desktop.close(); profile = join(fixture.root, `fault-profile-${fault}`); desktop = await launch(); ({ page, identity } = await open(desktop, fixture.path))
      request.projectId = identity.projectId
      expect(await page.evaluate(() => window.learning.saveOpenRouterKey({ key: 'sk-or-fixture-private-key' }))).toMatchObject({ ok: true })
      const posts = fixture.images.requests.filter(request => request.path === '/api/v1/images').length
      await imageWriteGate(desktop, join(fixture.root, `gate-${fault}`), fault, true, undefined, 'image-replacement')
      await page.evaluate(request => window.learning.generateTopicImageReplacement(request), request); await settled(page)
      const snapshot = await state(page, identity)
      expect(fixture.images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(posts + (fault === 'intent' || fault === 'requested' ? 0 : 1))
      expect(await readFile(join(fixture.path, topicManifestPath('beliefs')))).toEqual(originalMarker)
      if (fault === 'candidate') {
        expect(snapshot.replacement?.status).toBe('unsaved'); await page.getByRole('button', { name: 'Review retained image', exact: true }).click()
        await expect(page.getByRole('button', { name: 'Retry save', exact: true })).toBeEnabled(); await flow.capture(desktop, page, 'candidate-save-recovery')
        const before = fixture.images.requests.length
        await page.getByRole('button', { name: 'Retry save', exact: true }).click();
        await expect(page.getByLabel('Caption', { exact: true })).toHaveValue(/.+/); await expect(page.getByLabel('Alternative text', { exact: true })).toHaveValue(/.+/)
        await expect(page.getByRole('button', { name: 'Use this image', exact: true })).toBeEnabled()
        expect(fixture.images.requests).toHaveLength(before)
        await page.keyboard.press('Escape'); await expect(page.getByRole('dialog', { name: 'Regenerate illustration' })).not.toBeVisible()
      } else {
        if (fault === 'terminal') {
          const before = fixture.images.requests.length; await desktop.close(); desktop = await launch(); ({ page, identity } = await open(desktop, fixture.path)); expect(fixture.images.requests).toHaveLength(before)
          expect((await state(page, identity)).replacement?.status).toBe('interrupted')
        }
        const snapshot = await state(page, identity)
        if (snapshot.replacement) expect(await page.evaluate(request => window.learning.discardTopicImageReplacement(request), reviewRequest(identity, snapshot))).toMatchObject({ ok: true })
      }
      await releaseWriteGate(desktop)
    }
    // Removing actual original raster bytes still permits repair using its current metadata/version.
    await rm(join(fixture.path, fixture.manifest.images[0]!.asset!.path))
    await page.getByRole('button', { name: 'Reload saved content', exact: true }).click()
    await page.locator('.chapter-illustration').first().getByRole('button', { name: /Regenerate illustration/ }).click()
    await expect(page.getByRole('dialog', { name: 'Regenerate illustration' })).toContainText('Original illustration unavailable')
    await page.getByRole('button', { name: 'Generate candidate', exact: true }).click(); await settled(page)
    let snapshot = await state(page, identity)
    const marker = join(fixture.path, topicCandidatePath(snapshot.candidate!.candidateId)), candidateBytes = await readFile(marker)
    const acceptedPosts = fixture.images.requests.filter(request => request.path === '/api/v1/images').length
    await imageWriteGate(desktop, join(fixture.root, 'publication-save-gate'), 'publication', true, snapshot.candidate!.asset.callId!, 'image-replacement')
    await page.getByRole('button', { name: 'Use this image', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Retry save', exact: true })).toBeEnabled()
    expect(await readFile(join(fixture.path, topicManifestPath('beliefs')))).toEqual(originalMarker)
    await page.getByRole('button', { name: 'Retry save', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Regenerate illustration' })).not.toBeVisible()
    expect(fixture.images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(acceptedPosts)
    await releaseWriteGate(desktop)
    expect(await readFile(marker).catch(() => null)).toBeNull(); expect(candidateBytes.length).toBeGreaterThan(0)
    await expect.poll(() => page.locator('.chapter-illustration img').first().evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(900)
    // Explicit dialog close reaches cancellation while metadata preparation is still held.
    fixture.images.failMetadata(true); await page.evaluate(() => window.learning.refreshOpenRouterMetadata()); fixture.images.failMetadata(false); fixture.images.holdMetadata()
    const posts = fixture.images.requests.filter(request => request.path === '/api/v1/images').length
    const discoveries = fixture.images.requests.filter(request => request.path === '/api/v1/images/models').length
    await page.locator('.chapter-illustration').first().getByRole('button', { name: /Regenerate illustration/ }).click()
    await page.getByRole('button', { name: 'Generate candidate', exact: true }).click()
    await expect.poll(async () => { const result = await page.evaluate(() => window.learning.getAiActivity()); return result.ok ? result.data.active?.kind : null }).toBe('regenerate-topic-image')
    await expect.poll(() => fixture.images.requests.filter(request => request.path === '/api/v1/images/models').length).toBeGreaterThan(discoveries)
    await page.getByRole('button', { name: 'Close image dialog', exact: true }).click()
    await expect.poll(async () => { const result = await page.evaluate(() => window.learning.getAiActivity()); return result.ok ? result.data.active?.phase : null }).toBe('cancelling')
    expect(await page.evaluate(() => window.learning.testSolModel())).toMatchObject({ ok: false, error: { code: 'BUSY' } })
    expect(await page.evaluate(() => window.learning.removeOpenRouterKey())).toMatchObject({ ok: false, error: { code: 'BUSY' } })
    fixture.images.releaseMetadata(); await settled(page); await expect(page.getByRole('dialog', { name: 'Regenerate illustration' })).not.toBeVisible()
    expect(fixture.images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(posts)
    expect(fixture.text.inferenceRequests).toHaveLength(0)
    snapshot = await state(page, identity); expect(snapshot.replacement).toBeUndefined()
    const current = await page.evaluate(identity => window.learning.getTopicContent(identity), identity)
    if (!current.ok || !current.data) throw new Error('Current chapter missing')
    const currentAsset = current.data.images[0]!.asset!
    await page.evaluate(request => window.learning.generateTopicImageReplacement(request), { ...identity, chapterId: current.data.identity.chapterId, revisionId: current.data.identity.revisionId, imageId: currentAsset.imageId, expectedImageVersionId: currentAsset.versionId, prompt: 'A retained review before folder authority changes.' }); await settled(page)
    const retained = await state(page, identity), retainedBytes = await readFile(join(fixture.path, topicCandidatePath(retained.candidate!.candidateId)))
    const reviewTrigger = page.getByRole('button', { name: 'Review retained image', exact: true })
    const focus = await desktopFocusDiagnostics(desktop, page, reviewTrigger, info)
    try {
      await focus.sample('before-review-click'); await reviewTrigger.click()
      await focus.sample('after-review-click')
      const readonly = await workspaceSnapshot(page); readonly.activeProject!.writable = false
      await desktop.evaluate(({ BrowserWindow }, snapshot) => BrowserWindow.getAllWindows()[0]!.webContents.send('workspace:changed', snapshot), readonly)
      await expect(page.getByRole('dialog', { name: 'Regenerate illustration' })).toContainText('read-only')
      await expect(page.getByRole('button', { name: 'Use this image', exact: true })).toBeDisabled()
      await focus.sample('readonly-dialog'); await page.keyboard.press('Escape')
      await focus.sample('after-escape'); await expect(page.getByRole('dialog', { name: 'Regenerate illustration' })).not.toBeVisible()
      expect(await readFile(join(fixture.path, topicCandidatePath(retained.candidate!.candidateId)))).toEqual(retainedBytes)
      await expect(reviewTrigger).toBeFocused()
    } finally { await focus.attach() }
    await desktop.evaluate(({ BrowserWindow }, snapshot) => BrowserWindow.getAllWindows()[0]!.webContents.send('workspace:changed', snapshot), await workspaceSnapshot(page))
    await page.getByRole('button', { name: 'Review retained image', exact: true }).click()
    const document = JSON.parse(await readFile(join(fixture.path, '.edu/project.json'), 'utf8'))
    document.revision++; document.outline.document.lessons = document.outline.document.lessons.filter((topic: { id: string }) => topic.id !== 'beliefs'); document.outline.document.startingLessonId = document.outline.document.lessons[0].id
    await writeFile(join(fixture.path, '.edu/project.json'), JSON.stringify(document))
    await page.evaluate(projectId => window.learning.selectProject({ projectId }), identity.projectId)
    await expect(page.getByRole('dialog', { name: 'Regenerate illustration' })).not.toBeVisible()
    await expect(page.locator('#topic-heading')).toHaveCount(0)
    expect(await readFile(join(fixture.path, topicCandidatePath(retained.candidate!.candidateId)))).toEqual(retainedBytes)
    expect(fixture.text.inferenceRequests).toHaveLength(0)
  } finally { if (desktop) { await releaseWriteGate(desktop).catch(() => {}); await desktop.close() } await fixture.images.close(); await fixture.text.close(); await rm(fixture.root, { recursive: true, force: true }) }
})

test('global replacement admission waits for actual utility exit and exact durable billing in both orders', { tag: '@image-regeneration-barriers', annotation: { type: 'flow', description: 'image-regeneration-barriers' } }, async ({ playwright }) => {
  test.setTimeout(120_000)
  const fixture = await prepare(); let desktop: ElectronApplication | undefined
  try {
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...environment(), EDU_HARNESS_TEST_DATA_DIR: fixture.profile, EDU_HARNESS_TEST_OPENROUTER_URL: fixture.images.baseUrl, EDU_HARNESS_TEST_PROVIDER_URL: fixture.text.baseUrl } })
    const { page, identity } = await open(desktop, fixture.path)
    expect(await page.evaluate(() => window.learning.saveOpenRouterKey({ key: 'sk-or-fixture-private-key' }))).toMatchObject({ ok: true })
    for (const order of ['exit-first', 'write-first'] as const) {
      const posts = fixture.images.requests.filter(request => request.path === '/api/v1/images').length
      await holdImageExit(desktop); await imageWriteGate(desktop, join(fixture.root, `billing-${order}`), 'terminal', false, undefined, 'image-replacement')
      await page.evaluate(request => window.learning.generateTopicImageReplacement(request), { ...identity, chapterId: fixture.manifest.chapterId, revisionId: fixture.manifest.revisionId, imageId: 'diagram-0', expectedImageVersionId: 'version-0', prompt: 'A distinct replacement diagram.' })
      await expect.poll(async () => (await writeGateState(desktop!)).held).toBe(true)
      const callId = (await writeGateState(desktop)).callId!
      await page.evaluate(async () => { const state = await window.learning.getAiActivity(); if (!state.ok || !state.data.active) throw new Error('No owner'); (globalThis as unknown as { ownedCancel: Promise<unknown> }).ownedCancel = window.learning.cancelAiOperation({ operationId: state.data.active.operationId }) })
      await expect.poll(async () => (await barrierState(desktop!, 'exitBarrier')).held).toBe(true)
      const pid = (await barrierState(desktop, 'exitBarrier')).pid!
      await expect.poll(() => { try { process.kill(pid, 0); return false } catch { return true } }).toBe(true)
      expect(await page.evaluate(() => window.learning.testSolModel())).toMatchObject({ ok: false, error: { code: 'BUSY' } })
      if (order === 'exit-first') await releaseBarrier(desktop, 'exitBarrier')
      else {
        await releaseWriteGate(desktop)
        await expect.poll(async () => { const call = await page.evaluate(callId => window.learning.getOpenRouterCall({ callId }), callId); return call.ok ? call.data.latest?.cost.kind : null }).toBe('known')
      }
      expect(await page.evaluate(() => window.learning.testSolModel())).toMatchObject({ ok: false, error: { code: 'BUSY' } })
      if (order === 'exit-first') await releaseWriteGate(desktop); else await releaseBarrier(desktop, 'exitBarrier')
      expect(await page.evaluate(() => (globalThis as unknown as { ownedCancel: Promise<unknown> }).ownedCancel)).toMatchObject({ ok: true })
      await settled(page); const snapshot = await state(page, identity)
      expect(snapshot.candidate).toBeNull(); expect(snapshot.replacement).toBeTruthy()
      expect(await page.evaluate(request => window.learning.discardTopicImageReplacement(request), reviewRequest(identity, snapshot))).toMatchObject({ ok: true })
      const call = await page.evaluate(callId => window.learning.getOpenRouterCall({ callId }), callId)
      expect(call).toMatchObject({ ok: true, data: { latest: { cost: { kind: 'known', usd: '0.04500000000000001' }, disposition: 'discarded' } } })
      expect(fixture.images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(posts + 1)
    }
    expect(fixture.text.inferenceRequests).toHaveLength(0)
  } finally { if (desktop) { await releaseWriteGate(desktop).catch(() => {}); await releaseBarrier(desktop, 'exitBarrier').catch(() => {}); await desktop.close() } await fixture.images.close(); await fixture.text.close(); await rm(fixture.root, { recursive: true, force: true }) }
})
