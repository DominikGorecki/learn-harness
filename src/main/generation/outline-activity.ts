import type { AiLease } from '../../core/ai/coordinator'
import type { AiPreview } from '../../shared/ai/activity'
import type { TransportState } from './pi-stream-liveness'
import type { WorkerReply } from './worker-protocol'

/** Main binds scope and orders transport/projection updates on its own lease. */
export function outlineActivity(lease: AiLease, scope: { projectId: string; topicId?: string }) {
  let turn = 0, revision = 0, workerTurn = 0, workerRevision = -1, byteTurn = 0, bytes = 0
  let preview: AiPreview = { kind: 'none' }, abbreviated = false, stage = ''
  const publish = (activity?: Extract<WorkerReply, { type: 'progress' }>['activity']) => lease.progress({
    operationId: lease.operationId, ...scope, turn, revision: ++revision, preview, abbreviated, ...(activity ? { activity } : {})
  })
  return {
    onProgress(frame: Extract<WorkerReply, { type: 'progress' }>): void {
      if (lease.signal.aborted || frame.turn < workerTurn || frame.turn === workerTurn && frame.revision <= workerRevision || frame.turn < turn) return
      workerTurn = frame.turn; workerRevision = frame.revision; turn = frame.turn
      preview = frame.preview; abbreviated = frame.abbreviated === true; publish(frame.activity)
    },
    onTransport(state: TransportState): void {
      if (lease.signal.aborted || state.turn < byteTurn || state.turn < turn) return
      if (state.turn > byteTurn) { byteTurn = state.turn; bytes = 0 }
      const advanced = state.bytes > bytes
      if (advanced) { bytes = state.bytes; if (state.lastByteAgeMs !== null) lease.receivedByteAge(state.lastByteAgeMs) }
      turn = Math.max(turn, state.turn)
      const changed = state.stage !== 'ended' && `${state.turn}:${state.stage}` !== stage
      if (changed) { stage = `${state.turn}:${state.stage}`; lease.phase(state.stage as 'waiting' | 'receiving') }
      // Repeated status/health reports neither replace a draft nor renew byte evidence.
      if (advanced) publish()
    }
  }
}
