import { expect, it } from 'vitest'
import { AiCoordinator } from '../../src/core/ai/coordinator'
import { modelTestActivity } from '../../src/main/generation/model-test-activity'
import type { PiProtocolEvidence } from '../../src/main/generation/pi-protocol-evidence'

it('publishes boolean diagnostic evidence and completes both activities only after independent proof', () => {
  const ai = new AiCoordinator({ now: () => 1_000, createId: () => 'diagnostic-1' })
  const { lease } = ai.claim({ kind: 'test-sol', model: { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol' }, heading: 'Testing', requestSummary: 'Short reply' })
  const activity = modelTestActivity(lease, 'gpt-6.1-sol')
  activity.onTransport({ turn: 1, stage: 'receiving', bytes: 20, chunks: 1, events: 1, lastByteAgeMs: 5, semanticAgeMs: 0, waiting: false, reason: null })
  const evidence: PiProtocolEvidence = { httpStatus: 200, contentType: 'sse', bytes: 20, events: 1, textDeltaEvents: 1,
    completedEvents: 1, hasStreamedText: true, hasFinalText: false, terminalEvent: 'response.completed', returnedModel: 'gpt-6.1-sol',
    responseStatus: 'completed', providerCode: null, incompleteReason: null, cleanEof: false }
  activity.onEvidence(evidence)
  expect(ai.get().active?.preview).toMatchObject({ completed: false })
  expect(ai.get().active?.activity).toContainEqual(expect.objectContaining({ id: 'diagnostic-response', state: 'running' }))
  activity.onEvidence({ ...evidence, cleanEof: true })
  expect(ai.get().active?.activity).toContainEqual(expect.objectContaining({ id: 'diagnostic-response', state: 'completed' }))
  expect(ai.get().active?.activity).toContainEqual(expect.objectContaining({ id: 'diagnostic-proof', state: 'running' }))
  activity.onVerified(); lease.settle('verified')
  expect(ai.get().settled?.activity.every(entry => entry.state === 'completed')).toBe(true)
  expect(ai.get().settled?.preview).toEqual({ kind: 'model-test-evidence', hasReply: true, completed: true, modelMatched: true })
  expect(ai.get().settled).not.toHaveProperty('projectId')
  expect(JSON.stringify(ai.get())).not.toMatch(/returnedModel|httpStatus|hasStreamedText/)
})
