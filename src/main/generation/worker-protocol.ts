import type { OutlineEngineInput, OutlineEngineResult, EnginePhase } from './pi-outline-engine'
import type { ErrorCode } from '../../shared/contracts'

export type EngineDiagnosticEvent = 'engine.materials' | 'engine.request' | 'engine.response' | 'engine.terminal' | 'engine.tool' | 'engine.turn'
export type WorkerDiagnosticEvent = EngineDiagnosticEvent | 'console.output' | 'process.unhandled'

export type WorkerRequest = { type: 'start'; input: OutlineEngineInput } | { type: 'cancel' }
export type WorkerReply = { type: 'phase'; phase: EnginePhase } | { type: 'result'; result: OutlineEngineResult } |
  { type: 'error'; code: ErrorCode; message: string } | { type: 'diagnostic'; event: WorkerDiagnosticEvent; data: unknown }
