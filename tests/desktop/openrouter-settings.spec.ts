import { expect, test } from '../flows/fixture'
import type { ElectronApplication } from '@playwright/test'
import { mkdtemp, readFile, readdir, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startSettingsFixture } from '../fixtures/openrouter-settings'
import { createOpenRouterLedger } from '../../src/main/openrouter/ledger'
import type { OpenRouterApi } from '../../src/shared/openrouter'
import type { AiApi } from '../../src/shared/ai/activity'
import { setDesktopAppearance } from '../fixtures/desktop-appearance'
import { startImageFixture } from '../fixtures/image-provider'
import { startChapterFixture } from '../fixtures/chapter-provider'
import { topicContentProject } from '../fixtures/topic-content'
import { writeFile } from 'node:fs/promises'
import type { AccountApi } from '../../src/shared/account'
import type { WorkspaceApi } from '../../src/shared/workspace'
import type { TopicChapterApi } from '../../src/shared/topic-content'

const environment = () => Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>

test('sectioned settings preserves secrets, exact costs and durable filtered request history without inference', { tag: '@openrouter-settings', annotation: { type: 'flow', description: 'openrouter-settings' } }, async ({ playwright, flow }) => {
  test.setTimeout(120_000)
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-router-settings-'))), profile = join(root, 'profile'), fixture = await startSettingsFixture()
  let desktop: ElectronApplication | undefined
  // Seed two validated historical image records; this journey performs only metadata HTTP.
  const ledger = createOpenRouterLedger(join(profile, 'openrouter/calls')), at = new Date().toISOString()
  await ledger.initialize()
  for (const id of ['known-image', 'unknown-image']) {
    await ledger.intent({ schemaVersion: 1, id, startedAt: at, connectionEpoch: 'historical-fixture', endpoint: 'images', purpose: 'chapter-image', operationId: 'historical-operation', runId: 'historical-run', context: { projectId: 'portable-fixture', topicId: 'topic', projectName: 'Learning about evidence', topicTitle: 'Priors and observations' }, modelId: 'openai/gpt-image-2', estimate: { kind: 'unknown', reason: 'Historical estimate was unavailable.' } })
    await ledger.transition(id, { recordedAt: at, status: 'succeeded', httpStatus: 200, errorCode: null, generationId: null, returnedModelId: 'openai/gpt-image-2', cost: id === 'known-image' ? { kind: 'known', usd: '0.123456789123456789', source: 'response', recordedAt: at } : { kind: 'unknown' }, disposition: id === 'known-image' ? 'discarded' : 'save-failed' })
  }
  const launch = () => playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...environment(), EDU_HARNESS_TEST_DATA_DIR: profile, EDU_HARNESS_TEST_OPENROUTER_URL: fixture.baseUrl } })
  try {
    desktop = await launch(); let page = await desktop.firstWindow()
    const api = () => page.evaluate(() => (window as unknown as { learning: OpenRouterApi }).learning.getOpenRouterSettings())
    const noInference = async () => { expect(await page.evaluate(() => (window as unknown as { learning: AiApi }).learning.getAiActivity())).toMatchObject({ ok: true, data: { active: null, settled: null } }); await expect(page.locator('.ai-panel')).toHaveCount(0) }
    expect(fixture.requests).toHaveLength(0)
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
    await expect(dialog.getByRole('heading', { name: 'OpenRouter', exact: true })).toBeVisible()
    await expect(dialog.getByText('No key saved', { exact: true })).toBeVisible()
    const key = page.locator('#openrouter-key')
    await key.fill('unsaved-fixture-key')
    await page.getByRole('button', { name: 'Appearance', exact: true }).click()
    await page.getByRole('radio', { name: 'Light', exact: true }).check()
    await page.getByRole('button', { name: 'OpenRouter', exact: true }).click()
    await expect(key).toHaveValue('unsaved-fixture-key')
    await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused()
    await page.getByRole('button', { name: 'Settings', exact: true }).click(); await expect(key).toHaveValue('')
    await key.fill('valid-fixture-key'); await page.getByRole('button', { name: 'Save key', exact: true }).click()
    await expect(key).toHaveValue(''); await expect(dialog.getByText('Key connected', { exact: true })).toBeVisible()
    await expect(dialog.getByText('$0.045 USD estimated', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Advertised per-image prices for selected compatible providers;', { exact: false })).toBeVisible()
    await expect(dialog.locator('.settings-estimate')).toContainText('1 image, aspect ratio 1:1; no reference images.')
    await expect(dialog.locator('.settings-estimate')).not.toContainText('output_image')
    expect(fixture.requests).toHaveLength(6); expect(fixture.requests.every(request => !request.path.endsWith('/images'))).toBe(true)
    await noInference()
    const storedKey = await readFile(join(profile, 'openrouter/openrouter-key.json'))
    await key.fill('invalid-fixture-key'); await page.getByRole('button', { name: 'Replace key', exact: true }).click()
    await expect(dialog.getByRole('alert')).toContainText('The key could not be validated.')
    expect(await readFile(join(profile, 'openrouter/openrouter-key.json'))).toEqual(storedKey)
    expect(fixture.requests).toHaveLength(7); await key.fill('')
    await desktop.evaluate(({ ipcMain }) => {
      type Handler = (event: unknown, payload: unknown) => Promise<unknown>
      const handlers = (ipcMain as unknown as { _invokeHandlers: Map<string, Handler> })._invokeHandlers, original = handlers.get('openrouter:image-configuration')!
      let failed = false
      handlers.set('openrouter:image-configuration', async (event, payload) => { if (!failed) { failed = true; return { ok: false, error: { code: 'UNAVAILABLE', message: 'Fixture quote unavailable.' } } }; return original(event, payload) })
    })
    await page.locator('#openrouter-model').selectOption('bytedance-seed/seedream-5-0-pro')
    await expect.poll(api).toMatchObject({ ok: true, data: { imageModelId: 'bytedance-seed/seedream-5-0-pro' } })
    await expect(dialog.locator('.settings-estimate')).toContainText('Estimate unavailable'); await expect(dialog.locator('.settings-estimate')).not.toContainText('Checking cached estimate')
    expect(fixture.requests).toHaveLength(7)
    fixture.omitSelected(true); await page.getByRole('button', { name: 'Refresh metadata', exact: true }).click()
    await expect(dialog.getByText('This fixed image model is absent from the catalog.', { exact: true })).toBeVisible()
    await expect(page.locator('#openrouter-model')).toHaveValue('bytedance-seed/seedream-5-0-pro')
    await expect(page.locator('#openrouter-model option')).toHaveCount(3)
    await dialog.getByText('This fixed image model is absent from the catalog.', { exact: true }).scrollIntoViewIfNeeded()
    await flow.capture(desktop, page, 'settings-unavailable-light')
    await page.locator('#openrouter-model').selectOption('openai/gpt-image-2')
    fixture.omitSelected(false)
    for (let index = 0; index < 9; index++) { await page.getByRole('button', { name: 'Refresh metadata', exact: true }).click(); await expect(page.getByRole('button', { name: 'Refresh metadata', exact: true })).toBeEnabled() }
    await expect.poll(async () => { const result = await page.evaluate(() => (window as unknown as { learning: OpenRouterApi }).learning.listOpenRouterCalls({ limit: 100 })); return result.ok ? result.data.calls.length : 0 }).toBeGreaterThan(50)
    await dialog.getByRole('heading', { name: 'Usage', exact: true }).scrollIntoViewIfNeeded()
    await expect(dialog.locator('.settings-spend').first()).toContainText('$0.123456789123456789 USD')
    await expect(dialog.locator('.settings-spend').first()).toContainText('Unresolved costs1')
    await expect(dialog.getByText('Key-wide figures may include other applications.', { exact: false })).toBeVisible()
    await flow.capture(desktop, page, 'settings-usage-light')
    const history = dialog.locator('.settings-history')
    await expect(history.locator('li')).toHaveCount(50)
    const failHistoryOnce = () => desktop!.evaluate(({ ipcMain }) => {
      type Handler = (event: unknown, payload: unknown) => Promise<unknown>
      const handlers = (ipcMain as unknown as { _invokeHandlers: Map<string, Handler> })._invokeHandlers, original = handlers.get('openrouter:list-calls')!
      let failed = false
      handlers.set('openrouter:list-calls', async (event, payload) => { if (!failed) { failed = true; return { ok: false, error: { code: 'STORAGE', message: 'Fixture history read failed.' } } }; return original(event, payload) })
    })
    await failHistoryOnce()
    await page.getByRole('button', { name: 'Next requests', exact: true }).click(); await expect(dialog.getByText('Page 2', { exact: true })).toBeVisible()
    await expect(history.locator('li')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Next requests', exact: true })).toBeDisabled()
    await expect(dialog.getByText('Request history could not be loaded.', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Retry history', exact: true }).click(); await expect(history.locator('li').first()).toBeVisible()
    await page.getByRole('button', { name: 'Previous requests', exact: true }).click(); await expect(dialog.getByText('Page 1', { exact: true })).toBeVisible()
    await failHistoryOnce()
    await dialog.getByLabel('Purpose', { exact: true }).selectOption('chapter-image'); await page.getByRole('button', { name: 'Apply filters', exact: true }).click()
    await expect(dialog.getByText('Request history could not be loaded.', { exact: true })).toBeVisible(); await expect(history.locator('li')).toHaveCount(0)
    await page.getByRole('button', { name: 'Retry history', exact: true }).click()
    await expect(history.locator('li')).toHaveCount(2)
    await history.getByRole('button', { name: /Cost unknown/ }).click()
    await expect(dialog.locator('.router-detail')).toContainText('Unknown; not counted as zero')
    await expect(dialog.locator('.router-detail')).toContainText('save failed')
    await dialog.locator('.router-detail').scrollIntoViewIfNeeded(); await flow.capture(desktop, page, 'settings-history-light')
    await history.getByRole('button', { name: /\$0\.123456789123456789/ }).click()
    await expect(dialog.locator('.router-detail')).toContainText('discarded'); await expect(dialog.locator('.router-detail')).toContainText('response')
    await dialog.getByLabel('Model', { exact: true }).selectOption('bytedance-seed/seedream-5-0-pro'); await page.getByRole('button', { name: 'Apply filters', exact: true }).click(); await expect(history).toContainText('No requests match')
    await dialog.getByLabel('Model', { exact: true }).selectOption(''); await dialog.getByLabel('Outcome', { exact: true }).selectOption('failed'); await page.getByRole('button', { name: 'Apply filters', exact: true }).click(); await expect(history).toContainText('No requests match')
    await dialog.getByLabel('Outcome', { exact: true }).selectOption(''); await dialog.getByLabel('From (UTC)', { exact: true }).fill('2099-01-01'); await dialog.getByLabel('Through (UTC)', { exact: true }).fill('2099-01-02'); await page.getByRole('button', { name: 'Apply filters', exact: true }).click(); await expect(history).toContainText('No requests match')
    await dialog.getByLabel('From (UTC)', { exact: true }).fill(''); await dialog.getByLabel('Through (UTC)', { exact: true }).fill(''); await page.getByRole('button', { name: 'Apply filters', exact: true }).click(); await expect(history.locator('li')).toHaveCount(2)
    const httpBefore = fixture.requests.length
    await noInference(); expect(fixture.requests).toHaveLength(httpBefore)
    fixture.failDiscovery(true); await page.getByRole('button', { name: 'Refresh metadata', exact: true }).click()
    await expect(dialog.getByRole('alert')).toContainText('Last-known values are retained.')
    await expect(dialog.getByText('· Last-known values; stale', { exact: false })).toBeVisible()
    await expect(dialog.getByText('$0.045 USD estimated', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Appearance', exact: true }).click(); await page.getByRole('radio', { name: 'Dark', exact: true }).check(); await page.getByRole('button', { name: 'OpenRouter', exact: true }).click()
    await dialog.getByRole('heading', { name: 'OpenRouter', exact: true }).scrollIntoViewIfNeeded(); await flow.capture(desktop, page, 'settings-stale-dark')
    fixture.failDiscovery(false)
    // A real held key-validation reply crosses close/reopen. Its ACK cannot clear the new draft.
    await key.fill('held-fixture-key'); await page.getByRole('button', { name: 'Replace key', exact: true }).click(); await expect.poll(() => fixture.held).toBe(true)
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Settings', exact: true }).click(); await key.fill('new-session-draft')
    fixture.release(); await expect.poll(api).toMatchObject({ ok: true, data: { connection: 'connected' } }); await expect(page.getByRole('button', { name: 'Replace key', exact: true })).toBeEnabled(); await expect(key).toHaveValue('new-session-draft')
    // Hold native showModal during reopening, then deliver an old close event while controlled open is true.
    await page.evaluate(() => {
      const state = window as unknown as { releaseSettingsModal?: () => void }
      const dialog = document.querySelector<HTMLDialogElement>('.settings-dialog')!, original = dialog.showModal.bind(dialog)
      dialog.showModal = () => { state.releaseSettingsModal = original }
    })
    await page.getByRole('button', { name: 'Close settings', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { releaseSettingsModal?: () => void }).releaseSettingsModal))).toBe(true)
    await page.evaluate(() => document.querySelector('.settings-dialog')!.dispatchEvent(new Event('close')))
    await page.evaluate(() => { const state = window as unknown as { releaseSettingsModal: () => void }; state.releaseSettingsModal(); const dialog = document.querySelector<HTMLDialogElement>('.settings-dialog')!; delete (dialog as unknown as { showModal?: () => void }).showModal })
    await expect(dialog).toBeVisible(); await key.fill('preserved-after-old-close'); await page.evaluate(() => document.querySelector('.settings-dialog')!.dispatchEvent(new Event('close'))); await expect(key).toHaveValue('preserved-after-old-close')
    await page.getByRole('button', { name: 'Close settings', exact: true }).focus(); await page.keyboard.press('Shift+Tab'); await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeFocused(); await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Close settings', exact: true })).toBeFocused()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await desktop.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]!; window.setContentSize(600, 640); window.webContents.setZoomFactor(2) })
    await expect(dialog).toBeVisible(); expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect(await dialog.locator('.settings-content').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await key.scrollIntoViewIfNeeded(); await expect(key).toBeInViewport(); await page.getByRole('button', { name: 'Replace key', exact: true }).scrollIntoViewIfNeeded(); await expect(page.getByRole('button', { name: 'Replace key', exact: true })).toBeInViewport(); await flow.capture(desktop, page, 'settings-narrow-dark')
    for (const name of ['Refresh metadata', 'Remove key', 'Apply filters', 'Previous requests']) { const button = page.getByRole('button', { name, exact: true }); await button.scrollIntoViewIfNeeded(); await expect(button).toBeInViewport() }
    await page.getByRole('button', { name: 'Appearance', exact: true }).click(); await page.getByRole('radio', { name: 'Light', exact: true }).check(); await page.getByRole('button', { name: 'OpenRouter', exact: true }).click(); await page.getByRole('button', { name: 'Replace key', exact: true }).scrollIntoViewIfNeeded(); await flow.capture(desktop, page, 'settings-narrow-light')
    await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused()
    // Settings/categories/filters/theme changes do not add a navigation visit.
    await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Forward', exact: true })).toBeDisabled()
    await noInference()
    const countBeforeRestart = fixture.requests.length
    await desktop.close(); desktop = await launch(); page = await desktop.firstWindow(); expect(fixture.requests).toHaveLength(countBeforeRestart)
    await page.getByRole('button', { name: 'Settings', exact: true }).click(); await expect(page.locator('#openrouter-model')).toHaveValue('openai/gpt-image-2'); await expect(page.locator('#openrouter-key')).toHaveValue('')
    await page.getByRole('button', { name: 'Remove key', exact: true }).click(); await expect(page.getByText('No key saved', { exact: true })).toBeVisible()
    await expect(page.locator('.settings-spend').first()).toContainText('$0.123456789123456789 USD'); await noInference()
    const calls = await page.evaluate(() => (window as unknown as { learning: OpenRouterApi }).learning.listOpenRouterCalls({ limit: 100 })); expect(calls.ok && calls.data.calls.some(call => call.intent.id === 'unknown-image')).toBe(true)
    const dto = JSON.stringify([await api(), calls]); for (const forbidden of ['valid-fixture-key', 'invalid-fixture-key', 'held-fixture-key', 'sk-or-private-label', 'sk-or-unsafe-error', 'private.invalid', fixture.baseUrl]) expect(dto).not.toContain(forbidden)
    await page.keyboard.press('Escape'); await setDesktopAppearance(page, 'Dark')
    await desktop.close(); desktop = await launch(); page = await desktop.firstWindow(); expect(await api()).toMatchObject({ ok: true, data: { connection: 'absent', spend: { allTimeUsd: '0.123456789123456789', unresolvedCount: 1 } } }); expect(fixture.requests).toHaveLength(countBeforeRestart)
    const logs = await readdir(join(profile, 'logs'))
    const diagnostics = (await Promise.all(logs.filter(name => name.endsWith('.jsonl')).map(name => readFile(join(profile, 'logs', name), 'utf8')))).join('\n')
    for (const secret of ['valid-fixture-key', 'invalid-fixture-key', 'held-fixture-key', 'new-session-draft', 'preserved-after-old-close', 'sk-or-unsafe-error', 'private.invalid']) expect(diagnostics).not.toContain(secret)
  } finally { fixture.release(); await desktop?.close(); await fixture.close(); await rm(root, { recursive: true, force: true }) }
})

test('provider mutations show BUSY while a real chapter image lease is active and Appearance remains usable', { tag: '@openrouter-settings-admission', annotation: { type: 'flow', description: 'openrouter-settings-admission' } }, async ({ playwright }) => {
  test.setTimeout(90_000)
  let root = '', desktop: ElectronApplication | undefined
  const text = await startChapterFixture(), images = await startImageFixture(); images.delay(20_000)
  try {
    const project = await topicContentProject(value => { root = value })
    project.document.selectedModel = { id: 'fixture-model', name: 'Fixture learning model' }; project.document.outline!.model = project.document.selectedModel
    await writeFile(join(project.path, '.edu/project.json'), JSON.stringify(project.document))
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...environment(), EDU_HARNESS_TEST_DATA_DIR: join(root, 'desktop-profile'), EDU_HARNESS_TEST_PROVIDER_URL: text.baseUrl, EDU_HARNESS_TEST_OPENROUTER_URL: images.baseUrl } })
    await desktop.evaluate(({ dialog, shell }, path) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] }); shell.openExternal = async url => { await fetch(url) } }, project.path)
    const page = await desktop.firstWindow()
    const opened = await page.evaluate(() => (window as unknown as { learning: WorkspaceApi }).learning.openProject()); if (!opened.ok || !opened.data.activeProject) throw new Error('Fixture project failed to open')
    const projectId = opened.data.activeProject.id
    await page.evaluate(() => (window as unknown as { learning: AccountApi }).learning.connectAccount())
    await expect.poll(async () => { const result = await page.evaluate(() => (window as unknown as { learning: AccountApi }).learning.getAccount()); return result.ok ? result.data.modelsStatus : 'error' }).toBe('ready')
    await page.getByRole('button', { name: 'Settings', exact: true }).click(); await page.locator('#openrouter-key').fill('active-fixture-key'); await page.getByRole('button', { name: 'Save key', exact: true }).click(); await expect(page.locator('#openrouter-key')).toHaveValue(''); await page.keyboard.press('Escape')
    expect(await page.evaluate(projectId => (window as unknown as { learning: TopicChapterApi }).learning.generateTopicContent({ projectId, topicId: 'beliefs', mode: 'illustrated', replace: false, expectedRevisionId: null }), projectId)).toMatchObject({ ok: true })
    await expect.poll(() => images.requests.filter(request => request.path === '/api/v1/images').length, { timeout: 30_000 }).toBe(1)
    await page.getByRole('button', { name: 'Settings', exact: true }).click(); await page.getByRole('button', { name: 'Remove key', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Settings', exact: true }).getByRole('alert')).toContainText('An image operation or another settings change is using this connection.')
    await page.getByRole('button', { name: 'Appearance', exact: true }).click(); await page.getByRole('radio', { name: 'Dark', exact: true }).check(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.keyboard.press('Escape')
    const active = await page.evaluate(() => (window as unknown as { learning: AiApi }).learning.getAiActivity()); if (!active.ok || !active.data.active) throw new Error('Expected owned image operation')
    expect(await page.evaluate(operationId => (window as unknown as { learning: AiApi }).learning.cancelAiOperation({ operationId }), active.data.active.operationId)).toMatchObject({ ok: true })
    await expect.poll(async () => { const result = await page.evaluate(() => (window as unknown as { learning: AiApi }).learning.getAiActivity()); return result.ok ? result.data.active : 'error' }).toBeNull()
    expect(images.requests.filter(request => request.path === '/api/v1/images')).toHaveLength(1)
    await page.getByRole('button', { name: 'Settings', exact: true }).click(); await page.getByRole('button', { name: 'OpenRouter', exact: true }).click(); await page.getByRole('button', { name: 'Remove key', exact: true }).click(); await expect(page.getByText('No key saved', { exact: true })).toBeVisible()
  } finally { await desktop?.close(); await text.close(); await images.close(); if (root) await rm(root, { recursive: true, force: true }) }
})
