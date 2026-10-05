import { aiActivity, aiFrames, observeAiActivity } from '../fixtures/ai-activity'
import { expect, test } from '../flows/fixture'
import type { ElectronApplication } from '@playwright/test'
import { mkdir, mkdtemp, realpath, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'
import type { ProjectDocument } from '../../src/shared/workspace'
import { learningOutline } from '../fixtures/learning-outline'

test('Pi utility process creates, validates, saves and reopens an outline; cancellation preserves prior work', { tag: '@outline', annotation: { type: 'flow', description: 'outline' } }, async ({ playwright, flow }) => {
  const fixture = await startChatGPTFixture()
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-outline-desktop-')))
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
    await observeAiActivity(page)
    await page.getByRole('main').getByRole('button', { name: 'Open project' }).click()
    await page.getByRole('textbox').fill('Bayesian reasoning')
    await page.getByRole('button', { name: 'Create outline', exact: true }).click()
    await page.getByRole('button', { name: 'Continue with ChatGPT' }).click()
    await expect(page.getByRole('heading', { name: 'Connected to ChatGPT' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('textbox')).toHaveValue('Bayesian reasoning')
    expect(fixture.inferenceRequests).toHaveLength(0)
    await page.getByLabel('Project model').selectOption('fixture-model-fast')
    const streaming = learningOutline()
    streaming.overview = 'A selectable explanation of uncertainty, evidence and careful reasoning. '.repeat(120)
    fixture.options.outlineResult = streaming
    fixture.options.inferenceMode = 'progressive-hold'
    await page.getByRole('button', { name: 'Create outline', exact: true }).click()
    const panel = page.locator('.ai-panel'), preview = page.getByLabel('Draft preview', { exact: true })
    await expect(page.locator('#ai-operation-heading')).toBeFocused()
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('region', { name: 'AI activity timeline', exact: true })).toBeVisible()
    await expect(panel.getByRole('region', { name: 'Draft preview', exact: true })).toBeVisible()
    await expect(panel.getByRole('region', { name: 'AI activity timeline', exact: true })).toBeVisible()
    await expect(panel.getByRole('region', { name: 'Draft preview', exact: true })).toBeVisible()
    await expect(panel.locator('.ai-request-summary')).toHaveText('Bayesian reasoning')
    await expect(panel.getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Working…', exact: true })).toBeDisabled()
    await expect.poll(async () => (await aiActivity(page)).active?.preview.kind).toBe('outline')
    await expect.poll(() => preview.locator('.ai-preview-content').innerText()).toContain('selectable explanation')
    const reading = page.getByRole('main')
    const readingBefore = await reading.evaluate(element => { element.scrollTop = 75; return element.scrollTop })
    await preview.evaluate(element => { element.scrollTop = 0; const range = element.ownerDocument.createRange(); range.selectNodeContents(element.querySelector('.ai-preview-content')!); const selection = element.ownerDocument.defaultView!.getSelection()!; selection.removeAllRanges(); selection.addRange(range) })
    expect(await page.evaluate(() => (globalThis as unknown as { getSelection(): { toString(): string } | null }).getSelection()?.toString())).toContain('selectable explanation')
    await flow.capture(desktop, page, 'outline-streaming-light')
    const initialPreview = await preview.locator('.ai-preview-content').innerText()
    fixture.advancePreview()
    await expect.poll(() => preview.locator('.ai-preview-content').innerText()).not.toBe(initialPreview)
    await expect(panel.locator('.ai-preview-column > .ai-body-label')).toBeInViewport()
    await expect.poll(() => preview.evaluate(element => element.scrollTop)).toBe(0)
    await expect.poll(() => reading.evaluate(element => element.scrollTop)).toBe(readingBefore)
    await preview.focus()
    await expect(preview).toBeFocused()
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByRole('radio', { name: 'Dark', exact: true }).check()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await expect.poll(() => reading.evaluate(element => element.scrollTop)).toBe(readingBefore)
    await expect.poll(() => preview.evaluate(element => element.scrollTop)).toBe(0)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await preview.evaluate(element => element.ownerDocument.defaultView!.getComputedStyle(element).animationName)).toBe('none')
    await flow.capture(desktop, page, 'outline-streaming-dark')
    await desktop.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]!; window.setContentSize(600, 480); window.webContents.setZoomFactor(2) })
    await expect.poll(() => page.evaluate(() => (globalThis as unknown as { innerWidth: number }).innerWidth)).toBe(300)
    await expect(panel.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport()
    expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect(await reading.evaluate(element => element.clientHeight)).toBeGreaterThan(25)
    const timeline = page.getByLabel('AI activity timeline', { exact: true })
    await timeline.scrollIntoViewIfNeeded()
    await expect(timeline).toContainText('In progress')
    await expect(timeline).toBeInViewport()
    await preview.scrollIntoViewIfNeeded()
    expect(await preview.evaluate(element => { const bounds = element.getBoundingClientRect(), clip = element.closest('.ai-panel-body')!.getBoundingClientRect(), label = element.closest('.ai-preview-column')!.querySelector('.ai-body-label')!.getBoundingClientRect(); return Math.max(0, Math.min(bounds.bottom, clip.bottom, element.ownerDocument.defaultView!.innerHeight) - Math.max(bounds.top, clip.top, label.bottom, 0)) })).toBeGreaterThan(20)
    // Align the actual preview column in the stacked body's scroll viewport.
    // The region's rectangle alone cannot prove its prose is painted/uncovered.
    await preview.evaluate(element => {
      const body = element.closest('.ai-panel-body')!, column = element.closest('.ai-preview-column')!
      body.scrollTop += column.getBoundingClientRect().top - body.getBoundingClientRect().top
      const paragraph = element.querySelector('.ai-preview-content p')!
      element.scrollTop += paragraph.getBoundingClientRect().top - element.getBoundingClientRect().top - 4
    })
    await expect.poll(() => preview.evaluate(element => {
      const document = element.ownerDocument, view = document.defaultView!, paragraph = element.querySelector('.ai-preview-content p')!
      const range = document.createRange(); range.selectNodeContents(paragraph)
      const visibleHeight = (rect: ReturnType<typeof paragraph.getBoundingClientRect>, node: typeof paragraph) => {
        let left = Math.max(0, rect.left), right = Math.min(view.innerWidth, rect.right)
        let top = Math.max(0, rect.top), bottom = Math.min(view.innerHeight, rect.bottom)
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
          const style = view.getComputedStyle(parent), bounds = parent.getBoundingClientRect()
          if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right) }
          if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom) }
        }
        if (right <= left || bottom <= top) return 0
        const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2)
        return hit && (hit === node || node.contains(hit)) ? bottom - top : 0
      }
      const label = element.closest('.ai-preview-column')!.querySelector('.ai-body-label')!
      const prose = Math.max(0, ...Array.from(range.getClientRects()).map(rect => visibleHeight(rect, paragraph)))
      const labelHeight = visibleHeight(label.getBoundingClientRect(), label)
      return JSON.stringify({ visible: prose > 12 && labelHeight > 8, prose, labelHeight })
    })).toContain('"visible":true')
    await expect(panel.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport()
    await preview.evaluate(element => new Promise<void>(resolve => {
      const view = element.ownerDocument.defaultView!
      view.requestAnimationFrame(() => view.requestAnimationFrame(() => resolve()))
    }))
    await flow.capture(desktop, page, 'outline-streaming-zoom')
    await desktop.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]!; window.webContents.setZoomFactor(1); window.setContentSize(1280, 840) })
    expect((await saved()).outline).toBeNull() // Completed-looking draft is provisional until clean EOF.
    await expect.poll(async () => (await aiFrames(page)).some(frame => frame.active?.preview.kind === 'outline')).toBe(true)
    fixture.completePending()
    await expect(page.getByRole('main').getByRole('heading', { name: 'Bayesian reasoning', exact: true })).toBeVisible()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    expect(fixture.inferenceRequests).toHaveLength(1)
    expect(fixture.inferenceRequests[0]!.model).toBe('fixture-model-fast')
    expect((await aiActivity(page)).settled).toMatchObject({ kind: 'create-outline', outcome: 'saved', preview: { kind: 'outline', title: 'Bayesian reasoning' } })
    const original = (await saved()).outline
    expect(original?.document.lessons).toHaveLength(2)
    expect(original?.coverage.files.filter(file => file.status === 'read')).toEqual([])
    await page.getByRole('main').evaluate(element => { element.scrollTop = 0 })
    await flow.capture(desktop, page, 'outline-overview')
    await page.locator('.lesson-disclosure').first().locator('summary').click()
    await expect(page.getByRole('main').getByRole('heading', { name: 'A forecast before the data' })).toBeVisible()
    await flow.capture(desktop, page, 'generated-outline', { fullPage: true })

    const readingPosition = await page.getByRole('main').evaluate(element => { element.scrollTop = 150; return element.scrollTop })
    expect(readingPosition).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByRole('radio', { name: 'Dark', exact: true }).check()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await expect.poll(() => page.getByRole('main').evaluate(element => element.scrollTop)).toBe(readingPosition)
    expect(fixture.inferenceRequests).toHaveLength(1)
    expect((await saved()).outline).toEqual(original)

    fixture.options.inferenceMode = 'preview-hold'
    await page.getByRole('button', { name: 'Refine learning direction' }).click()
    await page.getByRole('textbox').fill('Bayesian reasoning with challenging practical examples and no calculus.')
    await page.getByRole('button', { name: 'Create new outline', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Create a new learning outline?' })).toBeVisible()
    await page.getByRole('button', { name: 'Keep current outline' }).click()
    expect(fixture.inferenceRequests).toHaveLength(1)
    await page.getByRole('button', { name: 'Create new outline', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Create new outline', exact: true }).click()
    await expect.poll(() => fixture.inferenceRequests.length).toBe(2)
    await expect.poll(async () => (await aiActivity(page)).active?.preview.kind).toBe('outline')
    await page.getByRole('button', { name: 'Cancel', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await aiActivity(page)).settled?.outcome).toBe('cancelled')
    await expect(page.getByText('Outline creation cancelled. Your previous outline is unchanged.', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dismiss AI activity' })).toBeFocused()
    await page.getByRole('button', { name: 'Dismiss AI activity' }).click()
    await expect(page.locator('.ai-panel')).toHaveCount(0)
    await expect(page.locator('#project-heading')).toBeFocused()
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
