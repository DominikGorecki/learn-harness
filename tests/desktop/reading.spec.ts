import { expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'
import { chmod, mkdir, mkdtemp, realpath, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createProjectStorage } from '../../src/main/storage/project-storage'
import { learningOutline } from '../fixtures/learning-outline'
import type { ProjectDocument } from '../../src/shared/workspace'

test('long saved outlines remain readable offline, at narrow sizes and 200% zoom; corrupt state is preserved', async ({ playwright }, testInfo) => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-reading-desktop-')))
  const folder = join(root, 'A subject with a long descriptive folder name'), corrupt = join(root, 'Corrupt project')
  await mkdir(folder); await mkdir(corrupt); await mkdir(join(corrupt, '.edu'))
  const invalid = '{preserve this invalid content'
  await writeFile(join(corrupt, '.edu/project.json'), invalid)
  const outline = learningOutline()
  outline.title = 'Understanding the many ways that evidence, uncertainty, assumptions and prior beliefs shape decisions in complex systems'
  outline.lessons = Array.from({ length: 20 }, (_, index) => ({ ...structuredClone(outline.lessons[index % 2]!), id: `lesson-${index}`, title: `Lesson ${index + 1}: ${outline.lessons[index % 2]!.title}`, overview: 'A meaningful overview with room for extended context. '.repeat(35) }))
  outline.startingLessonId = 'lesson-0'
  const model = { id: 'saved-model', name: 'A saved model with a deliberately long descriptive name for checking small windows and unavailable account states' }
  const document: ProjectDocument = { version: 1, projectId: 'reading-project', revision: 1, name: outline.title, createdAt: '2026-10-04T12:00:00Z', updatedAt: '2026-10-04T12:00:00Z',
    selectedModel: model, brief: 'A long detailed description. '.repeat(200), outline: { generatedAt: '2026-10-04T12:00:00Z', model, brief: 'Complex evidence', inferredBrief: null, document: outline, coverage: { files: [], limitations: ['Description-based outline.'] } } }
  await createProjectStorage().save(folder, document, null)
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  let desktop: ElectronApplication | undefined
  const choose = async (path: string) => desktop!.evaluate(({ dialog }, selected) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] }) }, path)
  try {
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env, EDU_HARNESS_TEST_DATA_DIR: join(root, 'profile') } })
    const page = await desktop.firstWindow()
    await choose(folder)
    await page.getByRole('main').getByRole('button', { name: 'Open project' }).click()
    await expect(page.getByRole('heading', { name: outline.title, exact: true })).toBeVisible()
    await expect(page.getByLabel('Project model')).toHaveValue('saved-model')
    await expect(page.locator('.lesson-disclosure')).toHaveCount(20)
    await page.locator('.lesson-disclosure').first().locator('summary').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.lesson-disclosure').first()).toHaveAttribute('open', '')
    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.setSize(600, 640))
    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.webContents.setZoomFactor(2))
    await expect.poll(() => page.evaluate(() => (globalThis as unknown as { innerWidth: number }).innerWidth)).toBe(300)
    expect(await page.locator('.studio-workspace').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect(await page.getByRole('main').evaluate(element => element.clientHeight)).toBeGreaterThan(150)
    await page.getByRole('button', { name: 'Refine learning direction' }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Refine learning direction' })).toBeInViewport()
    const capture = await desktop.evaluate(async ({ BrowserWindow }) => (await BrowserWindow.getAllWindows()[0]!.webContents.capturePage()).toPNG().toString('base64'))
    await writeFile(testInfo.outputPath('long-outline-zoom.png'), Buffer.from(capture, 'base64'))
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await page.locator('.workspace-enter').evaluate(element => element.ownerDocument.defaultView!.getComputedStyle(element).animationName)).toBe('none')
    await desktop.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0]!.webContents.setZoomFactor(1); BrowserWindow.getAllWindows()[0]!.setSize(1280, 840) })

    if (process.platform !== 'win32' && process.geteuid?.() !== 0) {
      await chmod(folder, 0o500); await chmod(join(folder, '.edu'), 0o500)
      await page.getByRole('navigation', { name: 'Projects', exact: true }).getByRole('button').click()
      await expect(page.getByText('This project is read-only. You can read saved work; saving needs a writable folder.', { exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: outline.title, exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Refine learning direction' }).click()
      await expect(page.getByRole('button', { name: 'Create new outline', exact: true })).toBeDisabled()
      await chmod(folder, 0o700); await chmod(join(folder, '.edu'), 0o700)
    }
    const metadata = join(folder, '.edu/project.json')
    await rename(metadata, metadata + '.backup')
    await choose(folder)
    await page.getByRole('button', { name: 'Open project', exact: false }).click()
    await expect(page.getByRole('heading', { name: 'This project needs attention.' })).toBeVisible()
    await expect(page.getByText('The saved learning project is missing from this folder. Restore its .edu state or locate the original project.', { exact: true })).toBeVisible()
    await expect(readFile(metadata, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
    await rename(metadata + '.backup', metadata)
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await expect(page.getByRole('heading', { name: outline.title, exact: true })).toBeVisible()
    await choose(corrupt)
    await page.getByRole('button', { name: 'Open project', exact: false }).click()
    await expect(page.getByRole('heading', { name: 'This project needs attention.' })).toBeVisible()
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    expect(await readFile(join(corrupt, '.edu/project.json'), 'utf8')).toBe(invalid)
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('unreadable-project.png') })
  } finally {
    await desktop?.close()
    await chmod(folder, 0o700); await chmod(join(folder, '.edu'), 0o700)
    await rm(root, { recursive: true, force: true })
  }
})
