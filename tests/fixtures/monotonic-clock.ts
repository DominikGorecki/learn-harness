import type { MonotonicClock } from '../../src/main/generation/pi-stream-liveness'
export class FakeMonotonicClock implements MonotonicClock {
  time = 0
  private sequence = 0
  readonly timers = new Map<number, { at: number; action(): void }>()
  now(): number { return this.time }
  schedule(action: () => void, delay: number): number { const id = ++this.sequence; this.timers.set(id, { at: this.time + delay, action }); return id }
  cancel(handle: unknown): void { this.timers.delete(handle as number) }
  advance(ms: number): void {
    const end = this.time + ms
    while (true) {
      const next = [...this.timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]
      if (!next) break
      this.time = next[1].at; this.timers.delete(next[0]); next[1].action()
    }
    this.time = end
  }
}
export async function flushMicrotasks(): Promise<void> { for (let i = 0; i < 50; i++) await Promise.resolve() }
