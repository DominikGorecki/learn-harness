import { expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'
import type { ProjectDocument } from '../../src/shared/workspace'

test('folder-only learning, verified source coverage, ambiguity and unsupported recovery', async ({ playwright }, testInfo) => {
  const fixture = await startChatGPTFixture({ inferenceMode: 'materials' })
  const root = await mkdtemp(join(tmpdir(), 'edu-material-desktop-'))
  const folder = join(root, 'Notes'), ambiguous = join(root, 'Mixed notes'), unsupported = join(root, 'Slides')
  await mkdir(folder); await mkdir(join(folder, 'chapters')); await mkdir(ambiguous); await mkdir(unsupported)
  const source = '# Bayesian reasoning\nPriors, evidence, and updating beliefs.\n'
  await writeFile(join(folder, 'chapters/notes.md'), source)
  await writeFile(join(folder, 'slides.pdf'), 'Unsupported PDF')
  await writeFile(join(folder, '.env'), 'PRIVATE_SOURCE_NOT_TRANSMITTED')
  await writeFile(join(ambiguous, 'notes.md'), '# Probability\nEvidence and beliefs.\n# City planning\nTransport networks and housing.')
  await writeFile(join(unsupported, 'lecture.pdf'), 'Unsupported PDF')
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  let desktop: ElectronApplication | undefined
  const choose = async (path: string) => desktop!.evaluate(({ dialog }, selected) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] })
  }, path)
  try {
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env,
      EDU_HARNESS_TEST_DATA_DIR: join(root, 'profile'), EDU_HARNESS_TEST_PROVIDER_URL: fixture.baseUrl } })
    await desktop.evaluate(({ shell }) => { shell.openExternal = async url => { await fetch(url) } })
    const page = await desktop.firstWindow()
    await page.getByRole('button', { name: 'Account settings' }).click()
    await page.getByRole('button', { name: 'Continue with ChatGPT' }).click()
    await expect(page.getByRole('heading', { name: 'Connected to ChatGPT' })).toBeVisible()
    await page.keyboard.press('Escape')
    await choose(folder)
    await page.getByRole('main').getByRole('button', { name: 'Open project' }).click()
    await expect(page.getByRole('textbox', { name: 'Your learning goal (optional)' })).toHaveValue('')
    expect(fixture.inferenceRequests).toHaveLength(0)
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('material-setup.png') })
    await page.getByRole('button', { name: 'Create outline', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Bayesian reasoning', exact: true })).toBeVisible()
    const document = JSON.parse(await readFile(join(folder, '.edu/project.json'), 'utf8')) as ProjectDocument
    expect(document.outline?.document.lessons[0]?.sources).toEqual(['chapters/notes.md'])
    expect(document.outline?.coverage.files).toEqual(expect.arrayContaining([
      { path: 'chapters/notes.md', status: 'read', reason: null },
      { path: 'slides.pdf', status: 'unsupported', reason: expect.any(String) }
    ]))
    expect(JSON.stringify(fixture.inferenceRequests)).not.toContain('PRIVATE_SOURCE_NOT_TRANSMITTED')
    expect(await readFile(join(folder, 'chapters/notes.md'), 'utf8')).toBe(source)
    await page.getByText('Project material and coverage', { exact: true }).click()
    await expect(page.getByText('chapters/notes.md', { exact: true })).toBeVisible()
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('material-coverage.png') })

    fixture.options.inferenceMode = 'materials-clarify'
    await choose(ambiguous)
    await page.getByRole('button', { name: 'Open project', exact: false }).click()
    await page.getByRole('button', { name: 'Create outline', exact: true }).click()
    await expect(page.getByText('Would you like to focus on probability or city planning?', { exact: true })).toBeVisible()
    await expect(page.getByRole('textbox')).toBeEditable()
    await page.getByRole('textbox').fill('Focus on Bayesian reasoning; use examples from city planning.')
    fixture.options.inferenceMode = 'materials'
    await page.getByRole('button', { name: 'Create outline', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Bayesian reasoning', exact: true })).toBeVisible()
    expect(JSON.stringify(fixture.inferenceRequests.at(-1)?.input)).toContain('Focus on Bayesian reasoning; use examples from city planning.')

    await choose(unsupported)
    await page.getByRole('button', { name: 'Open project', exact: false }).click()
    const before = fixture.inferenceRequests.length
    await page.getByRole('button', { name: 'Create outline', exact: true }).click()
    await expect(page.getByText('This folder has no readable learning text. Add a topic or describe what you want to understand.', { exact: true })).toBeVisible()
    await expect(page.getByRole('textbox')).toBeEditable()
    expect(fixture.inferenceRequests).toHaveLength(before)
    await page.getByText('Material considered', { exact: true }).click()
    await expect(page.getByText('lecture.pdf', { exact: true })).toBeVisible()
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('unsupported-material.png') })
  } finally {
    await desktop?.close()
    await fixture.close()
    await rm(root, { recursive: true, force: true })
  }
})
