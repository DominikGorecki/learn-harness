import { observe } from './observe'
export interface MonotonicClock {
  now(): number
  schedule(action: () => void, delayMs: number): unknown
  cancel(handle: unknown): void
}
export const systemClock: MonotonicClock = {
  now: () => performance.now(), schedule: (action, delay) => setTimeout(action, delay),
  cancel: handle => clearTimeout(handle as ReturnType<typeof setTimeout>)
}
export type TransportReason = 'completed' | 'cancelled' | 'network-idle' | 'transport-error' | 'invalid-event' |
  'request-limit' | 'response-limit' | 'provider-error' | 'incomplete' | 'missing-completion'
export interface TransportState {
  turn: number; stage: 'waiting' | 'receiving' | 'ended'; bytes: number; chunks: number; events: number
  lastByteAgeMs: number | null; semanticAgeMs: number | null; waiting: boolean; reason: TransportReason | null
}

/** Network observations only. Tool work and process heartbeats never extend this timer. */
export class PiStreamLiveness {
  private idle: unknown | null = null
  private report: unknown | null = null
  private waitingSince: number
  private lastByte: number | null = null
  private lastSemantic: number | null = null
  private headersSeen = false
  private ended = false
  private bytes = 0
  private chunks = 0
  private events = 0
  constructor(private readonly options: {
    turn: number; clock?: MonotonicClock; idleMs?: number; hintMs?: number
    onIdle(): void; onState?(state: TransportState): void
  }) {
    this.waitingSince = this.clock.now()
    this.arm()
    this.emit()
    this.report = this.clock.schedule(() => this.tick(), 1000)
  }
  private get clock(): MonotonicClock { return this.options.clock ?? systemClock }
  private arm(): void {
    if (this.idle !== null) this.clock.cancel(this.idle)
    this.idle = this.clock.schedule(() => { this.idle = null; if (!this.ended) this.options.onIdle() }, this.options.idleMs ?? 180_000)
  }
  headers(): void {
    if (this.ended || this.headersSeen) return
    this.headersSeen = true; this.waitingSince = this.clock.now(); this.arm()
  }
  received(bytes: number): void {
    if (this.ended || bytes <= 0) return
    this.bytes += bytes; this.chunks++; this.lastByte = this.clock.now(); this.waitingSince = this.lastByte; this.arm()
  }
  event(semantic = false): void {
    if (this.ended) return
    this.events++
    if (semantic) this.lastSemantic = this.clock.now()
  }
  state(reason: TransportReason | null = null): TransportState {
    const now = this.clock.now()
    return { turn: this.options.turn, stage: this.ended ? 'ended' : this.lastByte === null ? 'waiting' : 'receiving',
      bytes: this.bytes, chunks: this.chunks, events: this.events,
      lastByteAgeMs: this.lastByte === null ? null : Math.max(0, Math.floor(now - this.lastByte)),
      semanticAgeMs: this.lastSemantic === null ? null : Math.max(0, Math.floor(now - this.lastSemantic)),
      waiting: !this.ended && now - this.waitingSince >= (this.options.hintMs ?? 30_000), reason }
  }
  private emit(reason: TransportReason | null = null): void {
    observe(() => this.options.onState?.(this.state(reason)))
  }
  private tick(): void {
    this.report = null
    if (this.ended) return
    this.emit(); this.report = this.clock.schedule(() => this.tick(), 1000)
  }
  stop(reason: TransportReason): void {
    if (this.ended) return
    this.ended = true
    if (this.idle !== null) this.clock.cancel(this.idle)
    if (this.report !== null) this.clock.cancel(this.report)
    this.idle = null; this.report = null; this.emit(reason)
  }
}
