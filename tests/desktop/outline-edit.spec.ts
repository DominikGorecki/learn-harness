import { expect, test } from '../flows/fixture'
import type { ElectronApplication } from '@playwright/test'
import { mkdir, mkdtemp, realpath, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'
import { learningOutline } from '../fixtures/learning-outline'
import { createProjectStorage } from '../../src/main/storage/project-storage'
import type { ProjectDocument } from '../../src/shared/workspace'

test('edit dialog rewrites the numbered path through Pi with the active model and persists it across restart', { tag: '@outline-edit', annotation: { type: 'flow', description: 'outline-edit' } }, async ({ playwright, flow }) => {
  const fixture = await startChatGPTFixture()
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-edit-desktop-')))
  const folder = join(root, 'Learning'); await mkdir(folder)
  const model = { id: 'fixture-model', name: 'Learning model' }
  const original: ProjectDocument = { version: 1, projectId: 'edit-project', revision: 1, name: 'Bayesian reasoning',
    createdAt: '2026-10-04T12:00:00Z', updatedAt: '2026-10-04T12:00:00Z', selectedModel: model, brief: 'Bayesian reasoning',
    outline: { generatedAt: '2026-10-04T12:00:00Z', model, brief: 'Bayesian reasoning', inferredBrief: null,
      document: learningOutline(), coverage: { files: [], limitations: [] } } }
  await createProjectStorage().save(folder, original, null)
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  const launch = () => playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env,
    EDU_HARNESS_TEST_DATA_DIR: join(root, 'profile'), EDU_HARNESS_TEST_PROVIDER_URL: fixture.baseUrl } })
  const saved = async () => JSON.parse(await readFile(join(folder, '.edu/project.json'), 'utf8')) as ProjectDocument
  let desktop: ElectronApplication | undefined
  try {
    desktop = await launch()
    await desktop.evaluate(({ dialog, shell }, selected) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] })
      shell.openExternal = async url => { await fetch(url) }
    }, folder)
    let page = await desktop.firstWindow()
    await page.getByRole('main').getByRole('button', { name: 'Open project' }).click()
    const edit = page.getByRole('button', { name: 'Edit learning path' })
    await edit.focus(); await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Edit your learning path' })
    const input = dialog.getByRole('textbox', { name: 'How would you like to change the outline?' })
    await expect(input).toBeFocused()
    const changes = 'Move 01 after 02 and add practical examples to the first topic.'
    await input.fill(changes)
    await flow.capture(desktop, page, 'outline-edit-light')
    await page.keyboard.press('Escape')
    await expect(edit).toBeFocused()
    expect(fixture.inferenceRequests).toHaveLength(0)
    expect((await saved()).outline).toEqual(original.outline)
    await edit.click(); await expect(input).toHaveValue(changes)
    await input.fill('x'.repeat(32_001))
    await expect(dialog.getByRole('button', { name: 'Rewrite outline' })).toBeDisabled()
    await expect(input).toHaveValue('x'.repeat(32_001))
    await input.fill(changes)
    // An offline submission opens account recovery while preserving the edit draft.
    await dialog.getByRole('button', { name: 'Rewrite outline' }).click()
    await page.getByRole('button', { name: 'Continue with ChatGPT' }).click()
    await expect(page.getByRole('heading', { name: 'Connected to ChatGPT' })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByLabel('Project model').selectOption('fixture-model-fast')
    await expect(edit).toBeEnabled()
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByRole('radio', { name: 'Dark', exact: true }).check()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await edit.click(); await expect(input).toHaveValue(changes)
    await flow.capture(desktop, page, 'outline-edit-dark')
    await desktop.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0]!
      window.setContentSize(600, 640); window.webContents.setZoomFactor(2)
    })
    await expect.poll(() => page.evaluate(() => (globalThis as unknown as { innerWidth: number }).innerWidth)).toBe(300)
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect(await dialog.evaluate(element => {
      const bounds = element.getBoundingClientRect()
      return bounds.left >= 0 && bounds.right <= element.ownerDocument.defaultView!.innerWidth
    })).toBe(true)
    await dialog.getByRole('button', { name: 'Rewrite outline' }).scrollIntoViewIfNeeded()
    await expect(dialog.getByRole('button', { name: 'Rewrite outline' })).toBeInViewport()
    await flow.capture(desktop, page, 'outline-edit-zoom')
    await desktop.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0]!
      window.webContents.setZoomFactor(1); window.setContentSize(1280, 840)
    })
    await input.dispatchEvent('keydown', { key: 'Enter', ctrlKey: true, isComposing: true })
    expect(fixture.inferenceRequests).toHaveLength(0)
    fixture.options.inferenceMode = 'hold'
    await input.press('ControlOrMeta+Enter')
    await expect.poll(() => fixture.inferenceRequests.length).toBe(1)
    await expect(edit).toBeDisabled()
    expect((await saved()).outline).toEqual(original.outline)
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(edit).toBeEnabled()
    expect((await saved()).outline).toEqual(original.outline)
    await edit.click(); await expect(input).toHaveValue(changes)
    const revised = learningOutline(); revised.lessons.reverse()
    revised.startingLessonId = revised.lessons[0]!.id
    revised.lessons[0]!.overview = 'Explore evidence with practical examples.'
    fixture.options.outlineResult = revised
    fixture.options.inferenceMode = 'outline'
    await dialog.getByRole('button', { name: 'Rewrite outline' }).click()
    await expect.poll(async () => (await saved()).outline?.document).toEqual(revised)
    await expect(page.locator('.lesson-title').first()).toHaveText(revised.lessons[0]!.title)
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    expect(fixture.inferenceRequests).toHaveLength(2)
    for (const request of fixture.inferenceRequests) {
      expect(request.model).toBe('fixture-model-fast')
      const messages = request.input as { role?: string; content?: unknown }[]
      const prompt = JSON.stringify(messages)
      expect(prompt).toContain(JSON.stringify(original.outline).replaceAll('"', '\\"'))
      expect(prompt).toContain(changes)
    }
    expect((await saved()).brief).toBe(original.brief)
    await edit.click(); await expect(input).toHaveValue(''); await page.keyboard.press('Escape')
    await desktop.close(); desktop = undefined
    desktop = await launch(); page = await desktop.firstWindow()
    await page.getByRole('main').getByRole('button', { name: /Bayesian reasoning/ }).click()
    await expect(page.locator('.lesson-title').first()).toHaveText(revised.lessons[0]!.title)
    expect(fixture.inferenceRequests).toHaveLength(2)
  } finally {
    await desktop?.close(); await fixture.close(); await rm(root, { recursive: true, force: true })
  }
})
