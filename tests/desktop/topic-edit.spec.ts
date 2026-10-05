import { aiActivity, aiFrames, observeAiActivity } from '../fixtures/ai-activity'
import { expect, test } from '../flows/fixture'
import type { ElectronApplication } from '@playwright/test'
import { mkdir, mkdtemp, realpath, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'
import { learningOutline } from '../fixtures/learning-outline'
import { createProjectStorage } from '../../src/main/storage/project-storage'
import type { ProjectDocument } from '../../src/shared/workspace'

test('topic dialog updates its outline branch and real topic files while preserving other topics across cancellation and restart', { tag: '@topic-edit', annotation: { type: 'flow', description: 'topic-edit' } }, async ({ playwright, flow }) => {
  const fixture = await startChatGPTFixture()
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-topic-desktop-')))
  const folder = join(root, 'Learning'); await mkdir(folder)
  const topicFolder = '01-beliefs-before-evidence'
  await mkdir(join(folder, topicFolder)); await mkdir(join(folder, 'evidence'))
  await writeFile(join(folder, topicFolder, 'notes.md'), 'Original history notes')
  await writeFile(join(folder, 'evidence/notes.md'), 'Other topic context')
  const model = { id: 'fixture-model', name: 'Learning model' }
  const original: ProjectDocument = { version: 1, projectId: 'topic-project', revision: 1, name: 'Bayesian reasoning',
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
    await observeAiActivity(page)
    await page.getByRole('main').getByRole('button', { name: 'Open project' }).click()
    const topicEdit = page.getByRole('button', { name: 'Edit topic: Beliefs before evidence', exact: true })
    const otherEdit = page.getByRole('button', { name: 'Edit topic: How evidence changes a belief', exact: true })
    await expect(topicEdit).toBeVisible(); await expect(otherEdit).toBeVisible()
    await topicEdit.focus(); await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Edit topic', exact: true })
    const input = dialog.getByRole('textbox', { name: 'How would you like to change this topic?' })
    await expect(input).toBeFocused()
    const changes = 'I would like to learn further history on this topic.'
    await input.fill(changes)
    await flow.capture(desktop, page, 'topic-edit-light')
    await page.keyboard.press('Escape'); await expect(topicEdit).toBeFocused()
    expect(fixture.inferenceRequests).toHaveLength(0)
    await otherEdit.click(); await expect(input).toHaveValue(''); await input.fill('Other topic draft'); await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Edit learning path' }).click()
    await expect(page.getByRole('textbox', { name: 'How would you like to change the outline?' })).toHaveValue('')
    await page.keyboard.press('Escape')
    await topicEdit.click(); await expect(input).toHaveValue(changes)
    await input.fill('x'.repeat(32_001)); await expect(dialog.getByRole('button', { name: 'Rewrite topic' })).toBeDisabled()
    await input.fill(changes)
    await dialog.getByRole('button', { name: 'Rewrite topic' }).click()
    await page.getByRole('button', { name: 'Continue with ChatGPT' }).click()
    await expect(page.getByRole('heading', { name: 'Connected to ChatGPT' })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByLabel('Project model').selectOption('fixture-model-fast')
    fixture.options.projectFileCalls = [
      { name: 'read_project_file', args: { path: 'evidence/notes.md' } },
      { name: 'read_project_file', args: { path: `${topicFolder}/notes.md` } },
      { name: 'write_project_file', args: { path: `${topicFolder}/notes.md`, content: 'Learn how historical ideas about priors developed.' } },
      { name: 'write_project_file', args: { path: `${topicFolder}/history/timeline.md`, content: 'A timeline of Bayesian ideas.' } }
    ]
    fixture.options.inferenceMode = 'preview-hold'
    await topicEdit.click(); await expect(input).toHaveValue(changes)
    await input.dispatchEvent('keydown', { key: 'Enter', ctrlKey: true, isComposing: true })
    expect(fixture.inferenceRequests).toHaveLength(0)
    await input.press('ControlOrMeta+Enter')
    await expect(dialog).not.toBeVisible()
    await expect(page.locator('#ai-operation-heading')).toBeFocused()
    await expect(page.locator('#ai-operation-heading')).toHaveText('Updating Beliefs before evidence')
    await expect(page.locator('.ai-panel .ai-request-summary')).toHaveText(changes)
    await expect(page.locator('.lesson-row[data-ai-active=true]')).toHaveCount(1)
    await expect.poll(() => fixture.inferenceRequests.length).toBe(5)
    await expect(otherEdit).toBeDisabled()
    expect((await saved()).outline).toEqual(original.outline)
    expect(await readFile(join(folder, topicFolder, 'notes.md'), 'utf8')).toBe('Original history notes')
    await expect.poll(async () => (await aiActivity(page)).active?.preview.kind).toBe('topic')
    await expect(page.getByLabel('Draft preview', { exact: true })).not.toContainText('How evidence changes a belief')
    await expect(page.locator('.ai-preview-column > .ai-body-label')).toBeInViewport()
    await expect(page.locator('.ai-panel')).toContainText('Only this topic will change.')
    await page.getByLabel('Draft preview', { exact: true }).evaluate(element => { element.scrollTop = 0 })
    await flow.capture(desktop, page, 'topic-streaming-light')
    await expect.poll(async () => (await aiFrames(page)).some(frame => frame.active?.preview.kind === 'topic')).toBe(true)
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect.poll(async () => (await aiActivity(page)).settled?.outcome).toBe('cancelled')
    await expect(topicEdit).toBeEnabled()
    await expect(readFile(join(folder, topicFolder, 'history/timeline.md'))).rejects.toMatchObject({ code: 'ENOENT' })
    const proposal = learningOutline()
    const revisedTopic = proposal.lessons[0]!
    const revisedTitle = 'Beliefs and their history: tracing the development of prior knowledge, evidence and practical reasoning across changing historical contexts';
    revisedTopic.title = revisedTitle; revisedTopic.overview = 'Explore how priors developed through history.'
    proposal.title = 'Unrequested rename'; proposal.outcomes = ['Unrequested outcome']; proposal.lessons.reverse()
    proposal.startingLessonId = 'evidence'; proposal.lessons[0]!.overview = 'Unrequested change to the other topic'
    fixture.options.outlineResult = proposal; fixture.options.inferenceMode = 'outline'
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByRole('radio', { name: 'Dark', exact: true }).check(); await page.getByRole('button', { name: 'Done', exact: true }).click()
    await topicEdit.click(); await expect(input).toHaveValue(changes)
    await flow.capture(desktop, page, 'topic-edit-dark')
    await desktop.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]!; window.setContentSize(600, 640); window.webContents.setZoomFactor(2) })
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await dialog.getByRole('button', { name: 'Rewrite topic' }).scrollIntoViewIfNeeded()
    await expect(dialog.getByRole('button', { name: 'Rewrite topic' })).toBeInViewport()
    await flow.capture(desktop, page, 'topic-edit-zoom')
    await desktop.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]!; window.webContents.setZoomFactor(1); window.setContentSize(1280, 840) })
    await dialog.getByRole('button', { name: 'Rewrite topic' }).click()
    const expected = { ...original.outline!.document, lessons: [revisedTopic, original.outline!.document.lessons[1]] }
    await expect.poll(async () => (await saved()).outline?.document).toEqual(expected)
    const activity = (await aiActivity(page)).settled!
    expect(activity).toMatchObject({ kind: 'rewrite-topic', topicId: 'beliefs', outcome: 'saved', preview: { kind: 'topic', topicId: 'beliefs', lesson: { id: 'beliefs', title: revisedTopic.title } } })
    expect(JSON.stringify(activity.preview)).not.toContain('Unrequested')
    expect(JSON.stringify(await aiFrames(page))).not.toMatch(/Other topic context|Original history notes|fc_fixture|call_fixture|fixture-access/)
    expect(activity.activity.some(entry => entry.label === 'Reading project material' && entry.state === 'completed')).toBe(true)
    expect((await saved()).brief).toBe(original.brief)
    expect(await readFile(join(folder, topicFolder, 'notes.md'), 'utf8')).toContain('historical ideas')
    expect(await readFile(join(folder, topicFolder, 'history/timeline.md'), 'utf8')).toContain('timeline')
    expect(await readFile(join(folder, 'evidence/notes.md'), 'utf8')).toBe('Other topic context')
    const mirror = JSON.parse(await readFile(join(folder, topicFolder, '.edu/topic.json'), 'utf8'))
    expect(mirror.topic).toEqual(revisedTopic)
    expect(fixture.inferenceRequests).toHaveLength(10)
    expect(fixture.inferenceRequests.every(request => request.model === 'fixture-model-fast')).toBe(true)
    await page.getByRole('button', { name: `Edit topic: ${revisedTitle}` }).click()
    await expect(input).toHaveValue(''); await page.keyboard.press('Escape')
    await otherEdit.click(); await expect(input).toHaveValue('Other topic draft'); await page.keyboard.press('Escape')
    // A third held rewrite exercises a long request at native narrow/200% zoom.
    fixture.options.inferenceMode = 'preview-hold'
    await page.getByRole('button', { name: `Edit topic: ${revisedTitle}` }).click()
    const longRequest = 'Explore the historical foundations, sources and practical consequences of these ideas. '.repeat(6)
    await input.fill(longRequest)
    await dialog.getByRole('button', { name: 'Rewrite topic' }).click()
    await expect(page.locator('#ai-operation-heading')).toBeFocused()
    await expect.poll(() => fixture.inferenceRequests.length).toBe(15)
    await expect.poll(async () => (await aiActivity(page)).active?.preview.kind).toBe('topic')
    await desktop.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]!; window.setContentSize(600, 640); window.webContents.setZoomFactor(2) })
    const dock = page.locator('.ai-panel'), draftPreview = page.getByLabel('Draft preview', { exact: true })
    await expect(dock.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport()
    const timeline = page.getByLabel('AI activity timeline', { exact: true })
    await timeline.scrollIntoViewIfNeeded()
    await expect(timeline).toBeInViewport()
    await expect(timeline).toContainText('In progress')
    await draftPreview.scrollIntoViewIfNeeded()
    await expect(draftPreview).toBeInViewport()
    await expect(dock.locator('.ai-preview-column > .ai-body-label')).toBeInViewport()
    expect(await draftPreview.evaluate(element => element.clientHeight)).toBeGreaterThan(60)
    expect(await dock.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await expect(dock.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport()
    await flow.capture(desktop, page, 'topic-streaming-zoom')
    await desktop.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]!; window.webContents.setZoomFactor(1); window.setContentSize(1280, 840) })
    const savedReading = page.getByRole('main'), savedSummary = page.locator('.lesson-disclosure').first().locator('summary')
    await savedSummary.focus()
    const savedPosition = await savedReading.evaluate(element => { element.scrollTop = 125; return element.scrollTop })
    expect(savedPosition).toBeGreaterThan(0)
    await page.evaluate(async () => { const api = (globalThis as unknown as { learning: import('../../src/shared/ai/activity').AiApi }).learning; const state = await api.getAiActivity(); if (state.ok && state.data.active) await api.cancelAiOperation({ operationId: state.data.active.operationId }) })
    await expect.poll(async () => (await aiActivity(page)).settled?.outcome).toBe('cancelled')
    await expect(savedSummary).toBeFocused()
    await expect.poll(() => savedReading.evaluate(element => element.scrollTop)).toBe(savedPosition)
    expect((await saved()).outline?.document).toEqual(expected)
    await desktop.close(); desktop = undefined
    desktop = await launch(); page = await desktop.firstWindow()
    await page.getByRole('main').getByRole('button', { name: /Bayesian reasoning/ }).click()
    await expect(page.locator('.lesson-title').first()).toHaveText(revisedTitle)
    await expect(page.locator('.lesson-title').nth(1)).toHaveText(original.outline!.document.lessons[1]!.title)
    expect(fixture.inferenceRequests).toHaveLength(15)
  } finally { await desktop?.close(); await fixture.close(); await rm(root, { recursive: true, force: true }) }
})
