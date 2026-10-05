import { aiActivity } from '../fixtures/ai-activity'
import { expect, test } from '../flows/fixture'
import type { ElectronApplication } from '@playwright/test'
import { mkdir, mkdtemp, realpath, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'
import type { ProjectDocument } from '../../src/shared/workspace'

test('save retry, model recovery, usage limits, and explicit cancellation before switching preserve work', { tag: '@recovery', annotation: { type: 'flow', description: 'recovery' } }, async ({ playwright, flow }) => {
  const fixture = await startChatGPTFixture({ inferenceMode: 'hold' })
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-recovery-desktop-')))
  const folder = join(root, 'First subject'), other = join(root, 'Second subject')
  await mkdir(folder); await mkdir(other)
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  let desktop: ElectronApplication | undefined
  const file = join(folder, '.edu/project.json')
  const saved = async () => JSON.parse(await readFile(file, 'utf8')) as ProjectDocument
  const choose = async (path: string) => desktop!.evaluate(({ dialog }, selected) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] })
  }, path)
  try {
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env,
      EDU_HARNESS_TEST_DATA_DIR: join(root, 'profile'), EDU_HARNESS_TEST_PROVIDER_URL: fixture.baseUrl } })
    const page = await desktop.firstWindow()
    await choose(folder)
    await page.getByRole('main').getByRole('button', { name: 'Open project' }).click()
    await page.getByRole('textbox').fill('Bayesian reasoning for decisions')
    await desktop.evaluate(({ shell }) => { shell.openExternal = async () => {} })
    await page.getByRole('button', { name: 'Create outline', exact: true }).click()
    await page.getByRole('button', { name: 'Continue with ChatGPT' }).click()
    await expect(page.getByRole('button', { name: 'Cancel sign-in' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel sign-in' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('textbox')).toHaveValue('Bayesian reasoning for decisions')
    await desktop.evaluate(({ shell }) => { shell.openExternal = async url => { await fetch(url) } })
    await page.getByRole('button', { name: 'Create outline', exact: true }).click()
    await page.getByRole('button', { name: 'Continue with ChatGPT' }).click()
    await expect(page.getByRole('heading', { name: 'Connected to ChatGPT' })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByLabel('Project model').selectOption('fixture-model-fast')
    // selectOption waits for the DOM change, not the asynchronous preference save.
    // Keyboard events sent while that mutation disables the form are ignored.
    await expect(page.getByRole('button', { name: 'Create outline', exact: true })).toBeEnabled()
    // IME composition must not submit the learner's partially composed text.
    await page.getByRole('textbox').dispatchEvent('keydown', { key: 'Enter', ctrlKey: true, isComposing: true })
    expect(fixture.inferenceRequests).toHaveLength(0)
    await page.getByRole('textbox').press('ControlOrMeta+Enter')
    await expect.poll(() => fixture.inferenceRequests.length).toBe(1)
    await flow.capture(desktop, page, 'generation-pending')
    await page.getByRole('button', { name: 'Account settings' }).click()
    await expect(page.getByRole('button', { name: 'Sign out of this app' })).toBeDisabled()
    await page.keyboard.press('Escape')

    // Cause an actual filesystem save failure after inference has started.
    // Restore the exact prior metadata afterward so retry is a storage operation.
    await rename(file, file + '.backup')
    await mkdir(file)
    fixture.completePending()
    await expect(page.getByRole('button', { name: 'Retry save' })).toBeVisible()
    await expect(page.getByText('Not saved yet', { exact: true })).toBeVisible()
    expect((await aiActivity(page)).settled?.outcome).toBe('unsaved')
    await flow.capture(desktop, page, 'generated-unsaved')
    await page.getByRole('button', { name: 'Projects', exact: true }).first().click()
    await page.getByRole('main').getByRole('button', { name: /First subject/ }).click()
    await expect(page.getByRole('heading', { name: 'This project needs attention.' })).toBeVisible()
    await expect(page.getByText('Not saved yet', { exact: true })).toBeVisible()
    await rm(file, { recursive: true })
    await rename(file + '.backup', file)
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await page.getByRole('button', { name: 'Retry save' }).click()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    expect(fixture.inferenceRequests).toHaveLength(1)
    expect((await aiActivity(page)).active).toBeNull() // Retry is storage-only.
    const original = (await saved()).outline

    fixture.options.hideFastModel = true
    await page.getByRole('button', { name: 'Account settings' }).click()
    await page.getByRole('button', { name: 'Refresh models' }).click()
    await expect(page.getByText('3 model choices for your projects')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText('Your saved model is unavailable. Choose another project model to create an outline.', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Project model')).toHaveValue('fixture-model-fast')
    await page.getByLabel('Project model').selectOption('fixture-model')
    expect(fixture.inferenceRequests).toHaveLength(1)

    fixture.options.inferenceMode = 'usage-limit'
    await page.getByRole('button', { name: 'Refine learning direction' }).click()
    await page.getByRole('textbox').fill('A deeper look at evidence and base rates')
    await page.getByRole('button', { name: 'Create new outline', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Create new outline', exact: true }).click()
    await expect(page.getByRole('main').getByText(/Your ChatGPT usage limit has been reached/)).toBeVisible()
    expect((await saved()).outline).toEqual(original)
    await expect(page.getByRole('textbox')).toHaveValue('A deeper look at evidence and base rates')
    await page.getByRole('main').getByText(/Your ChatGPT usage limit has been reached/).scrollIntoViewIfNeeded()
    await flow.capture(desktop, page, 'usage-recovery')
    await page.getByRole('button', { name: 'Review ChatGPT connection' }).click()
    await page.getByRole('button', { name: 'Check availability' }).click()
    await expect(page.getByRole('heading', { name: 'Connected to ChatGPT' })).toBeVisible()
    await page.keyboard.press('Escape')

    fixture.options.inferenceMode = 'hold'
    await page.getByRole('button', { name: 'Create new outline', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Create new outline', exact: true }).click()
    await expect.poll(() => fixture.inferenceRequests.length).toBe(3)
    await desktop.evaluate(({ app }) => {
      const worker = app.getAppMetrics().find(metric => metric.name === 'Learning outline')
      if (!worker) throw new Error('Expected the owned outline worker')
      process.kill(worker.pid)
    })
    await expect(page.getByText('The outline process stopped unexpectedly. Your previous work is unchanged.', { exact: true })).toBeVisible()
    expect((await saved()).outline).toEqual(original)
    await page.getByRole('button', { name: 'Create new outline', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Create new outline', exact: true }).click()
    await expect.poll(() => fixture.inferenceRequests.length).toBe(4)
    await choose(other)
    await page.getByRole('button', { name: 'Open project', exact: false }).click()
    await expect(page.getByRole('dialog', { name: 'An outline is still in progress' })).toBeVisible()
    await page.getByRole('button', { name: 'Stay here' }).click()
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Open project', exact: false }).click()
    await page.getByRole('button', { name: 'Cancel and switch' }).click()
    await expect(page.getByRole('textbox')).toHaveValue('')
    await expect(page.locator('.workspace-title')).toHaveText('Second subject')
    expect((await saved()).outline).toEqual(original)
    expect(fixture.inferenceRequests).toHaveLength(4)
    await page.getByRole('navigation', { name: 'Projects', exact: true }).getByRole('button', { name: 'Bayesian reasoning', exact: true }).click()
    await page.getByRole('button', { name: 'Create new outline', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Create new outline', exact: true }).click()
    await expect.poll(() => fixture.inferenceRequests.length).toBe(5)
    await writeFile(file, JSON.stringify({ ...await saved(), brief: 'Edited outside the app during generation' }))
    fixture.completePending()
    await page.getByRole('button', { name: 'Review save conflict' }).click()
    await expect(page.getByRole('dialog', { name: 'Save over the changed outline?' })).toBeVisible()
    await page.getByRole('button', { name: 'Keep reviewing' }).click()
    expect((await saved()).brief).toBe('Edited outside the app during generation')
    await page.getByRole('button', { name: 'Review save conflict' }).click()
    await page.getByRole('button', { name: 'Save generated outline' }).click()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    expect(fixture.inferenceRequests).toHaveLength(5)
    expect((await saved()).outline?.model.id).toBe('fixture-model')
  } finally {
    await desktop?.close()
    await fixture.close()
    await rm(root, { recursive: true, force: true })
  }
})
