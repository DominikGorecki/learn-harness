import { expect, test } from '../flows/fixture'
import type { ElectronApplication, Locator, Page } from '@playwright/test'
import sharp from 'sharp'
import { readFile, rm, writeFile, rename } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { topicContentProject } from '../fixtures/topic-content'
import { readerManifest, educationalRasters } from '../fixtures/chapter-reader'
import { startImageFixture } from '../fixtures/image-provider'
import { startChapterFixture } from '../fixtures/chapter-provider'
import { setDesktopAppearance } from '../fixtures/desktop-appearance'
import { workspaceSnapshot } from '../fixtures/desktop-navigation'
import { aiActivity } from '../fixtures/ai-activity'

const environment = () => Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
async function paintedIllustration(desktop: ElectronApplication, page: Page, image: Locator) {
  const window = await desktop.browserWindow(page)
  let verified: Buffer | null = null
  // DOM visibility/native dimensions alone do not establish a painted raster.
  await expect.poll(async () => {
    try {
      await image.evaluate(async element => {
        await (element as HTMLImageElement).decode()
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      })
      // Native capture uses physical pixels correctly at Electron zoom, just as
      // the configured flow reporter does; locator crops use CSS coordinates.
      const encoded = await window.evaluate(async window => (await window.webContents.capturePage()).toPNG().toString('base64'))
      const bitmap = Buffer.from(encoded, 'base64')
      const { data, info } = await sharp(bitmap).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      let purple = 0, teal = 0
      for (let offset = 0; offset < data.length; offset += info.channels) {
        const matches = (red: number, green: number, blue: number) => Math.abs(data[offset]! - red) < 12 && Math.abs(data[offset + 1]! - green) < 12 && Math.abs(data[offset + 2]! - blue) < 12
        if (matches(129, 96, 179)) purple++
        if (matches(69, 132, 141)) teal++
      }
      if (purple > 50 && teal > 50) { verified = bitmap; return true }
      return false
    } catch { return false } // Explicit media reload may replace the old element.
  }).toBe(true)
  if (!verified) throw new Error('No painted native illustration frame')
  return verified
}
async function holdReply(desktop: ElectronApplication, channel: string, projectId?: string, cursor?: string) {
  await desktop.evaluate(({ ipcMain }, options) => {
    type Handler = (event: unknown, payload: { projectId?: string; sectionCursor?: string }) => Promise<unknown>
    const handlers = (ipcMain as unknown as { _invokeHandlers: Map<string, Handler> })._invokeHandlers, original = handlers.get(options.channel)!
    const host = globalThis as unknown as { readerGates?: Record<string, { held: boolean; restore(): void }> }; host.readerGates ??= {}
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve })
    host.readerGates[options.channel] = { held: false, restore() { handlers.set(options.channel, original); release() } }
    handlers.set(options.channel, async (event, payload) => {
      const reply = await original(event, payload)
      if ((!options.projectId || options.projectId === payload.projectId) && (!options.cursor || options.cursor === payload.sectionCursor)) { handlers.set(options.channel, original); host.readerGates![options.channel]!.held = true; await gate }
      return reply
    })
  }, { channel, projectId, cursor })
}
async function releaseReplies(desktop: ElectronApplication) { await desktop.evaluate(() => { const host = globalThis as unknown as { readerGates?: Record<string, { restore(): void }> }; Object.values(host.readerGates ?? {}).forEach(gate => gate.restore()) }) }

test('illustrated chapters read offline through bounded pages, relocation and delayed current-content history', { tag: '@chapter-reader', annotation: { type: 'flow', description: 'chapter-reader' } }, async ({ playwright, flow }) => {
  test.setTimeout(120_000)
  const roots: string[] = [], first = await topicContentProject(root => roots.push(root)), second = await topicContentProject(root => roots.push(root), { projectId: 'other-portable-project', name: 'Other learning' })
  const prepared = await readerManifest(first.storage, first.authority), other = await readerManifest(second.storage, second.authority, 'Other project chapter')
  await first.storage.publish(first.authority, prepared.manifest); await second.storage.publish(second.authority, other.manifest)
  const images = await startImageFixture(prepared.rasters), text = await startChapterFixture()
  const projectBytes = await readFile(join(first.path, '.edu/project.json')), sourcePath = join(first.path, 'unrelated.md'); await writeFile(sourcePath, 'Unrelated source remains unchanged.')
  const profile = join(first.root, 'reader-profile')
  let desktop: ElectronApplication | undefined
  const launch = () => playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...environment(), EDU_HARNESS_TEST_DATA_DIR: profile, EDU_HARNESS_TEST_OPENROUTER_URL: images.baseUrl, EDU_HARNESS_TEST_PROVIDER_URL: text.baseUrl } })
  try {
    desktop = await launch(); let page = await desktop.firstWindow()
    const choose = async (path: string) => desktop!.evaluate(({ dialog }, path) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] }) }, path)
    await choose(first.path); await page.getByRole('main').getByRole('button', { name: 'Open project', exact: true }).click()
    await page.getByRole('button', { name: 'Beliefs before evidence', exact: true }).click()
    await expect(page.locator('#topic-heading')).toHaveText(prepared.manifest.plan.title)
    await expect(page.locator('main')).toHaveAttribute('data-presentation-ready', 'true')
    await expect(page.locator('.chapter-section')).toHaveCount(7)
    await expect.poll(() => page.locator('.chapter-illustration img').first().evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(900)
    expect(await page.evaluate(() => (window as unknown as { readerExecuted?: boolean }).readerExecuted)).toBeUndefined()
    await expect(page.locator('main script, main a[href^="http"], main img[src^="http"]')).toHaveCount(0)
    await flow.capture(desktop, page, 'chapter-light')
    const handle = (await workspaceSnapshot(page)).activeProject!.id
    await page.getByRole('navigation', { name: 'Chapter contents' }).getByRole('button', { name: 'Apply the idea' }).focus(); await page.keyboard.press('Enter')
    const section = page.locator('[data-focus-anchor="chapter-section:reading-6"]')
    await expect(section).toBeFocused()
    const position = await page.locator('main').evaluate(element => element.scrollTop)
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await holdReply(desktop, 'topic-content:get', handle, 'reading-4')
    await page.getByRole('button', { name: 'Forward', exact: true }).click()
    await expect.poll(() => desktop!.evaluate(() => (globalThis as unknown as { readerGates?: Record<string, { held: boolean }> }).readerGates?.['topic-content:get']?.held)).toBe(true)
    await expect(page.locator('main')).toHaveAttribute('data-presentation-ready', 'false')
    await expect(page.locator('.chapter-section')).toHaveCount(0)
    await releaseReplies(desktop)
    await expect(section).toBeFocused(); await expect.poll(() => page.locator('main').evaluate(element => element.scrollTop)).toBe(position)
    // Provider snapshots are no-history updates and cannot reset manual reading position.
    const provider = await page.evaluate(() => window.learning.getOpenRouterSettings())
    if (!provider.ok) throw new Error('Settings unavailable')
    await desktop.evaluate(({ BrowserWindow }, settings) => BrowserWindow.getAllWindows()[0]!.webContents.send('openrouter:changed', { ...settings, revision: settings.revision + 1 }), provider.data)
    await expect.poll(() => page.locator('main').evaluate(element => element.scrollTop)).toBe(position)
    await choose(second.path); await page.getByRole('button', { name: 'Choose project folder' }).click()
    await expect(page.locator('.workspace-title')).toHaveText('Other learning')
    const otherHandle = (await workspaceSnapshot(page)).activeProject!.id
    expect(otherHandle).not.toBe(handle)
    await holdReply(desktop, 'topic-content:state', otherHandle)
    await page.getByRole('button', { name: 'Beliefs before evidence', exact: true }).click()
    await expect.poll(() => desktop!.evaluate(() => (globalThis as unknown as { readerGates?: Record<string, { held: boolean }> }).readerGates?.['topic-content:state']?.held)).toBe(true)
    await expect(page.locator('main')).not.toContainText(prepared.manifest.plan.title)
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await holdReply(desktop, 'topic-content:get', handle, 'reading-4')
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.locator('main')).toHaveAttribute('data-presentation-ready', 'false')
    await expect(page.locator('.chapter-section')).toHaveCount(0)
    await releaseReplies(desktop)
    await expect(page.locator('#topic-heading')).toHaveText(prepared.manifest.plan.title); await expect(section).toBeFocused()
    await expect(page.locator('main')).not.toContainText('Other project chapter')
    await expect(page.getByRole('button', { name: 'Forward', exact: true })).toBeEnabled()
    await setDesktopAppearance(page, 'Dark'); await page.locator('main').evaluate(element => { element.scrollTop = 0 }); await flow.capture(desktop, page, 'chapter-dark')
    const figure = page.locator('.chapter-illustration').first()
    await figure.scrollIntoViewIfNeeded(); await expect(figure.locator('img')).toBeInViewport(); await expect(figure.locator('figcaption')).toBeInViewport(); await flow.capture(desktop, page, 'chapter-illustration-dark', { verifiedNativeBitmap: await paintedIllustration(desktop, page, figure.locator('img')) })
    await setDesktopAppearance(page, 'Light'); await figure.scrollIntoViewIfNeeded(); await expect(figure.locator('figcaption')).toBeInViewport(); await flow.capture(desktop, page, 'chapter-illustration-light', { verifiedNativeBitmap: await paintedIllustration(desktop, page, figure.locator('img')) }); await setDesktopAppearance(page, 'Dark')
    // An exact saved file can be restored and retried without generating a replacement.
    const asset = prepared.manifest.images[0]!.asset!, assetPath = join(first.path, asset.path), pixels = await readFile(assetPath)
    await rm(assetPath); await page.getByRole('button', { name: 'Reload saved content', exact: true }).click()
    await expect(page.locator('main')).toContainText('Illustration unavailable')
    await figure.scrollIntoViewIfNeeded(); await expect(figure.getByRole('status')).toBeInViewport(); await expect(figure.locator('figcaption')).toBeInViewport(); await flow.capture(desktop, page, 'chapter-missing')
    await writeFile(assetPath, pixels); await page.getByRole('button', { name: 'Reload saved content', exact: true }).click()
    await expect.poll(() => page.locator('.chapter-illustration img').first().evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(900)
    const readonly = await workspaceSnapshot(page); readonly.activeProject!.writable = false; readonly.activeProject!.issue = 'This project is read-only. Saved chapters remain readable.'
    await desktop.evaluate(({ BrowserWindow }, snapshot) => BrowserWindow.getAllWindows()[0]!.webContents.send('workspace:changed', snapshot), readonly)
    await expect(page.getByRole('button', { name: 'Regenerate content', exact: true })).toBeDisabled()
    await page.locator('main').evaluate(element => { element.scrollTop = 0 }); await flow.capture(desktop, page, 'chapter-readonly')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await desktop.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]!; window.setContentSize(600, 700); window.webContents.setZoomFactor(2) })
    await page.getByRole('button', { name: 'Regenerate content', exact: true }).scrollIntoViewIfNeeded(); await expect(page.getByRole('button', { name: 'Regenerate content', exact: true })).toBeInViewport(); await expect(page.getByRole('button', { name: 'Regenerate content', exact: true })).toBeDisabled()
    await page.getByRole('navigation', { name: 'Chapter contents' }).scrollIntoViewIfNeeded(); await expect(page.getByRole('navigation', { name: 'Chapter contents' }).getByRole('button').first()).toBeInViewport()
    for (const theme of ['Dark', 'Light'] as const) { await setDesktopAppearance(page, theme); await figure.scrollIntoViewIfNeeded(); await expect(figure.locator('img')).toBeInViewport(); await expect(figure.locator('figcaption')).toBeInViewport(); expect(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true); const verifiedNativeBitmap = await paintedIllustration(desktop, page, figure.locator('img')); if (theme === 'Dark') await flow.capture(desktop, page, 'chapter-narrow-dark', { verifiedNativeBitmap }); else await flow.capture(desktop, page, 'chapter-narrow-light', { verifiedNativeBitmap }) }
    expect(images.requests).toHaveLength(0); expect(text.inferenceRequests).toHaveLength(0); expect((await aiActivity(page)).active).toBeNull(); expect((await aiActivity(page)).settled).toBeNull()
    expect(await readFile(join(first.path, '.edu/project.json'))).toEqual(projectBytes); expect(await readFile(sourcePath, 'utf8')).toBe('Unrelated source remains unchanged.')
    await desktop.close(); desktop = undefined
    const relocated = join(first.root, 'relocated'); await rename(first.path, relocated)
    desktop = await launch(); page = await desktop.firstWindow()
    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.webContents.setZoomFactor(1))
    await choose(relocated); await page.getByRole('button', { name: 'Choose project folder' }).click()
    await page.getByRole('button', { name: 'Beliefs before evidence', exact: true }).click(); await expect(page.locator('#topic-heading')).toHaveText(prepared.manifest.plan.title)
    await expect.poll(() => page.locator('.chapter-illustration img').first().evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(900)
    expect(images.requests).toHaveLength(0); expect(text.inferenceRequests).toHaveLength(0); expect(await readFile(join(relocated, '.edu/project.json'))).toEqual(projectBytes)
  } finally { if (desktop) await releaseReplies(desktop); await desktop?.close(); await images.close(); await text.close(); for (const root of roots) await rm(root, { recursive: true, force: true }) }
})

test('chapter commands preserve saved prose, retry storage without inference and explicitly recover uncertain images', { tag: '@chapter-commands', annotation: { type: 'flow', description: 'chapter-commands' } }, async ({ playwright, flow }) => {
  test.setTimeout(150_000)
  let root = '', desktop: ElectronApplication | undefined
  const text = await startChapterFixture(), images = await startImageFixture(await educationalRasters()); images.alternateImages()
  try {
    const project = await topicContentProject(value => { root = value })
    project.document.selectedModel = { id: 'fixture-model', name: 'Learning model' }; project.document.outline!.model = project.document.selectedModel
    await writeFile(join(project.path, '.edu/project.json'), JSON.stringify(project.document)); await writeFile(join(project.path, 'notes.md'), 'Original learning source.')
    const original = await readFile(join(project.path, '.edu/project.json'))
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...environment(), EDU_HARNESS_TEST_DATA_DIR: join(root, 'command-profile'), EDU_HARNESS_TEST_PROVIDER_URL: text.baseUrl, EDU_HARNESS_TEST_OPENROUTER_URL: images.baseUrl } })
    await desktop.evaluate(({ dialog, shell }, path) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] }); shell.openExternal = async url => { await fetch(url) } }, project.path)
    const page = await desktop.firstWindow(), main = page.locator('main')
    await main.getByRole('button', { name: 'Open project', exact: true }).click(); await page.getByRole('button', { name: 'Beliefs before evidence', exact: true }).click()
    await expect(main.getByRole('button', { name: 'Generate Content', exact: true })).toBeEnabled()
    await expect(main).toContainText('Up to six planned images'); expect(images.requests).toHaveLength(0); expect(text.inferenceRequests).toHaveLength(0)
    await flow.capture(desktop, page, 'chapter-preflight')
    await page.getByRole('button', { name: 'Settings', exact: true }).click(); await page.getByRole('button', { name: 'Appearance', exact: true }).click(); await page.keyboard.press('Escape')
    await main.getByRole('button', { name: 'OpenRouter settings', exact: true }).click(); await expect(page.getByRole('button', { name: 'OpenRouter', exact: true })).toHaveAttribute('aria-current', 'page'); await page.keyboard.press('Escape'); await expect(main.getByRole('button', { name: 'OpenRouter settings', exact: true })).toBeFocused()
    await page.evaluate(() => window.learning.connectAccount())
    await expect.poll(async () => { const reply = await page.evaluate(() => window.learning.getAccount()); return reply.ok ? reply.data.modelsStatus : null }).toBe('ready')
    // Fail only the first actual manifest marker write; checkpoint persistence remains real.
    await desktop.evaluate(async (_, samplePath) => {
      const fs = process.getBuiltinModule('fs/promises') as typeof import('node:fs/promises'), sample = await fs.open(samplePath, 'wx'), prototype = Object.getPrototypeOf(sample) as { writeFile: typeof sample.writeFile }, original = prototype.writeFile
      await sample.close(); (globalThis as unknown as { restoreReaderWrite?: () => void }).restoreReaderWrite = () => { prototype.writeFile = original }
      prototype.writeFile = async function (...args) { if (typeof args[0] === 'string') { let manifest = false; try { const value = JSON.parse(args[0]); manifest = Boolean(value.document?.sections && value.outputDirectory && value.baseline) } catch { /* Other writes remain real. */ } if (manifest) { prototype.writeFile = original; throw new Error('Owned fixture marker failure') } } return original.apply(this, args) }
    }, join(root, 'write-probe'))
    await main.getByRole('button', { name: 'Generate text only', exact: true }).click()
    await expect(main.getByRole('button', { name: 'Retry save', exact: true })).toBeEnabled({ timeout: 30_000 })
    await expect(main).toContainText('Validated chapter is not saved yet'); await flow.capture(desktop, page, 'chapter-unsaved')
    const requests = text.inferenceRequests.length; expect(requests).toBe(5); expect(images.requests).toHaveLength(0)
    await main.getByRole('button', { name: 'Retry save', exact: true }).click()
    await expect(main).toContainText('Text-only chapter saved'); await expect(page.locator('.ai-panel')).toContainText('Accepted draft · Saved')
    expect(text.inferenceRequests).toHaveLength(requests); expect(images.requests).toHaveLength(0)
    await page.evaluate(() => window.learning.disconnectAccount())
    await main.getByRole('button', { name: 'OpenRouter settings', exact: true }).click(); await page.locator('#openrouter-key').fill('fixture-private-key'); await page.getByRole('button', { name: 'Save key', exact: true }).click(); await expect(page.locator('#openrouter-key')).toHaveValue(''); await page.keyboard.press('Escape')
    images.failNext(402)
    await main.getByRole('button', { name: 'Complete images', exact: true }).click()
    await expect(main.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled({ timeout: 30_000 })
    await expect(main).toContainText('prior request may have been charged'); await flow.capture(desktop, page, 'chapter-progress')
    const imageCalls = images.requests.filter(request => request.path === '/api/v1/images').length; expect(imageCalls).toBe(2)
    await main.getByRole('button', { name: 'Continue', exact: true }).click(); await expect(main.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
    expect(images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(imageCalls); expect(text.inferenceRequests).toHaveLength(requests)
    const retry = main.getByRole('button', { name: 'Retry image illustration-0', exact: true }); await expect(retry).toBeDisabled()
    await main.getByRole('checkbox', { name: 'I understand a new request may add a charge.' }).check(); await retry.click()
    await expect(main).toContainText('Illustrated chapter saved', { timeout: 30_000 }); expect(images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(3); expect(text.inferenceRequests).toHaveLength(requests)
    await expect.poll(() => main.locator('.chapter-illustration img').first().evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(900)
    await main.evaluate(element => { element.scrollTop = 0 }); await flow.capture(desktop, page, 'chapter-generated')
    await page.evaluate(() => window.learning.connectAccount()); await expect.poll(async () => { const reply = await page.evaluate(() => window.learning.getAccount()); return reply.ok ? reply.data.modelsStatus : null }).toBe('ready')
    await main.getByRole('button', { name: 'Regenerate content', exact: true }).click(); await expect(page.getByRole('dialog', { name: 'Regenerate this chapter?' })).toBeVisible(); await page.keyboard.press('Escape'); await expect(main.getByRole('button', { name: 'Regenerate content', exact: true })).toBeFocused(); expect(text.inferenceRequests).toHaveLength(requests)
    text.hold(true)
    await main.getByRole('button', { name: 'Regenerate content', exact: true }).click(); await page.getByRole('dialog', { name: 'Regenerate this chapter?' }).getByRole('button', { name: 'Regenerate content', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled(); await expect(main).toContainText('Illustrated chapter saved'); await expect(main.locator('.chapter-section')).toHaveCount(2)
    await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await expect(page.locator('.ai-panel')).toContainText('Request cancelled'); text.hold(false)
    await page.getByRole('button', { name: 'Review your request', exact: true }).click(); await expect(page.getByRole('dialog', { name: 'Edit topic', exact: true })).not.toBeVisible(); await expect(page.locator('#topic-heading')).toHaveText('Reasoning about starting beliefs')
    const beforeReplacement = text.inferenceRequests.length
    await main.getByRole('button', { name: 'Regenerate text only', exact: true }).click(); await page.getByRole('dialog', { name: 'Regenerate this chapter?' }).getByRole('button', { name: 'Regenerate content', exact: true }).click()
    await expect(main).toContainText('Text-only chapter saved', { timeout: 30_000 }); expect(text.inferenceRequests.length).toBe(beforeReplacement + 5); expect(images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(3)
    expect(await readFile(join(project.path, '.edu/project.json'))).toEqual(original); expect(await readFile(join(project.path, 'notes.md'), 'utf8')).toBe('Original learning source.')
  } finally { if (desktop) await desktop.evaluate(() => (globalThis as unknown as { restoreReaderWrite?: () => void }).restoreReaderWrite?.()); await desktop?.close(); await images.close(); await text.close(); if (root) await rm(root, { recursive: true, force: true }) }
})
