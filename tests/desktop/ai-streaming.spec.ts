import { expect, test } from '../flows/fixture'
import type { ElectronApplication, PlaywrightWorkerArgs } from '@playwright/test'
import { mkdir, mkdtemp, realpath, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startChatGPTFixture } from '../fixtures/chatgpt-provider'
import { controlledOutlineStream } from '../fixtures/controlled-outline-stream'
import { barrierState, holdDiagnosticExit, holdValidatedWrite, releaseBarrier } from '../fixtures/desktop-ai-barriers'
import { aiActivity, aiFrames, observeAiActivity } from '../fixtures/ai-activity'
import { learningOutline } from '../fixtures/learning-outline'
import type { ProjectDocument } from '../../src/shared/workspace'
import type { AccountApi } from '../../src/shared/account'
import type { AiActivitySnapshot, AiApi } from '../../src/shared/ai/activity'
import { aiLimits, parseAiActivitySnapshot } from '../../src/shared/ai/activity'

async function session(playwright: PlaywrightWorkerArgs['playwright']) {
  const fixture = await startChatGPTFixture()
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-streaming-desktop-')))
  const project = join(root, 'Streaming project'); await mkdir(project)
  await writeFile(join(project, 'preserved.bin'), 'Existing project bytes remain authoritative.\n')
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && !['ELECTRON_RUN_AS_NODE', 'ELECTRON_RENDERER_URL'].includes(key))) as Record<string, string>
  let desktop: ElectronApplication | undefined
  try {
    desktop = await playwright._electron.launch({ args: [resolve('out/main/index.js')], env: { ...env,
      EDU_HARNESS_TEST_DATA_DIR: join(root, 'profile'), EDU_HARNESS_TEST_PROVIDER_URL: fixture.baseUrl } })
    await desktop.evaluate(({ dialog, shell }, folder) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] })
      shell.openExternal = async url => { await fetch(url) }
    }, project)
    const page = await desktop.firstWindow()
    await page.getByRole('main').getByRole('button', { name: 'Open project' }).click()
    await page.getByRole('textbox').fill('Explore uncertainty through a patient stream of evidence.')
    await page.getByRole('button', { name: 'Create outline', exact: true }).click()
    await page.getByRole('button', { name: 'Continue with ChatGPT' }).click()
    await expect(page.getByRole('heading', { name: 'Connected to ChatGPT' })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByLabel('Project model').selectOption('fixture-model')
    const bytes = () => readFile(join(project, '.edu/project.json'), 'utf8')
    const saved = async () => JSON.parse(await bytes()) as ProjectDocument
    await expect.poll(async () => { try { return (await saved()).selectedModel?.id } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error
    } }).toBe('fixture-model')
    return { fixture, root, project, desktop, page, bytes, saved,
      close: async () => {
        try { await releaseBarrier(desktop!, 'saveBarrier') }
        finally {
          try { await releaseBarrier(desktop!, 'exitBarrier') }
          finally { try { await desktop!.close() } finally { try { await fixture.close() } finally { await rm(root, { recursive: true, force: true }) } } }
        }
      } }
  } catch (error) { await desktop?.close(); await fixture.close(); await rm(root, { recursive: true, force: true }); throw error }
}

test('receiving for 200.5 real seconds keeps draft provisional before genuine checking and saving', {
  tag: '@ai-streaming', annotation: { type: 'flow', description: 'ai-streaming' }
}, async ({ playwright, flow }) => {
  // Only this acceptance journey exceeds the normal 45-second suite budget.
  test.setTimeout(300_000)
  const app = await session(playwright)
  const { desktop, page, fixture } = app
  let stream: ReturnType<typeof controlledOutlineStream> | undefined
  try {
    const marker = 'LATEST-BURST-200'
    const outline = learningOutline()
    outline.overview = 'Evidence arrives gradually. ' + '界\\"'.repeat(80) + marker + '. The complete accepted result replaces this draft.'
    fixture.options.onInference = (response, payload) => {
      if (payload.tools) { stream = controlledOutlineStream(response, outline, 200_500); return true }
      return false
    }
    await holdValidatedWrite(desktop, join(app.root, 'handle-sample'), (await app.saved()).projectId, outline)
    await observeAiActivity(page)
    // Timestamp the actual named bridge delivery, installed before provider bytes.
    await page.evaluate(() => {
      const host = globalThis as unknown as { learning: AiApi; arrivals: { at: number; frame: AiActivitySnapshot }[]; stopArrivals?: () => void }
      host.arrivals = []; host.stopArrivals = host.learning.onAiActivityChanged(frame => host.arrivals.push({ at: Date.now(), frame }))
    })
    const admission = Date.now()
    await page.getByRole('button', { name: 'Create outline', exact: true }).click()
    await expect(page.locator('#ai-operation-heading')).toBeFocused()
    expect(Date.now() - admission).toBeLessThan(5_000)
    await expect.poll(() => stream?.firstByteAt, { timeout: 35_000 }).toBeTruthy()
    await expect.poll(async () => (await aiActivity(page)).active?.lastByteAgeMs).not.toBeNull()
    const baseline = await app.bytes(), source = await readFile(join(app.project, 'preserved.bin'), 'utf8')
    const panel = page.locator('.ai-panel')
    await expect(panel.getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled()
    expect((await aiActivity(page)).active?.preview.kind).toBe('none')
    await flow.capture(desktop, page, 'stream-waiting')
    stream!.begin()
    await expect.poll(async () => (await aiActivity(page)).active?.preview.kind).toBe('outline')
    await expect(panel.getByText('Draft preview · Not saved', { exact: false })).toBeVisible()
    // Let both preview schedulers finish the initial update before the burst.
    await page.waitForTimeout(250)
    const burstStarted = Date.now()
    const burstAt = stream!.burst(marker)
    await expect.poll(() => page.evaluate(marker => {
      const host = globalThis as unknown as { arrivals: { at: number; frame: AiActivitySnapshot }[] }
      return host.arrivals.find(value => value.frame.active?.preview.kind === 'outline' && value.frame.active.preview.overview?.includes(marker))?.at ?? null
    }, marker)).not.toBeNull()
    const arrival = await page.evaluate(marker => {
      const host = globalThis as unknown as { arrivals: { at: number; frame: AiActivitySnapshot }[] }
      return host.arrivals.find(value => value.frame.active?.preview.kind === 'outline' && value.frame.active.preview.overview?.includes(marker))!.at
    }, marker)
    expect(arrival - burstAt).toBeGreaterThanOrEqual(0)
    expect(arrival - burstAt).toBeLessThanOrEqual(250)
    await flow.capture(desktop, page, 'stream-structured-light')
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByRole('radio', { name: 'Dark', exact: true }).check()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await flow.capture(desktop, page, 'stream-structured-dark')
    // Real wall time since the first received provider chunk, without clock acceleration.
    await new Promise<void>(resolve => setTimeout(resolve, Math.max(0, stream!.firstByteAt + 190_100 - Date.now())))
    expect(Date.now() - stream!.firstByteAt).toBeGreaterThanOrEqual(190_000)
    const active = (await aiActivity(page)).active
    expect(active).toMatchObject({ kind: 'create-outline', outcome: null, canCancel: true, preview: { kind: 'outline' } })
    expect(active!.lastByteAgeMs).toBeLessThan(10_000)
    await expect(panel.getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled()
    expect(await app.bytes()).toBe(baseline)
    expect(await readFile(join(app.project, 'preserved.bin'), 'utf8')).toBe(source)
    expect((await app.saved()).outline).toBeNull()
    expect(fixture.inferenceRequests).toHaveLength(1)
    await flow.capture(desktop, page, 'stream-past-190')
    await expect.poll(() => barrierState(desktop, 'saveBarrier'), { timeout: 35_000 }).toMatchObject({ held: true })
    expect(stream!.completedAt()! - stream!.firstByteAt).toBeGreaterThanOrEqual(200_500)
    expect((await aiActivity(page)).active).toMatchObject({ phase: 'saving', canCancel: false })
    await expect(panel.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
    expect(await app.bytes()).toBe(baseline)
    await flow.capture(desktop, page, 'stream-saving')
    // Saving rejects this intent; settlement never resumes a queued departure.
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Please wait for the operation to settle' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Cancel and switch', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Stay here', exact: true }).click()
    await releaseBarrier(desktop, 'saveBarrier')
    await expect.poll(async () => (await aiActivity(page)).settled?.outcome).toBe('saved')
    expect((await app.saved()).outline?.document).toEqual(outline)
    const acceptedBytes = await app.bytes()
    expect(await readFile(join(app.project, 'preserved.bin'), 'utf8')).toBe(source)
    await expect.poll(() => desktop.evaluate(({ app }) => app.getAppMetrics().filter(value => value.name === 'Learning outline').length)).toBe(0)
    await flow.capture(desktop, page, 'stream-saved')
    await expect(page.locator('#outline-heading')).toBeVisible()
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Your projects', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Forward', exact: true }).click()
    await expect(page.locator('#outline-heading')).toBeVisible()
    expect(fixture.inferenceRequests).toHaveLength(1)
    const frames = await aiFrames(page)
    for (let i = 0; i < frames.length; i++) {
      parseAiActivitySnapshot(frames[i])
      expect(Buffer.byteLength(JSON.stringify(frames[i]))).toBeLessThanOrEqual(aiLimits.frameBytes)
      if (i) expect(frames[i]!.revision).toBeGreaterThan(frames[i - 1]!.revision)
    }
    const burstFrames = await page.evaluate(({ from, through }) => (globalThis as unknown as {
      arrivals: { at: number; frame: AiActivitySnapshot }[] }).arrivals.filter(value => value.at >= from && value.at <= through).map(value => value.frame), { from: burstStarted, through: arrival })
    const burstPreviews = new Set(burstFrames.filter(frame => frame.active?.preview.kind === 'outline').map(frame => JSON.stringify(frame.active!.preview)))
    expect(burstPreviews.size).toBeLessThanOrEqual(4) // Byte heartbeats later advance revisions legitimately.
    expect(frames.length).toBeLessThan(300)
    const savedIndex = frames.findIndex(frame => frame.settled?.outcome === 'saved')
    expect(savedIndex).toBeGreaterThan(frames.findIndex(frame => frame.active?.phase === 'saving'))
    expect(frames.slice(savedIndex).every(frame => !frame.active)).toBe(true)
    console.log(JSON.stringify({ receivingMs: stream!.completedAt()! - stream!.firstByteAt, latestBridgeMs: arrival - burstAt, providerBytes: stream!.bytes(), bridgeFrames: frames.length, burstPreviews: burstPreviews.size }))

    await holdDiagnosticExit(desktop)
    await page.getByRole('button', { name: 'Account settings' }).click()
    await page.getByRole('button', { name: 'Test GPT-6.1 Sol', exact: true }).click()
    await expect.poll(() => barrierState(desktop, 'exitBarrier'), { timeout: 35_000 }).toMatchObject({ held: true })
    const checking = (await aiActivity(page)).active!
    expect(checking).toMatchObject({ kind: 'test-sol', phase: 'validating', outcome: null, preview: { kind: 'model-test-evidence', hasReply: true, completed: true, modelMatched: true } })
    expect(checking.activity.find(value => value.id === 'diagnostic-proof')?.state).toBe('running')
    const account = await page.evaluate(async () => (globalThis as unknown as { learning: AccountApi }).learning.getAccount())
    expect(account).toMatchObject({ ok: true, data: { verifiedModelIds: [] } })
    const competing = await page.evaluate(async () => (globalThis as unknown as { learning: AccountApi }).learning.testLunaModel())
    expect(competing).toMatchObject({ ok: false, error: { code: 'BUSY' } })
    expect(fixture.inferenceRequests).toHaveLength(2)
    expect(await app.bytes()).toBe(acceptedBytes)
    await expect.poll(() => desktop.evaluate(({ app }) => app.getAppMetrics().filter(value => value.name === 'Learning model access').length)).toBe(0)
    const pid = (await barrierState(desktop, 'exitBarrier')).pid
    expect(pid).toBeGreaterThan(0)
    expect(await desktop.evaluate((_, pid) => { try { process.kill(pid!, 0); return true } catch { return false } }, pid)).toBe(false)
    await expect(panel).toContainText('Checking the result')
    await flow.capture(desktop, page, 'stream-checking')
    await releaseBarrier(desktop, 'exitBarrier')
    await expect.poll(async () => (await aiActivity(page)).settled?.outcome).toBe('verified')
    expect((await aiActivity(page)).settled?.activity.every(value => value.state !== 'running')).toBe(true)
    expect(await page.evaluate(async () => (globalThis as unknown as { learning: AccountApi }).learning.getAccount())).toMatchObject({ ok: true, data: { verifiedModelIds: ['gpt-6.1-sol'] } })
    expect(fixture.inferenceRequests).toHaveLength(2)
    expect(fixture.inferenceRequests[1]).toMatchObject({ model: 'gpt-6.1-sol', stream: true, store: false })
    expect(fixture.inferenceRequests[1]).not.toHaveProperty('tools')
    expect(JSON.stringify(fixture.inferenceRequests[1])).not.toMatch(/Streaming project|uncertainty|preserved.bin/)
    expect(await app.bytes()).toBe(acceptedBytes)
  } finally { await app.close() }
})

test('structured repair replaces the candidate and accepts only the independently valid second turn', {
  tag: '@ai-streaming-repair', annotation: { type: 'flow', description: 'ai-streaming-repair' }
}, async ({ playwright, flow }) => {
  const app = await session(playwright)
  const { desktop, page, fixture } = app
  const invalid = learningOutline(); invalid.title = 'First candidate must be repaired'; invalid.startingLessonId = 'missing-lesson'
  const repaired = learningOutline(); repaired.title = 'Repaired evidence pathway'; repaired.overview = 'A distinct final candidate replaces the rejected provisional outline.'
  const streams: ReturnType<typeof controlledOutlineStream>[] = []
  fixture.options.onInference = (response, payload) => {
    if (!payload.tools) return false
    streams.push(controlledOutlineStream(response, streams.length === 0 ? invalid : repaired)); return true
  }
  try {
    await observeAiActivity(page)
    await page.getByRole('button', { name: 'Create outline', exact: true }).click()
    await expect.poll(() => streams.length, { timeout: 35_000 }).toBe(1)
    const baseline = await app.bytes()
    streams[0]!.begin()
    await expect.poll(async () => (await aiActivity(page)).active?.preview).toMatchObject({ kind: 'outline', title: invalid.title })
    await expect(page.getByLabel('Draft preview', { exact: true })).toContainText(invalid.title)
    expect(await app.bytes()).toBe(baseline)
    await flow.capture(desktop, page, 'repair-first-draft')
    streams[0]!.finish()
    await expect.poll(() => streams.length).toBe(2)
    expect(await app.bytes()).toBe(baseline)
    streams[1]!.begin()
    await expect.poll(async () => (await aiActivity(page)).active?.preview).toMatchObject({ kind: 'outline', title: repaired.title })
    await expect(page.getByLabel('Draft preview', { exact: true })).toContainText(repaired.title)
    await expect(page.getByLabel('Draft preview', { exact: true })).not.toContainText(invalid.title)
    expect((await aiActivity(page)).active?.turn).toBe(2)
    expect(await app.bytes()).toBe(baseline)
    await flow.capture(desktop, page, 'repair-replacement')
    streams[1]!.finish()
    await expect.poll(async () => (await aiActivity(page)).settled?.outcome).toBe('saved')
    expect((await app.saved()).outline?.document).toEqual(repaired)
    expect(fixture.inferenceRequests).toHaveLength(2)
    const frames = await aiFrames(page)
    const candidateIndex = frames.findIndex(frame => frame.active?.preview.kind === 'outline' && frame.active.preview.title === repaired.title)
    expect(candidateIndex).toBeGreaterThan(0)
    expect(frames.slice(candidateIndex).every(frame => (frame.active ?? frame.settled)?.preview.kind !== 'outline' || ((frame.active ?? frame.settled)!.preview as { title?: string }).title !== invalid.title)).toBe(true)
    await flow.capture(desktop, page, 'repair-saved')
  } finally { await app.close() }
})
