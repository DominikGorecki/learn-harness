import type { Model } from '@earendil-works/pi-ai'
import { ApplicationError } from '../../shared/contracts'
import type { ModelAccessWorkerInput } from './worker-protocol'
import { streamPiTurn } from './pi-transport'
import type { PiProtocolEvidence } from './pi-protocol-evidence'
import type { MonotonicClock, TransportState } from './pi-stream-liveness'

/** Transport proof only. AccountService owns target matching, text proof and session verification. */
export async function runModelAccessProfile(input: ModelAccessWorkerInput, options: {
  signal: AbortSignal; onTransport?(state: TransportState): void; onEvidence?(evidence: PiProtocolEvidence): void
  clock?: MonotonicClock; idleMs?: number; request?: typeof fetch
}): Promise<PiProtocolEvidence> {
  const model: Model<'openai-responses'> = { id: input.target, name: input.target, api: 'openai-responses', provider: 'openai', baseUrl: input.baseUrl,
    reasoning: false, input: ['text'], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128_000, maxTokens: 16_000,
    compat: { supportsMaxOutputTokens: false, supportsDeveloperRole: true } }
  const turn = streamPiTurn(model, { messages: [{ role: 'user', content: 'Reply with exactly OK.', timestamp: 0 }] },
    { ...options, accessToken: input.accessToken, turn: 1, maximumResponseBytes: 256 * 1024 })
  for await (const event of turn.stream) { if (event.type === 'error') break }
  const evidence = await turn.evidence
  if (turn.failure) throw turn.failure
  if (!turn.accepted || !evidence?.cleanEof) throw new ApplicationError('UNAVAILABLE', 'The model response could not be checked. Try again.')
  return evidence
}
