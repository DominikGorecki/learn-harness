import type { Page } from '@playwright/test'
import type { AiActivitySnapshot, AiApi } from '../../src/shared/ai/activity'

interface ActivityHost { learning: AiApi; aiFrames: AiActivitySnapshot[]; stopAiFrames?: () => void }
export async function observeAiActivity(page: Page): Promise<void> {
  await page.evaluate(() => {
    const host = globalThis as unknown as ActivityHost
    host.stopAiFrames?.(); host.aiFrames = []
    host.stopAiFrames = host.learning.onAiActivityChanged(frame => { host.aiFrames.push(frame) })
  })
}
export async function aiActivity(page: Page): Promise<AiActivitySnapshot> {
  return page.evaluate(async () => {
    const result = await (globalThis as unknown as ActivityHost).learning.getAiActivity()
    if (!result.ok) throw new Error(result.error.code)
    return result.data
  })
}
export async function aiFrames(page: Page): Promise<AiActivitySnapshot[]> {
  return page.evaluate(() => (globalThis as unknown as ActivityHost).aiFrames)
}
