import { openRouterPolicy } from '../../shared/openrouter'
import { systemClock } from './pi-stream-liveness'
import type { MonotonicClock, TransportState, TransportReason } from './pi-stream-liveness'
import { observe } from './observe'

/** Headers and utility heartbeats cannot extend a buffered image network wait. */
export class ImageResponseLiveness {
  private deadline: unknown | null = null
  private report: unknown | null = null
  private ended = false
  private bytes = 0
  private chunks = 0
  private lastByte: number | null = null
  private readonly started: number
  private readonly clock: MonotonicClock
  constructor(private readonly options: { clock?: MonotonicClock; onTimeout(): void; onState?(state: TransportState): void }) {
    this.clock = options.clock ?? systemClock; this.started = this.clock.now()
    this.arm(openRouterPolicy.imageInitialWaitMs); this.emit(); this.tick()
  }
  private arm(ms: number) {
    if (this.deadline !== null) this.clock.cancel(this.deadline)
    this.deadline = this.clock.schedule(() => { this.deadline = null; if (!this.ended) this.options.onTimeout() }, ms)
  }
  private emit(reason: TransportReason | null = null) {
    const age = Math.max(0, Math.floor(this.clock.now() - (this.lastByte ?? this.started)))
    observe(() => this.options.onState?.({ turn: 1, stage: this.ended ? 'ended' : this.lastByte === null ? 'waiting' : 'receiving', bytes: this.bytes, chunks: this.chunks, events: 0, lastByteAgeMs: this.lastByte === null ? null : age, semanticAgeMs: null, waiting: !this.ended && age >= 30_000, reason }))
  }
  private tick() { this.report = this.clock.schedule(() => { if (!this.ended) { this.emit(); this.tick() } }, 1000) }
  received(length: number) {
    if (this.ended || length === 0) return
    this.bytes += length; this.chunks++; this.lastByte = this.clock.now(); this.arm(openRouterPolicy.imageIdleMs); this.emit()
  }
  end(reason: TransportReason) {
    if (this.ended) return
    this.ended = true
    for (const timer of [this.deadline, this.report]) if (timer !== null) this.clock.cancel(timer)
    this.deadline = this.report = null; this.emit(reason)
  }
}
