import type { ElectronApplication } from '@playwright/test'

interface Barrier { held: boolean; pid: number | null; release(): void; restore(): void }
interface MainBarriers { saveBarrier?: Barrier; exitBarrier?: Barrier }

/** Delay the ordinary validated write only for this owned project and exact result. */
export async function holdValidatedWrite(desktop: ElectronApplication, sample: string, projectId: string, outline: unknown) {
  await desktop.evaluate(async (_, input) => {
    const fs = process.getBuiltinModule('fs/promises') as typeof import('node:fs/promises')
    const sample = await fs.open(input.sample, 'wx')
    const prototype = Object.getPrototypeOf(sample) as { writeFile: typeof sample.writeFile }
    const original = prototype.writeFile
    await sample.close()
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const barrier: Barrier = { held: false, pid: null, release, restore: () => { prototype.writeFile = original; release() } }
    ;(globalThis as unknown as MainBarriers).saveBarrier = barrier
    prototype.writeFile = async function (...args) {
      if (typeof args[0] === 'string') {
        let matches = false
        try { const value = JSON.parse(args[0]); matches = value.projectId === input.projectId && JSON.stringify(value.outline?.document) === input.outline } catch { /* Unrelated writes run normally. */ }
        if (matches) { barrier.held = true; await gate }
      }
      return original.apply(this, args)
    }
  }, { sample, projectId, outline: JSON.stringify(outline) })
}

/** Retain only a genuine exit event from one real owned diagnostic utility. */
export async function holdDiagnosticExit(desktop: ElectronApplication) {
  await desktop.evaluate(({ utilityProcess }) => {
    const originalFork = utilityProcess.fork
    const barrier: Barrier = { held: false, pid: null, release: () => {}, restore: () => {} }
    ;(globalThis as unknown as MainBarriers).exitBarrier = barrier
    utilityProcess.fork = function (...args) {
      const worker = originalFork.apply(this, args)
      if (args[2]?.serviceName !== 'Learning model access') return worker
      utilityProcess.fork = originalFork
      const originalEmit = worker.emit
      let actualExit: Parameters<typeof worker.emit> | null = null
      barrier.release = () => {
        worker.emit = originalEmit
        if (actualExit) { const event = actualExit; actualExit = null; originalEmit.apply(worker, event) }
      }
      barrier.restore = () => { utilityProcess.fork = originalFork; barrier.release() }
      worker.emit = function (...event) {
        if (event[0] === 'exit') { actualExit = event; barrier.held = true; return true }
        if (event[0] === 'spawn') barrier.pid = worker.pid ?? null
        return originalEmit.apply(this, event)
      }
      return worker
    }
    barrier.restore = () => { utilityProcess.fork = originalFork; barrier.release() }
  })
}
export async function barrierState(desktop: ElectronApplication, name: 'saveBarrier' | 'exitBarrier') {
  return desktop.evaluate((_, name) => {
    const value = (globalThis as unknown as MainBarriers)[name]
    return { held: value?.held ?? false, pid: value?.pid ?? null }
  }, name)
}
export async function releaseBarrier(desktop: ElectronApplication, name: 'saveBarrier' | 'exitBarrier') {
  await desktop.evaluate((_, name) => { (globalThis as unknown as MainBarriers)[name]?.restore() }, name)
}
