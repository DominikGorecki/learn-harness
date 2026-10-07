import { setDesktopAppearance } from '../fixtures/desktop-appearance'
import { learningOutline } from '../fixtures/learning-outline'
import { aiActivity } from '../fixtures/ai-activity'
import { expect, test } from '../flows/fixture'
import type { ElectronApplication } from '@playwright/test'
import { mkdir, mkdtemp, realpath, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'
import type { ProjectDocument } from '../../src/shared/workspace'
import type { GenerationApi } from '../../src/shared/generation'
import { barrierState, holdOutlineExit, holdValidatedWrite, releaseBarrier } from '../fixtures/desktop-ai-barriers'
import { menuCommand, menuRevision, workspaceSnapshot } from '../fixtures/desktop-navigation'

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
    await page.getByRole('button', { name: 'Retry save' }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Retry save' })).toBeInViewport()
    await flow.capture(desktop, page, 'generated-unsaved')
    await setDesktopAppearance(page, 'Dark'); await expect(page.getByText('Not saved yet', { exact: true })).toBeVisible(); await flow.capture(desktop, page, 'generated-unsaved-dark'); await setDesktopAppearance(page, 'Light')
    await page.getByRole('button', { name: 'Dismiss AI activity' }).click()
    await expect(page.locator('.ai-panel')).toHaveCount(0)
    await expect(page.locator('#outline-heading')).toBeFocused()
    await page.getByRole('button', { name: 'Review unsaved result' }).click()
    await expect(page.getByRole('button', { name: 'Retry save' })).toBeVisible()
    fixture.options.modelTestMode = 'hold'
    await page.getByRole('button', { name: 'Account settings' }).click()
    await page.getByRole('button', { name: 'Test GPT-6 Luna', exact: true }).click()
    await expect(page.locator('#ai-operation-heading')).toBeFocused()
    await expect.poll(() => fixture.inferenceRequests.length).toBe(2)
    await expect(page.locator('.ai-panel')).not.toContainText('Bayesian reasoning')
    await expect(page.locator('.ai-panel').getByRole('button', { name: 'Retry save' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.getByRole('button', { name: 'Dismiss AI activity' }).click()
    await expect(page.locator('.ai-panel')).toHaveCount(0)
    await page.getByRole('button', { name: 'Review unsaved result' }).click()
    await expect(page.getByRole('button', { name: 'Retry save' })).toBeVisible()
    await page.getByRole('button', { name: 'Projects', exact: true }).first().click()
    await page.getByRole('main').getByRole('button', { name: /First subject/ }).click()
    await expect(page.getByRole('heading', { name: 'This project needs attention.' })).toBeVisible()
    await expect(page.getByText('Not saved yet', { exact: true })).toBeVisible()
    await rm(file, { recursive: true })
    await rename(file + '.backup', file)
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    const retained = await page.evaluate(async () => (globalThis as unknown as { learning: GenerationApi }).learning.getGeneration())
    if (!retained.ok) throw new Error('Expected retained save result')
    const unsaved = retained.data.runs.find(run => run.status === 'unsaved')!
    await holdValidatedWrite(desktop, join(root, 'retry-write-sample'), (await saved()).projectId, unsaved.result!.document)
    await page.getByRole('button', { name: 'Retry save' }).click()
    await expect.poll(() => barrierState(desktop!, 'saveBarrier')).toMatchObject({ held: true })
    expect((await aiActivity(page)).active).toBeNull()
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Please wait for the operation to settle' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Stay here', exact: true }).click()
    await releaseBarrier(desktop, 'saveBarrier')
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    await expect(page.locator('#outline-heading')).toBeVisible()
    expect(fixture.inferenceRequests).toHaveLength(2)
    expect((await aiActivity(page)).active).toBeNull() // Retry is storage-only.
    await expect(page.locator('.ai-panel')).toHaveAttribute('data-outcome', 'saved')
    await expect(page.locator('#ai-operation-heading')).toHaveText('Outline saved to your project')
    await expect(page.getByLabel('Draft preview', { exact: true })).toContainText('Bayesian reasoning')
    await expect(page.locator('.ai-panel').getByRole('button', { name: 'Retry save' })).toHaveCount(0)
    const original = (await saved()).outline

    fixture.options.hideFastModel = true
    await page.getByRole('button', { name: 'Account settings' }).click()
    await page.getByRole('button', { name: 'Refresh models' }).click()
    await expect(page.getByText('3 model choices for your projects')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText('Your saved model is unavailable. Choose another project model to create an outline.', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Project model')).toHaveValue('fixture-model-fast')
    await page.getByLabel('Project model').selectOption('fixture-model')
    expect(fixture.inferenceRequests).toHaveLength(2)

    fixture.options.inferenceMode = 'usage-limit'
    await page.getByRole('button', { name: 'Refine learning direction' }).click()
    await page.getByRole('textbox').fill('A deeper look at evidence and base rates')
    await page.getByRole('button', { name: 'Create new outline', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Create new outline', exact: true }).click()
    await expect(page.locator('.ai-panel').getByText(/Your ChatGPT usage limit has been reached/)).toBeVisible()
    expect((await saved()).outline).toEqual(original)
    await expect(page.getByRole('textbox')).toHaveValue('A deeper look at evidence and base rates')
    await page.getByRole('button', { name: 'Open first topic', exact: true }).click()
    await expect(page.locator('#topic-heading')).toBeVisible()
    await page.getByRole('button', { name: 'Review your request', exact: true }).click()
    await expect(page.getByRole('textbox')).toHaveValue('A deeper look at evidence and base rates')
    await expect(page.getByRole('textbox')).toBeFocused()
    expect(fixture.inferenceRequests).toHaveLength(3)
    // Return to the original retained overview before exercising cross-project guard targets.
    await page.getByRole('button', { name: 'Back', exact: true }).click(); await expect(page.locator('#topic-heading')).toBeVisible()
    await page.getByRole('button', { name: 'Back', exact: true }).click(); await expect(page.locator('#outline-heading')).toBeVisible()
    await page.locator('.ai-panel').getByText(/Your ChatGPT usage limit has been reached/).scrollIntoViewIfNeeded()
    await flow.capture(desktop, page, 'usage-recovery')
    await setDesktopAppearance(page, 'Dark'); await flow.capture(desktop, page, 'usage-recovery-dark'); await setDesktopAppearance(page, 'Light')
    await page.getByRole('button', { name: 'Review ChatGPT connection' }).click()
    await page.getByRole('button', { name: 'Check availability' }).click()
    await expect(page.getByRole('heading', { name: 'Connected to ChatGPT' })).toBeVisible()
    await page.keyboard.press('Escape')

    fixture.options.inferenceMode = 'hold'
    await page.getByRole('button', { name: 'Create new outline', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Create new outline', exact: true }).click()
    await expect.poll(() => fixture.inferenceRequests.length).toBe(4)
    await desktop.evaluate(({ app }) => {
      const worker = app.getAppMetrics().find(metric => metric.name === 'Learning outline')
      if (!worker) throw new Error('Expected the owned outline worker')
      process.kill(worker.pid)
    })
    await expect(page.getByText('The outline process stopped unexpectedly. Your previous work is unchanged.', { exact: true })).toBeVisible()
    expect((await saved()).outline).toEqual(original)
    // Make an existing Forward branch before starting the owned operation.
    await choose(other)
    await page.getByRole('button', { name: 'Open project', exact: false }).click()
    await expect(page.locator('.workspace-title')).toHaveText('Second subject')
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.locator('.workspace-title')).toHaveText('Bayesian reasoning')
    await expect(page.getByRole('button', { name: 'Forward', exact: true })).toBeEnabled()
    const ownedHandle = (await workspaceSnapshot(page)).activeProject!.id
    await holdOutlineExit(desktop)
    await page.getByRole('button', { name: 'Create new outline', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Create new outline', exact: true }).click()
    await expect.poll(() => fixture.inferenceRequests.length).toBe(5)
    await menuCommand(desktop, 'go-back')
    await expect(page.getByRole('dialog', { name: 'An outline is still in progress' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'An outline is still in progress' })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Forward', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Forward', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'An outline is still in progress' })).toBeVisible()
    const guardedRevision = await menuRevision(page)
    await page.getByRole('button', { name: 'Stay here' }).click()
    await expect(page.getByRole('dialog', { name: 'An outline is still in progress' })).toBeHidden()
    await expect.poll(() => menuRevision(page)).toBeGreaterThan(guardedRevision)
    await expect(page.getByRole('button', { name: 'Forward', exact: true })).toBeEnabled()
    const settledRevision = await menuRevision(page)
    // Rendezvous with the renderer after main accepts the advisory state, then
    // observe the actual callback through the named bridge consumer.
    await page.evaluate(() => {
      const host = globalThis as unknown as { learning: import('../../src/shared/application-menu').ApplicationMenuApi; recoveryCommands: unknown[]; stopRecoveryCommands(): void }
      host.recoveryCommands = []
      host.stopRecoveryCommands = host.learning.onApplicationCommand(command => host.recoveryCommands.push(command))
    })
    await menuCommand(desktop, 'go-forward')
    await expect.poll(() => page.evaluate(() => (globalThis as unknown as { recoveryCommands: unknown[] }).recoveryCommands))
      .toEqual([{ command: 'go-forward', revision: settledRevision }])
    await expect(page.getByRole('dialog', { name: 'An outline is still in progress' })).toBeVisible()
    // Synthetic delivery models an older queued DOM close arriving after this
    // real menu command has opened its new, still-owned navigation decision.
    await page.getByRole('dialog', { name: 'An outline is still in progress' }).dispatchEvent('close')
    await expect(page.getByRole('dialog', { name: 'An outline is still in progress' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel and switch' }).click()
    await expect.poll(() => barrierState(desktop!, 'exitBarrier')).toMatchObject({ held: true })
    const ownedPid = (await barrierState(desktop, 'exitBarrier')).pid
    expect(ownedPid).toBeGreaterThan(0)
    expect(await desktop.evaluate((_, pid) => { try { process.kill(pid!, 0); return true } catch { return false } }, ownedPid)).toBe(false)
    expect((await workspaceSnapshot(page)).activeProject!.id).toBe(ownedHandle)
    expect((await aiActivity(page)).active).toMatchObject({ projectId: ownedHandle, phase: 'cancelling' })
    await expect(page.getByRole('button', { name: 'Forward', exact: true })).toBeDisabled()
    expect(fixture.inferenceRequests).toHaveLength(5)
    await releaseBarrier(desktop, 'exitBarrier')
    await expect(page.getByRole('textbox')).toHaveValue('')
    await expect(page.locator('.workspace-title')).toHaveText('Second subject')
    expect((await saved()).outline).toEqual(original)
    expect(fixture.inferenceRequests).toHaveLength(5)
    await expect(page.getByRole('button', { name: 'Forward', exact: true })).toBeDisabled()
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.locator('.workspace-title')).toHaveText('Bayesian reasoning')
    await expect(page.getByRole('button', { name: 'Forward', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Forward', exact: true }).click()
    await expect(page.locator('.workspace-title')).toHaveText('Second subject')
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.locator('.workspace-title')).toHaveText('Bayesian reasoning')
    const candidate = learningOutline(); candidate.title = 'A distinctly revised unsaved learning path'; candidate.lessons[0]!.title = 'Proposed beliefs topic awaiting publication'; candidate.lessons[0]!.overview = 'This proposed topic has not entered saved project state.'
    fixture.options.outlineResult = candidate; fixture.options.inferenceMode = 'preview-hold'
    await page.getByRole('button', { name: 'Open first topic', exact: true }).click()
    await expect(page.locator('#topic-heading')).toBeVisible()
    await page.getByRole('button', { name: 'Back to outline', exact: true }).click()
    await page.getByRole('button', { name: 'Create new outline', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Create new outline', exact: true }).click()
    await expect.poll(() => fixture.inferenceRequests.length).toBe(6)
    await writeFile(file, JSON.stringify({ ...await saved(), brief: 'Edited outside the app during generation' }))
    fixture.completePending()
    await expect(page.getByText('Not saved yet', { exact: true })).toBeVisible()
    await expect(page.locator('#outline-heading')).toHaveText(candidate.title)
    await expect(page.getByRole('button', { name: candidate.lessons[0]!.title, exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Open first topic', exact: true })).toBeDisabled()
    for (const command of await page.getByRole('button', { name: 'Open topic', exact: true }).all()) await expect(command).toBeDisabled()
    await expect(page.getByRole('main')).toContainText('Save this result before opening its proposed topics')
    const unsavedBytes = await readFile(file, 'utf8')
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.locator('#topic-heading')).toHaveText(original!.document.lessons[0]!.title)
    await page.getByRole('button', { name: 'Forward', exact: true }).click()
    await expect(page.getByText('Not saved yet', { exact: true })).toBeVisible()
    expect(await readFile(file, 'utf8')).toBe(unsavedBytes)
    expect(fixture.inferenceRequests).toHaveLength(6)
    await page.getByRole('button', { name: 'Review save conflict' }).click()
    await expect(page.getByRole('dialog', { name: 'Save over the changed outline?' })).toBeVisible()
    await page.getByRole('button', { name: 'Keep reviewing' }).click()
    expect((await saved()).brief).toBe('Edited outside the app during generation')
    await page.getByRole('button', { name: 'Review save conflict' }).click()
    await page.getByRole('button', { name: 'Save generated outline' }).click()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    expect(fixture.inferenceRequests).toHaveLength(6)
    expect((await saved()).outline?.model.id).toBe('fixture-model')
  } finally {
    if (desktop) {
      await (await desktop.firstWindow()).evaluate(() => (globalThis as unknown as { stopRecoveryCommands?: () => void }).stopRecoveryCommands?.())
      await releaseBarrier(desktop, 'exitBarrier'); await releaseBarrier(desktop, 'saveBarrier')
    }
    await desktop?.close()
    await fixture.close()
    await rm(root, { recursive: true, force: true })
  }
})
