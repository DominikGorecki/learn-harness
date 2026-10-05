import { expect, test } from '../flows/fixture'
import type { ElectronApplication } from '@playwright/test'
import { mkdir, mkdtemp, readFile, readdir, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'

test('development logs collect main, renderer and preload telemetry without content or a public log API', { tag: '@diagnostics', annotation: { type: 'flow', description: 'diagnostics' } }, async ({ playwright }) => {
  const profile = await mkdtemp(join(tmpdir(), 'edu-logging-desktop-'))
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  const desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env, EDU_HARNESS_TEST_DATA_DIR: profile } })
  let closed = false
  const logText = async () => {
    const logs = join(profile, 'logs')
    return (await Promise.all((await readdir(logs)).filter(name => name.endsWith('.jsonl')).map(name => readFile(join(logs, name), 'utf8')))).join('')
  }
  try {
    const page = await desktop.firstWindow()
    await expect(page.getByRole('heading', { name: 'What would you like to understand?' })).toBeVisible()
    await desktop.evaluate(() => { console.error(new Error('LOG_PRIVATE_MAIN_TOKEN')) })
    await page.evaluate(() => {
      const browser = globalThis as unknown as {
        dispatchEvent(event: unknown): void
        ErrorEvent: new (type: string, data: Record<string, unknown>) => unknown
        PromiseRejectionEvent: new (type: string, data: Record<string, unknown>) => unknown
      }
      console.warn('LOG_PRIVATE_RENDERER_TEXT')
      browser.dispatchEvent(new browser.ErrorEvent('error', { error: new TypeError('LOG_PRIVATE_ERROR'), message: 'LOG_PRIVATE_ERROR', lineno: 123, colno: 4 }))
      browser.dispatchEvent(new browser.PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: new Error('LOG_PRIVATE_REJECTION') }))
    })
    await expect.poll(async () => (await logText()).includes('renderer.error')).toBe(true)
    await expect.poll(async () => (await logText()).includes('renderer.rejection')).toBe(true)
    await desktop.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0]!
      window.webContents.emit('preload-error', {}, '/private/preload-path', new Error('LOG_PRIVATE_PRELOAD'))
    })
    const keys = await page.evaluate(() => Object.keys((globalThis as unknown as { learning: object }).learning))
    expect(keys.some(key => /log|diagnostic|ipc|file/i.test(key))).toBe(false)
    await desktop.close(); closed = true
    const text = await logText()
    for (const privateValue of ['LOG_PRIVATE_', '/private/preload-path']) expect(text).not.toContain(privateValue)
    const entries = text.trim().split('\n').map(line => JSON.parse(line))
    expect(entries.map(entry => entry.event)).toEqual(expect.arrayContaining(['session.started', 'app.ready', 'window.loaded', 'ipc.completed', 'preload.failed', 'app.stopping']))
    expect(entries.find(entry => entry.event === 'renderer.error').data).toMatchObject({ line: 123, column: 4 })
    expect(entries.filter(entry => entry.event === 'console.output').map(entry => entry.source)).toEqual(expect.arrayContaining(['main', 'renderer']))
    const started = entries.find(entry => entry.event === 'ipc.started')
    expect(entries.find(entry => entry.event === 'ipc.completed' && entry.data.requestId === started.data.requestId)).toBeTruthy()
  } finally {
    if (!closed) await desktop.close()
    await rm(profile, { recursive: true, force: true })
  }
})

test('model and utility diagnostics retain transport evidence and request correlation while excluding learner data', { tag: '@inference-diagnostics', annotation: { type: 'flow', description: 'inference-diagnostics' } }, async ({ playwright }) => {
  const fixture = await startChatGPTFixture()
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-log-generation-')))
  const folder = join(root, 'LOG_PRIVATE_FOLDER'), profile = join(root, 'profile')
  await mkdir(folder)
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  let desktop: ElectronApplication | undefined
  try {
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env,
      EDU_HARNESS_TEST_DATA_DIR: profile, EDU_HARNESS_TEST_PROVIDER_URL: fixture.baseUrl } })
    await desktop.evaluate(({ dialog, shell }, selected) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] })
      shell.openExternal = async url => { await fetch(url) }
    }, folder)
    const page = await desktop.firstWindow()
    await page.getByRole('main').getByRole('button', { name: 'Open project' }).click()
    await page.getByRole('textbox').fill('LOG_PRIVATE_LEARNING_GOAL')
    await page.getByRole('button', { name: 'Account settings' }).click()
    await page.getByRole('button', { name: 'Continue with ChatGPT' }).click()
    await expect(page.getByText('4 model choices for your projects')).toBeVisible()
    await page.getByRole('button', { name: 'Test GPT-6.1 Sol', exact: true }).click()
    await expect(page.getByRole('button', { name: 'GPT-6.1 Sol verified', exact: true })).toBeDisabled()
    await page.keyboard.press('Escape')
    await page.getByLabel('Project model').selectOption('fixture-model')
    await page.getByRole('button', { name: 'Create outline', exact: true }).click()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    const savedPath = join(folder, '.edu/project.json')
    const logs = join(profile, 'logs')
    const logText = async () => (await Promise.all((await readdir(logs)).filter(name => name.endsWith('.jsonl')).map(name => readFile(join(logs, name), 'utf8')))).join('')
    fixture.options.inferenceMode = 'hold'
    await page.getByRole('button', { name: 'Refine learning direction' }).click()
    await page.getByRole('textbox').fill('LOG_PRIVATE_REVISED_GOAL')
    const startRevision = async () => {
      await page.getByRole('button', { name: 'Create new outline', exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Create new outline', exact: true }).click()
    }
    await startRevision()
    await expect.poll(() => fixture.inferenceRequests.length).toBe(3)
    // Refining the brief is an intentional existing save before generation starts.
    const original = await readFile(savedPath, 'utf8')
    await expect.poll(async () => {
      const entries = (await logText()).trim().split('\n').map(line => JSON.parse(line))
      const worker = entries.filter(entry => entry.event === 'worker.started').at(-1)
      return entries.filter(entry => entry.event === 'worker.health' && entry.data.workerId === worker?.data.workerId).length
    }, { timeout: 10_000 }).toBeGreaterThanOrEqual(2)
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByText('Outline creation cancelled. Your previous outline is unchanged.', { exact: true })).toBeVisible()
    await expect.poll(() => desktop!.evaluate(({ app }) => app.getAppMetrics().filter(metric => metric.name === 'Learning outline').length)).toBe(0)
    expect(await readFile(savedPath, 'utf8')).toBe(original)
    await startRevision()
    await expect.poll(() => fixture.inferenceRequests.length).toBe(4)
    const beforeWorkerLoss = await readFile(savedPath, 'utf8')
    await desktop.evaluate(({ app }) => {
      const worker = app.getAppMetrics().find(metric => metric.name === 'Learning outline')
      if (!worker) throw new Error('Expected the owned outline worker')
      process.kill(worker.pid)
    })
    await expect(page.getByText('The outline process stopped unexpectedly. Your previous work is unchanged.', { exact: true })).toBeVisible()
    await expect.poll(() => desktop!.evaluate(({ app }) => app.getAppMetrics().filter(metric => metric.name === 'Learning outline').length)).toBe(0)
    expect(await readFile(savedPath, 'utf8')).toBe(beforeWorkerLoss)
    await desktop.close(); desktop = undefined
    const text = await logText()
    for (const secret of ['LOG_PRIVATE_', 'fixture-access', 'fixture-refresh', 'learner@example.test', 'Test Learner', 'Bayesian reasoning', fixture.baseUrl]) expect(text).not.toContain(secret)
    const entries = text.trim().split('\n').map(line => JSON.parse(line))
    expect(entries.find(entry => entry.event === 'model.test').data).toMatchObject({ requestedModel: 'gpt-6.1-sol', httpStatus: 200, outcome: 'verified' })
    const worker = entries.find(entry => entry.event === 'worker.started')
    expect(worker.data.workerId).toBeTruthy()
    expect(worker.data.requestId).toBeTruthy()
    expect(entries.some(entry => entry.event === 'ipc.started' && entry.data.requestId === worker.data.requestId)).toBe(true)
    const events = entries.filter(entry => entry.data.workerId === worker.data.workerId)
    expect(events.map(entry => entry.event)).toEqual(expect.arrayContaining(['worker.spawned', 'worker.health', 'engine.request', 'engine.response', 'engine.transport', 'engine.terminal', 'engine.tool', 'worker.completed', 'worker.exited']))
    expect(events.every(entry => entry.data.requestId === worker.data.requestId)).toBe(true)
    expect(events.find(entry => entry.event === 'engine.tool').data.tool).toBe('submit_outline')
    expect(entries.some(entry => entry.event === 'engine.transport' && entry.data.bytes > 0 && entry.data.transportStage === 'receiving')).toBe(true)
    expect(entries.some(entry => entry.event === 'engine.transport' && entry.data.terminalReason === 'cancelled')).toBe(true)
    expect(entries.filter(entry => entry.event === 'worker.failed').map(entry => entry.data.code)).toEqual(expect.arrayContaining(['CANCELLED', 'INTERNAL']))
  } finally {
    await desktop?.close()
    await fixture.close()
    await rm(root, { recursive: true, force: true })
  }
})
