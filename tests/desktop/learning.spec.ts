import { expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { LearningApi, StartSessionRequest } from '../../src/shared/contracts'

test('real desktop bridge, learning flow, reload, and process restart', async ({ playwright }, testInfo) => {
  const profile = await mkdtemp(join(tmpdir(), 'edu-harness-desktop-'))
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL')) as Record<string, string>
  const launch = () => playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env, EDU_HARNESS_TEST_DATA_DIR: profile } })
  let desktop: ElectronApplication | undefined
  try {
    desktop = await launch()
    const page = await desktop.firstWindow()
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await expect(page.getByRole('heading', { name: 'What would you like to understand?' })).toBeVisible()
    expect(page.url()).toBe('learningapp://workspace/index.html')
    expect(await page.evaluate('typeof require')).toBe('undefined')
    expect(await page.evaluate('typeof process')).toBe('undefined')
    expect(await page.evaluate('Object.keys(window.learning).sort()')).toEqual(['listCourses', 'listSessions', 'startSession', 'submitAnswer'])
    const invalid = await page.evaluate(async () => {
      const api = (globalThis as unknown as { learning: LearningApi }).learning
      return api.startSession({ courseId: 'typescript', goal: 123 } as unknown as StartSessionRequest)
    })
    expect(invalid).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
    await page.screenshot({ path: testInfo.outputPath('workspace.png'), animations: 'disabled' })
    await page.getByLabel('Give your session a focus').fill('Understand when a type is checked')
    await page.getByRole('button', { name: 'Start session' }).click()
    await expect(page.getByRole('heading', { name: 'Types describe what a value can be' })).toBeVisible()
    await page.getByRole('radio', { name: 'Yes. TypeScript checks incoming data at runtime.' }).check()
    await page.getByRole('button', { name: 'Check answer' }).click()
    await expect(page.getByRole('status')).toContainText('Take another look')
    await page.getByRole('radio', { name: 'No. The incoming value still needs runtime validation.' }).check()
    await page.getByRole('button', { name: 'Check answer' }).click()
    await expect(page.getByRole('status')).toContainText('Practice complete')
    await page.screenshot({ path: testInfo.outputPath('completed-session.png'), animations: 'disabled' })
    await page.reload()
    await expect(page.getByRole('button', { name: 'TypeScript essentials' })).toBeVisible()
    await page.getByRole('button', { name: 'TypeScript essentials' }).click()
    await expect(page.getByRole('status')).toContainText('Practice complete')
    expect(errors).toEqual([])
    await desktop.close()
    desktop = await launch()
    const restarted = await desktop.firstWindow()
    await expect(restarted.getByRole('heading', { name: 'What would you like to understand?' })).toBeVisible()
    await expect(restarted.getByText('Your sessions will appear here.')).toBeVisible()
  } finally {
    if (desktop) await desktop.close()
    await rm(profile, { recursive: true, force: true })
  }
})
