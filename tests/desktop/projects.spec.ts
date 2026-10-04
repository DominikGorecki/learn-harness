import { expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'

test('real folders, project preferences, restart, relink, and responsive navigation', async ({ playwright }, testInfo) => {
  const fixture = await startChatGPTFixture()
  const root = await mkdtemp(join(tmpdir(), 'edu-project-desktop-'))
  const profile = join(root, 'profile')
  const first = join(root, 'Bayesian reasoning')
  const second = join(root, 'Urban ecology')
  await mkdir(first); await mkdir(second)
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  const launch = () => playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env,
    EDU_HARNESS_TEST_DATA_DIR: profile, EDU_HARNESS_TEST_PROVIDER_URL: fixture.baseUrl } })
  let desktop: ElectronApplication | undefined
  const choose = async (path: string | null) => desktop!.evaluate(({ dialog }, selected) => {
    dialog.showOpenDialog = async () => ({ canceled: selected === null, filePaths: selected ? [selected] : [] })
  }, path)
  const saved = async (folder: string) => JSON.parse(await readFile(join(folder, '.edu/project.json'), 'utf8')) as { brief: string; selectedModel: { id: string } | null; projectId: string }
  try {
    desktop = await launch()
    let page = await desktop.firstWindow()
    await expect(page.getByRole('heading', { name: 'What would you like to understand?' })).toBeVisible()
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('dashboard-empty.png') })
    await choose(first)
    await page.getByRole('main').getByRole('button', { name: 'Open project' }).click()
    await expect(page.getByRole('textbox', { name: 'Your learning goal' })).toBeVisible()
    expect(await readdir(first)).toEqual([])
    expect(fixture.authorizations).toHaveLength(0)
    await page.getByRole('textbox').fill('Understand Bayes with concrete examples and no calculus.')
    await page.getByRole('button', { name: 'Save learning goal' }).click()
    await expect(page.getByText('Learning goal saved', { exact: true })).toBeVisible()
    expect((await saved(first)).brief).toContain('Bayes')

    await desktop.evaluate(({ shell }) => { shell.openExternal = async url => { await fetch(url) } })
    await page.getByRole('button', { name: 'Account settings' }).click()
    await page.getByRole('button', { name: 'Continue with ChatGPT' }).click()
    await expect(page.getByRole('heading', { name: 'Connected to ChatGPT' })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByLabel('Project model').selectOption('fixture-model-fast')
    await expect.poll(async () => (await saved(first)).selectedModel?.id).toBe('fixture-model-fast')
    await page.getByRole('textbox').fill('An unsaved question about evidence')
    await choose(second)
    await page.getByRole('button', { name: 'Open project', exact: false }).click()
    await expect(page.getByRole('textbox')).toHaveValue('')
    await page.getByLabel('Project model').selectOption('fixture-model-fast')
    await page.getByLabel('Project model').selectOption('fixture-model')
    await expect.poll(async () => (await saved(second)).selectedModel?.id).toBe('fixture-model')
    await page.getByRole('navigation', { name: 'Projects', exact: true }).getByRole('button', { name: 'Bayesian reasoning' }).click()
    await expect(page.getByRole('textbox')).toHaveValue('An unsaved question about evidence')
    await expect(page.getByLabel('Project model')).toHaveValue('fixture-model-fast')
    await choose(null)
    await page.getByRole('button', { name: 'Open project', exact: false }).click()
    await expect(page.getByRole('textbox')).toHaveValue('An unsaved question about evidence')
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('project-workspace.png') })

    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.setSize(600, 640))
    await expect(page.getByRole('button', { name: 'Show navigation' })).toBeVisible()
    await page.getByRole('button', { name: 'Show navigation' }).click()
    await expect(page.getByRole('dialog', { name: 'Project navigation' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Show navigation' })).toBeFocused()
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('project-narrow.png') })
    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.webContents.setZoomFactor(2))
    await expect.poll(() => page.evaluate(() => (globalThis as unknown as { innerWidth: number }).innerWidth)).toBe(300)
    await page.getByRole('button', { name: 'Save learning goal' }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Save learning goal' })).toBeInViewport()
    expect(await page.getByRole('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect(await page.locator('.studio-workspace').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    // Electron's native capture avoids Playwright clipping screenshots to CSS
    // dimensions when webContents has a non-default zoom factor.
    const capture = await desktop.evaluate(async ({ BrowserWindow }) => (await BrowserWindow.getAllWindows()[0]!.webContents.capturePage()).toPNG().toString('base64'))
    await writeFile(testInfo.outputPath('project-zoom-200.png'), Buffer.from(capture, 'base64'))
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await page.locator('.workspace-enter').evaluate(element => element.ownerDocument.defaultView!.getComputedStyle(element).animationName)).toBe('none')
    await desktop.close(); desktop = undefined

    desktop = await launch()
    page = await desktop.firstWindow()
    await expect(page.getByRole('heading', { name: 'Your projects', exact: true })).toBeVisible()
    await expect(page.locator('.dashboard-project')).toHaveCount(2)
    await page.getByRole('main').getByRole('button', { name: /Bayesian reasoning/ }).click()
    await expect(page.getByRole('textbox')).toHaveValue('Understand Bayes with concrete examples and no calculus.')
    await expect(page.getByLabel('Project model')).toHaveValue('fixture-model-fast')
    const identity = (await saved(first)).projectId
    const moved = join(root, 'Moved project')
    await rename(first, moved)
    await page.getByRole('button', { name: 'Projects', exact: true }).first().click()
    await page.getByRole('main').getByRole('button', { name: /Bayesian reasoning/ }).click()
    await expect(page.getByRole('heading', { name: 'Let’s find your project.' })).toBeVisible()
    await choose(moved)
    await page.getByRole('button', { name: 'Locate folder' }).click()
    await expect(page.getByRole('textbox')).toHaveValue('Understand Bayes with concrete examples and no calculus.')
    expect((await saved(moved)).projectId).toBe(identity)
  } finally {
    await desktop?.close()
    await fixture.close()
    await rm(root, { recursive: true, force: true })
  }
})
