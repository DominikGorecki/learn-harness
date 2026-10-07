import { expect, test } from '../flows/fixture'
import type { ElectronApplication } from '@playwright/test'
import { mkdir, mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createProjectStorage } from '../../src/main/storage/project-storage'
import { learningOutline } from '../fixtures/learning-outline'
import type { ProjectDocument } from '../../src/shared/workspace'
import { workspaceSnapshot } from '../fixtures/desktop-navigation'
import { aiActivity } from '../fixtures/ai-activity'

test('saved topics read offline through one current-content history with independent commands and restoration', { tag: '@topic-reading', annotation: { type: 'flow', description: 'topic-reading' } }, async ({ playwright, flow }) => {
  test.setTimeout(90_000)
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-topic-reading-')))
  const folder = join(root, 'Saved learning'), other = join(root, 'Other learning'); await mkdir(folder); await mkdir(other)
  const outline = learningOutline(); outline.startingLessonId = 'evidence'
  outline.lessons[1]!.prerequisites = ['Beliefs before evidence']; outline.lessons[1]!.sources = ['evidence/notes.md']
  outline.lessons[1]!.modules[0]!.task = 'Explain every saved detail in your own words. '.repeat(40)
  const document: ProjectDocument = { version: 1, projectId: 'reading-topics', revision: 1, name: 'Saved learning', createdAt: '2026-10-07T12:00:00Z', updatedAt: '2026-10-07T12:00:00Z', selectedModel: null, brief: 'Saved direction', outline: { document: outline, generatedAt: '2026-10-07T12:00:00Z', model: { id: 'offline-model', name: 'Offline model' }, brief: 'Saved direction', inferredBrief: null, coverage: { files: [{ path: 'evidence/notes.md', status: 'read', reason: 'Read for this revision' }], limitations: ['Only supplied material was used.'] } } }
  const storage = createProjectStorage(); await storage.save(folder, document, null); await storage.save(other, { ...document, projectId: 'other-topic-project', name: 'Other learning', outline: { ...document.outline!, document: { ...outline, lessons: outline.lessons.map(lesson => ({ ...lesson, title: `Other project: ${lesson.title}` })) } } }, null)
  const original = await readFile(join(folder, '.edu/project.json'), 'utf8')
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  let desktop: ElectronApplication | undefined
  const choose = async (path: string) => desktop!.evaluate(({ dialog }, selected) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] }) }, path)
  try {
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env, EDU_HARNESS_TEST_DATA_DIR: join(root, 'profile') } })
    const page = await desktop.firstWindow(), main = page.getByRole('main')
    const back = page.getByRole('button', { name: 'Back', exact: true }), forward = page.getByRole('button', { name: 'Forward', exact: true })
    await choose(folder); await main.getByRole('button', { name: 'Open project', exact: true }).click()
    await expect(page.locator('#outline-heading')).toHaveText(outline.title)
    await flow.capture(desktop, page, 'saved-overview-light')
    await expect(main).toContainText(outline.scope); for (const value of outline.outcomes) await expect(main).toContainText(value)
    await page.getByRole('button', { name: 'Edit outline', exact: true }).click(); await expect(page.getByRole('dialog', { name: 'Edit your learning path' })).toBeVisible(); await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Edit outline', exact: true })).toBeFocused()
    await page.getByRole('button', { name: outline.lessons[0]!.title, exact: true }).click()
    await expect(page.locator('#topic-heading')).toHaveText(outline.lessons[0]!.title)
    await back.click(); await expect(page.locator('#outline-heading')).toBeVisible()
    await page.getByRole('button', { name: 'Open first topic', exact: true }).focus(); await page.keyboard.press('Enter')
    await expect(page.locator('#topic-heading')).toHaveText(outline.lessons[1]!.title); await expect(page.locator('#topic-heading')).toBeFocused()
    const lesson = outline.lessons[1]!
    for (const value of [lesson.question, lesson.overview, ...lesson.objectives, ...lesson.prerequisites, ...lesson.sources]) await expect(main).toContainText(value)
    for (const module of lesson.modules) { await expect(main).toContainText(module.title); await expect(main).toContainText(module.method); await expect(main).toContainText(module.purpose) }
    const disclosure = main.locator('details').first(), summary = disclosure.locator('summary')
    await summary.focus(); await page.keyboard.press('Enter'); await expect(main).toContainText(lesson.modules[0]!.task)
    const position = await main.evaluate(element => { element.scrollTop = 360; return element.scrollTop })
    await main.evaluate(element => { element.scrollTop = 0 }); await flow.capture(desktop, page, 'saved-topic-light'); await main.evaluate((element, value) => { element.scrollTop = value }, position)
    await back.click(); await expect(page.locator('#outline-heading')).toHaveText(outline.title)
    await forward.click(); await expect(page.locator('#topic-heading')).toHaveText(lesson.title); await expect(disclosure).toHaveAttribute('open', ''); await expect(summary).toBeFocused(); await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(position)
    expect(await readFile(join(folder, '.edu/project.json'), 'utf8')).toBe(original)
    // Typed main-sent presentation fixture; this does not qualify native Windows ACL behavior.
    const writableSnapshot = await workspaceSnapshot(page), readonlySnapshot = structuredClone(writableSnapshot)
    readonlySnapshot.activeProject!.writable = false; readonlySnapshot.activeProject!.issue = 'This project is read-only. You can read saved work; saving needs a writable folder.'
    await desktop.evaluate(({ BrowserWindow }, snapshot) => BrowserWindow.getAllWindows()[0]!.webContents.send('workspace:changed', snapshot), readonlySnapshot)
    await expect(main).toContainText(readonlySnapshot.activeProject!.issue!)
    await expect(main.getByRole('button', { name: `Edit topic: ${lesson.title}`, exact: true })).toBeDisabled()
    await main.evaluate(element => { element.scrollTop = 0 }); await flow.capture(desktop, page, 'saved-topic-readonly')
    await back.click(); await expect(page.locator('#outline-heading')).toBeVisible(); await expect(main.getByRole('button', { name: 'Edit outline', exact: true })).toBeDisabled()
    await forward.click(); await expect(page.locator('#topic-heading')).toHaveText(lesson.title)
    expect(await readFile(join(folder, '.edu/project.json'), 'utf8')).toBe(original); expect((await aiActivity(page)).active).toBeNull()
    await desktop.evaluate(({ BrowserWindow }, snapshot) => BrowserWindow.getAllWindows()[0]!.webContents.send('workspace:changed', snapshot), writableSnapshot)
    // An external current revision is observed only on explicit cross-project selection.
    await choose(other); await page.getByRole('button', { name: 'Choose project folder' }).click()
    const loaded = await storage.load(folder), renamed = structuredClone(loaded.document!); renamed.revision++; renamed.outline!.document.lessons[1]!.title = 'Current renamed evidence topic'; await storage.save(folder, renamed, loaded.digest)
    await back.click(); await expect(page.locator('#topic-heading')).toHaveText('Current renamed evidence topic')
    const firstHandle = (await workspaceSnapshot(page)).activeProject!.id
    // Hold the real authorized selection reply only after it publishes its actual workspace subscription.
    await desktop.evaluate(({ ipcMain }) => {
      type Handler = (event: unknown, payload: unknown) => Promise<unknown>
      const handlers = (ipcMain as unknown as { _invokeHandlers: Map<string, Handler> })._invokeHandlers
      const original = handlers.get('workspace:select')!
      let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve })
      const host = globalThis as unknown as { heldTopicSelection?: { held: boolean; restore(): void } }
      host.heldTopicSelection = { held: false, restore: () => { handlers.set('workspace:select', original); release() } }
      handlers.set('workspace:select', async (event, payload) => { handlers.set('workspace:select', original); const reply = await original(event, payload); host.heldTopicSelection!.held = true; await gate; return reply })
    })
    await page.getByRole('navigation', { name: 'Projects', exact: true }).getByRole('button', { name: 'Other learning', exact: true }).click()
    await expect.poll(() => desktop!.evaluate(() => (globalThis as unknown as { heldTopicSelection?: { held: boolean } }).heldTopicSelection?.held)).toBe(true)
    const otherHandle = (await workspaceSnapshot(page)).activeProject!.id
    expect(otherHandle).not.toBe(firstHandle)
    await expect(page.locator('#topic-heading')).toHaveCount(0)
    await expect(main).toHaveAttribute('data-destination', JSON.stringify(['project', otherHandle]))
    await main.getByRole('button', { name: 'Other project: How evidence changes a belief', exact: true }).focus()
    await expect(back).toBeDisabled()
    await desktop.evaluate(() => (globalThis as unknown as { heldTopicSelection?: { restore(): void } }).heldTopicSelection?.restore())
    await expect(back).toBeEnabled(); await back.click(); await expect(page.locator('#topic-heading')).toHaveText('Current renamed evidence topic')
    await expect(summary).toBeFocused(); await expect(disclosure).toHaveAttribute('open', '')
    await page.getByRole('button', { name: 'Settings', exact: true }).click(); await page.getByRole('radio', { name: 'Dark', exact: true }).check(); await page.keyboard.press('Escape')
    await main.evaluate(element => { element.scrollTop = 0 }); await flow.capture(desktop, page, 'saved-topic-dark')
    await back.click(); await expect(page.locator('#outline-heading')).toBeVisible(); await flow.capture(desktop, page, 'saved-overview-dark'); await forward.click(); await expect(page.locator('#topic-heading')).toHaveText('Current renamed evidence topic')
    await page.getByRole('button', { name: 'Edit topic: Current renamed evidence topic', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Edit topic', exact: true })).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Edit topic: Current renamed evidence topic', exact: true })).toBeFocused(); await expect(forward).toBeEnabled()
    await desktop.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]!; window.setContentSize(600, 640); window.webContents.setZoomFactor(2) })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const button of [main.getByRole('button', { name: 'Back to outline', exact: true }), main.getByRole('button', { name: 'Edit topic: Current renamed evidence topic', exact: true })]) { await button.scrollIntoViewIfNeeded(); await expect(button).toBeInViewport(); expect(await button.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(32) }
    expect(await main.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect(await main.locator('.workspace-actions').evaluate(element => element.ownerDocument.defaultView!.getComputedStyle(element).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)')
    await flow.capture(desktop, page, 'saved-topic-zoom')
    await desktop.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]!; window.webContents.setZoomFactor(1); window.setContentSize(1280, 840) })
    await forward.click(); const latest = await storage.load(folder), removed = structuredClone(latest.document!); removed.revision++; removed.outline!.document.lessons.splice(1, 1); removed.outline!.document.startingLessonId = 'beliefs'; await storage.save(folder, removed, latest.digest)
    const removedBytes = await readFile(join(folder, '.edu/project.json'), 'utf8')
    await back.click(); await expect(page.locator('#outline-heading')).toHaveText(outline.title); await expect(main.getByRole('status')).toContainText('no longer in the saved outline'); await expect(forward).toBeEnabled()
    await flow.capture(desktop, page, 'missing-topic-overview')
    await forward.click(); await back.click(); await expect(page.locator('#outline-heading')).toHaveText(outline.title); await expect(forward).toBeEnabled()
    await page.getByRole('button', { name: 'Open topic', exact: true }).click(); await expect(page.locator('#topic-heading')).toHaveText(outline.lessons[0]!.title); await expect(forward).toBeDisabled()
    expect((await aiActivity(page)).active).toBeNull(); expect((await aiActivity(page)).settled).toBeNull(); await expect(page.locator('.ai-panel')).toHaveCount(0)
    const saved = await storage.load(folder); expect(saved.document).toEqual(removed); expect(await readFile(join(folder, '.edu/project.json'), 'utf8')).toBe(removedBytes)
    // An editor whose stable topic disappears must close, never become a whole-outline editor.
    await page.getByRole('button', { name: `Edit topic: ${outline.lessons[0]!.title}`, exact: true }).click()
    await page.getByRole('textbox', { name: 'How would you like to change this topic?' }).fill('Retained topic draft')
    const replacement = structuredClone(removed); replacement.revision++; replacement.outline!.document.lessons[0]!.id = 'replacement'; replacement.outline!.document.startingLessonId = 'replacement'; await storage.save(folder, replacement, saved.digest)
    await page.evaluate(async () => { const api = (globalThis as unknown as { learning: import('../../src/shared/workspace').WorkspaceApi }).learning; const value = await api.getWorkspace(); if (value.ok && value.data.activeProject) await api.selectProject({ projectId: value.data.activeProject.id }) })
    await expect(page.getByRole('dialog', { name: 'Edit topic', exact: true })).not.toBeVisible(); await expect(page.locator('#outline-heading')).toBeFocused(); await expect(page.getByRole('button', { name: 'Rewrite outline', exact: true })).not.toBeVisible()
  } finally { if (desktop) await desktop.evaluate(() => (globalThis as unknown as { heldTopicSelection?: { restore(): void } }).heldTopicSelection?.restore()); await desktop?.close(); await rm(root, { recursive: true, force: true }) }
})
