import type { AiLease } from '../../core/ai/coordinator'
import type { AdditionalModelId } from '../../shared/account'
import type { PiProtocolEvidence } from './pi-protocol-evidence'
import type { TransportState } from './pi-stream-liveness'
import { modelMatches } from '../auth/model-access-test'

/** Main projects private proof into fixed booleans only; diagnostics have no project scope. */
export function modelTestActivity(lease: AiLease, target: AdditionalModelId) {
  let revision = 0, bytes = 0
  let preview = { kind: 'model-test-evidence' as const, hasReply: false, completed: false, modelMatched: false }
  const publish = () => lease.progress({ operationId: lease.operationId, turn: 1, revision: ++revision, preview })
  publish()
  return {
    onTransport(state: TransportState): void {
      if (lease.signal.aborted) return
      if (state.bytes > bytes) { bytes = state.bytes; if (state.lastByteAgeMs !== null) lease.receivedByteAge(state.lastByteAgeMs) }
      if (state.stage !== 'ended') lease.phase(state.stage, { id: 'diagnostic-response', label: state.stage === 'waiting' ? 'Waiting for the model response' : 'Receiving the model response', state: 'running' })
    },
    onEvidence(evidence: PiProtocolEvidence): void {
      if (lease.signal.aborted) return
      preview = { kind: 'model-test-evidence', hasReply: evidence.hasStreamedText || evidence.hasFinalText,
        completed: evidence.cleanEof && evidence.responseStatus === 'completed', modelMatched: modelMatches(target, evidence.returnedModel) }
      publish()
      if (evidence.cleanEof) {
        lease.phase('validating', { id: 'diagnostic-response', label: 'Model response received through clean EOF', state: 'completed' })
        lease.phase('validating', { id: 'diagnostic-proof', label: 'Checking completed model access evidence', state: 'running' })
      }
    },
    onVerified(): void {
      lease.phase('validating', { id: 'diagnostic-proof', label: 'Completed model access evidence checked', state: 'completed' })
    }
  }
}
