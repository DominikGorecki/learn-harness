import { expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'
import type { ProjectDocument } from '../../src/shared/workspace'

test('Pi utility process creates, validates, saves and reopens an outline; cancellation preserves prior work', async ({ playwright }, testInfo) => {
  const fixture = await startChatGPTFixture()
  const root = await mkdtemp(join(tmpdir(), 'edu-outline-desktop-'))
  const folder = join(root, 'My learning')
  await mkdir(folder)
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  const launch = () => playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env,
    EDU_HARNESS_TEST_DATA_DIR: join(root, 'profile'), EDU_HARNESS_TEST_PROVIDER_URL: fixture.baseUrl } })
  let desktop: ElectronApplication | undefined
  const saved = async () => JSON.parse(await readFile(join(folder, '.edu/project.json'), 'utf8')) as ProjectDocument
  try {
    desktop = await launch()
    await desktop.evaluate(({ dialog, shell }, selected) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] })
      shell.openExternal = async url => { await fetch(url) }
    }, folder)
    let page = await desktop.firstWindow()
    await page.getByRole('main').getByRole('button', { name: 'Open project' }).click()
    await page.getByRole('textbox').fill('Bayesian reasoning')
    await page.getByRole('button', { name: 'Create outline', exact: true }).click()
    await page.getByRole('button', { name: 'Continue with ChatGPT' }).click()
    await expect(page.getByRole('heading', { name: 'Connected to ChatGPT' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('textbox')).toHaveValue('Bayesian reasoning')
    expect(fixture.inferenceRequests).toHaveLength(0)
    await page.getByLabel('Project model').selectOption('fixture-model-fast')
    await page.getByRole('button', { name: 'Create outline', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Bayesian reasoning', exact: true })).toBeVisible()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    expect(fixture.inferenceRequests).toHaveLength(1)
    expect(fixture.inferenceRequests[0]!.model).toBe('fixture-model-fast')
    const original = (await saved()).outline
    expect(original?.document.lessons).toHaveLength(2)
    expect(original?.coverage.files).toEqual([])
    await page.getByRole('main').evaluate(element => { element.scrollTop = 0 })
    await page.screenshot({ path: testInfo.outputPath('outline-overview.png') })
    await page.locator('.lesson-disclosure').first().locator('summary').click()
    await expect(page.getByRole('heading', { name: 'A forecast before the data' })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('generated-outline.png'), fullPage: true })

    fixture.options.inferenceMode = 'hold'
    await page.getByRole('button', { name: 'Refine learning direction' }).click()
    await page.getByRole('textbox').fill('Bayesian reasoning with challenging practical examples and no calculus.')
    await page.getByRole('button', { name: 'Create new outline', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Create a new learning outline?' })).toBeVisible()
    await page.getByRole('button', { name: 'Keep current outline' }).click()
    expect(fixture.inferenceRequests).toHaveLength(1)
    await page.getByRole('button', { name: 'Create new outline', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Create new outline', exact: true }).click()
    await expect.poll(() => fixture.inferenceRequests.length).toBe(2)
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByText('Outline creation cancelled. Your previous outline is unchanged.', { exact: true })).toBeVisible()
    expect((await saved()).outline).toEqual(original)
    await expect(page.getByRole('textbox')).toHaveValue('Bayesian reasoning with challenging practical examples and no calculus.')
    await expect.poll(() => desktop!.evaluate(({ app }) => app.getAppMetrics().filter(metric => metric.name === 'Learning outline').length)).toBe(0)

    await desktop.close(); desktop = undefined
    desktop = await launch()
    page = await desktop.firstWindow()
    await page.getByRole('main').getByRole('button', { name: /Bayesian reasoning/ }).click()
    await expect(page.getByRole('heading', { name: 'Bayesian reasoning', exact: true })).toBeVisible()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    expect(fixture.inferenceRequests).toHaveLength(2)
  } finally {
    await desktop?.close()
    await fixture.close()
    await rm(root, { recursive: true, force: true })
  }
})
