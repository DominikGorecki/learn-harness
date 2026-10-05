import { expect, test } from '../flows/fixture'
import type { ElectronApplication } from '@playwright/test'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'
import type { AccountApi } from '../../src/shared/account'
import type { AiApi } from '../../src/shared/ai/activity'
import type { WorkspaceApi } from '../../src/shared/workspace'
import type { GenerationApi } from '../../src/shared/generation'

test('extra choices survive restart while independent diagnostic evidence resets', { tag: '@model-access', annotation: { type: 'flow', description: 'model-access' } }, async ({ playwright, flow }) => {
  // This journey includes the 30-second silent waiting hint, a genuine
  // 31-second receiving response, and restart.
  // Keep the suite's normal 45-second limit unchanged.
  test.setTimeout(150_000)
  const fixture = await startChatGPTFixture({ modelTestMode: 'failed' })
  const root = await mkdtemp(join(tmpdir(), 'edu-model-test-'))
  const project = join(root, 'Learning project')
  await mkdir(project)
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  const launch = () => playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env,
    EDU_HARNESS_TEST_DATA_DIR: join(root, 'profile'), EDU_HARNESS_TEST_PROVIDER_URL: fixture.baseUrl } })
  let desktop: ElectronApplication | undefined
  try {
    desktop = await launch()
    await desktop.evaluate(({ shell, dialog }, folder) => {
      shell.openExternal = async url => { await fetch(url) }
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] })
    }, project)
    let page = await desktop.firstWindow()
    await page.getByRole('button', { name: 'Account settings' }).click()
    await page.getByRole('button', { name: 'Continue with ChatGPT' }).click()
    await expect(page.getByText('4 model choices for your projects')).toBeVisible()
    expect(fixture.inferenceRequests).toHaveLength(0)
    // Runtime IPC rejects renderer-supplied model IDs or destinations.
    const malformed = await desktop.evaluate(async ({ BrowserWindow, ipcMain }) => {
      const window = BrowserWindow.getAllWindows()[0]!
      const handlers = (ipcMain as unknown as { _invokeHandlers: Map<string, (event: unknown, payload: unknown) => Promise<unknown>> })._invokeHandlers
      return Promise.all(['account:test-sol', 'account:test-luna'].map(channel => handlers.get(channel)!(
        { sender: window.webContents, senderFrame: window.webContents.mainFrame }, { model: 'other-model', url: 'https://example.test' })))
    })
    expect(malformed).toMatchObject([{ ok: false, error: { code: 'INVALID_INPUT' } }, { ok: false, error: { code: 'INVALID_INPUT' } }])
    expect(fixture.inferenceRequests).toHaveLength(0)
    await page.getByRole('button', { name: 'Test GPT-6.1 Sol', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Connected to ChatGPT' })).not.toBeVisible()
    await expect(page.locator('#ai-operation-heading')).toBeFocused()
    await expect(page.locator('.ai-panel')).toContainText('Testing GPT-6.1 Sol')
    await expect(page.getByRole('alert')).toContainText('This model is not available', { timeout: 35_000 })
    await flow.capture(desktop, page, 'model-test-failed')
    expect(fixture.inferenceRequests).toHaveLength(1)
    await page.getByRole('button', { name: 'Dismiss AI activity' }).click()
    await expect(page.locator('#dashboard-heading')).toBeFocused()
    await page.getByRole('main').getByRole('button', { name: 'Open project' }).click()
    await page.getByRole('button', { name: 'Account settings' }).click()

    fixture.options.modelTestMode = 'hold'
    const savedBytes = async () => readFile(join(project, '.edu', 'project.json'), 'utf8').catch(error => { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error })
    const beforeDiagnostic = await savedBytes()
    await page.getByRole('button', { name: 'Test GPT-6.1 Sol', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Model test evidence', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create outline', exact: true })).toBeDisabled()
    await expect(page.locator('.ai-panel').getByLabel('Model test evidence')).not.toContainText('Bayesian')
    await expect.poll(() => fixture.inferenceRequests.length).toBe(2)
    const pending = await page.evaluate(async () => {
      const api = (globalThis as unknown as { learning: AccountApi & AiApi & WorkspaceApi & GenerationApi }).learning
      const workspace = await api.getWorkspace()
      if (!workspace.ok || !workspace.data.activeProject) throw new Error('Expected the open project')
      return { duplicate: await api.testSolModel(), competing: await api.testLunaModel(), activity: await api.getAiActivity(),
        outline: await api.createOutline({ projectId: workspace.data.activeProject.id, modelId: 'fixture-model', brief: 'Learn probability', replace: false }) }
    })
    expect(pending.duplicate).toMatchObject({ ok: true, data: { modelTestStatus: 'testing' } })
    expect(pending.competing).toMatchObject({ ok: false, error: { code: 'BUSY' } })
    expect(pending.outline).toMatchObject({ ok: false, error: { code: 'BUSY' } })
    expect(pending.activity).toMatchObject({ ok: true, data: { active: { kind: 'test-sol' } } })
    if (pending.activity.ok) expect(pending.activity.data.active).not.toHaveProperty('projectId')
    expect(fixture.inferenceRequests).toHaveLength(2)
    expect(await savedBytes()).toBe(beforeDiagnostic)
    const waitingHint = page.locator('.ai-panel').getByText('Waiting for the next update…', { exact: false })
    await expect(waitingHint).toBeVisible({ timeout: 35_000 })
    await waitingHint.scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled()
    expect(fixture.inferenceRequests).toHaveLength(2)
    expect(await savedBytes()).toBe(beforeDiagnostic)
    await flow.capture(desktop, page, 'model-test-waiting-hint')
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.locator('.ai-panel').getByText('Model test cancelled.', { exact: false })).toBeVisible({ timeout: 35_000 })
    await page.getByRole('button', { name: 'Account settings' }).click()
    await expect(page.getByText('4 model choices for your projects')).toBeVisible()
    await expect.poll(() => desktop!.evaluate(({ app }) => app.getAppMetrics().filter(metric => metric.name === 'Learning model access').length)).toBe(0)

    fixture.options.modelTestMode = 'slow-completed'
    const started = Date.now()
    await page.getByRole('button', { name: 'Test GPT-6.1 Sol', exact: true }).click()
    await expect(page.locator('#ai-operation-heading')).toBeFocused()
    expect(Date.now() - started).toBeLessThan(5_000)
    await expect.poll(() => fixture.inferenceRequests.length).toBe(3)
    await expect.poll(async () => {
      const state = await page.evaluate(async () => (globalThis as unknown as { learning: AiApi }).learning.getAiActivity())
      return state.ok ? state.data.active?.preview : null
    }).toMatchObject({ kind: 'model-test-evidence', hasReply: true, completed: false, modelMatched: false })
    await page.getByRole('button', { name: 'Projects', exact: true }).first().click()
    await expect(page.locator('#dashboard-heading')).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'An outline is still in progress' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled()
    await flow.capture(desktop, page, 'model-test-dashboard-waiting')
    await page.getByRole('main').getByRole('button', { name: /Learning project/ }).click()
    await page.getByRole('button', { name: 'Account settings' }).click()
    await expect(page.getByRole('button', { name: 'Cancel model test' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.ai-panel').getByText('GPT-6.1 Sol replied successfully.', { exact: false })).toBeVisible({ timeout: 35_000 })
    expect(Date.now() - started).toBeGreaterThan(30_000)
    await page.getByRole('button', { name: 'Account settings' }).click()
    await expect(page.getByText('4 model choices for your projects')).toBeVisible()
    await expect(page.getByRole('button', { name: 'GPT-6.1 Sol verified', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Test GPT-6 Luna', exact: true })).toBeEnabled()
    fixture.options.modelTestMode = 'completed'
    await page.getByRole('button', { name: 'Test GPT-6 Luna', exact: true }).click()
    await expect(page.locator('.ai-panel').getByText('GPT-6 Luna replied successfully.', { exact: false })).toBeVisible({ timeout: 35_000 })
    await expect(page.locator('#ai-operation-heading')).toContainText('GPT-6 Luna')
    await page.getByRole('button', { name: 'Account settings' }).click()
    await expect(page.getByRole('button', { name: 'GPT-6 Luna verified', exact: true })).toBeDisabled()
    expect(fixture.inferenceRequests.at(-1)?.model).toBe('gpt-6-luna')
    await page.getByRole('button', { name: 'Refresh models', exact: true }).click()
    await expect(page.getByText('4 model choices for your projects')).toBeVisible()
    const state = await page.evaluate(async () => (globalThis as unknown as { learning: AccountApi }).learning.getAccount())
    expect(JSON.stringify(state)).not.toContain('fixture-access')
    expect(JSON.stringify(state)).not.toContain('RAW SECRET')
    await flow.capture(desktop, page, 'model-test-verified-light')
    await page.locator('html').evaluate(element => element.setAttribute('data-theme', 'dark'))
    await flow.capture(desktop, page, 'model-test-verified-dark')
    await page.keyboard.press('Escape')
    await page.getByLabel('Project model').selectOption('gpt-6.1-sol')
    await expect.poll(async () => {
      try { return JSON.parse(await readFile(join(project, '.edu', 'project.json'), 'utf8')).selectedModel.id }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error }
    }).toBe('gpt-6.1-sol')
    expect(fixture.inferenceRequests).toHaveLength(4)
    for (const request of fixture.inferenceRequests) {
      expect(request).toMatchObject({ stream: true, store: false })
      expect(request).not.toHaveProperty('tools')
      expect(JSON.stringify(request)).not.toMatch(/Learning project|fixture-access|RAW SECRET/)
    }
    await desktop.close(); desktop = undefined
    desktop = await launch()
    page = await desktop.firstWindow()
    await page.getByRole('navigation', { name: 'Projects', exact: true }).getByRole('button', { name: 'Learning project', exact: true }).click()
    await expect(page.getByLabel('Project model')).toHaveValue('gpt-6.1-sol')
    await expect(page.getByLabel('Project model').getByRole('option', { name: 'GPT-6.1 Sol', exact: true })).toHaveCount(1)
    await expect(page.getByLabel('Project model').getByRole('option', { name: 'GPT-6 Luna', exact: true })).toHaveCount(1)
    await page.getByRole('button', { name: 'Account settings' }).click()
    await expect(page.getByText('4 model choices for your projects')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Test GPT-6.1 Sol', exact: true })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Test GPT-6 Luna', exact: true })).toBeEnabled()
    expect(fixture.inferenceRequests).toHaveLength(4)
  } finally {
    await desktop?.close()
    await fixture.close()
    await rm(root, { recursive: true, force: true })
  }
})
