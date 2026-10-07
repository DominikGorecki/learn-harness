import type { ElectronApplication } from '@playwright/test'
interface WriteGate { held: boolean; callId: string | null; release(): void; restore(): void }
interface Gates { chapterWrite?: WriteGate }
/** Selects the exact first chapter image call, excluding all metadata traffic. */
export async function imageWriteGate(desktop: ElectronApplication, sample: string, stage: 'intent' | 'requested' | 'terminal', fail = false, callId?: string): Promise<void> {
  await desktop.evaluate(async (_, input) => {
    const fs = process.getBuiltinModule('fs/promises') as typeof import('node:fs/promises'), sample = await fs.open(input.sample, 'wx')
    const prototype = Object.getPrototypeOf(sample) as { writeFile: typeof sample.writeFile }, original = prototype.writeFile
    await sample.close()
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve }), state: WriteGate = { held: false, callId: input.callId ?? null, release, restore: () => { prototype.writeFile = original; release() } }
    ;(globalThis as unknown as Gates).chapterWrite = state
    prototype.writeFile = async function (...args) {
      let matches = false
      if (typeof args[0] === 'string') {
        try {
          const value = JSON.parse(args[0])
          if (!state.callId && value.endpoint === 'images' && value.purpose === 'chapter-image') { state.callId = value.id; matches = input.stage === 'intent' }
          if (input.stage === 'requested' && value.runId && value.images?.some((image: { callId: string; status: string }) => image.callId === state.callId && image.status === 'requested')) matches = true
          if (input.stage === 'terminal' && value.callId === state.callId && value.sequence === 1 && value.cost?.kind === 'known') matches = true
        } catch { /* Unrelated writes run normally. */ }
      }
      if (matches && !state.held) {
        state.held = true
        if (input.fail) { prototype.writeFile = original; throw new Error('Owned fixture durable write failure') }
        await gate
      }
      return original.apply(this, args)
    }
  }, { sample, stage, fail, callId })
}
export async function writeGateState(desktop: ElectronApplication): Promise<{ held: boolean; callId: string | null }> {
  return desktop.evaluate(() => { const state = (globalThis as unknown as Gates).chapterWrite; return { held: state?.held ?? false, callId: state?.callId ?? null } })
}
export async function releaseWriteGate(desktop: ElectronApplication): Promise<void> { await desktop.evaluate(() => { (globalThis as unknown as Gates).chapterWrite?.restore() }) }
