import { describe, expect, it, vi } from 'vitest'
import { testModelAccess, solModel, lunaModel } from '../../src/main/auth/model-access-test'
import type { ModelAccessTestDiagnostic } from '../../src/main/auth/model-access-test'

const completed = { type: 'response.completed', response: { status: 'completed', model: 'gpt-6.1-sol',
  output: [{ type: 'message', content: [{ type: 'output_text', text: 'OK' }] }] } }
const event = (value: unknown) => `data: ${JSON.stringify(value)}\r\n\r\n`
function probe(parts: string[], status = 200, onDiagnostic?: (diagnostic: ModelAccessTestDiagnostic) => void, model: typeof solModel | typeof lunaModel = solModel) {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({ start(controller) { for (const part of parts) controller.enqueue(encoder.encode(part)); controller.close() } })
  const request = vi.fn<typeof fetch>(async () => new Response(body, { status }))
  return testModelAccess({ resource: 'https://api.openai.com/v1', accessToken: 'private-token', signal: new AbortController().signal, request, model, onDiagnostic })
}

describe('bounded model verification stream', () => {
  it('verifies Luna against its own identity and rejects a Sol completion for the Luna request', async () => {
    const report = vi.fn()
    await expect(probe([event({ ...completed, response: { ...completed.response, model: 'gpt-6-luna' } })], 200, report, lunaModel)).resolves.toBeUndefined()
    expect(report).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ requestedModel: 'gpt-6-luna', returnedModel: 'gpt-6-luna', outcome: 'verified' }))
    await expect(probe([event(completed)], 200, undefined, lunaModel)).rejects.toMatchObject({ code: 'UNAVAILABLE' })
  })
  it('handles split CRLF frames and comments without accepting partial output as completion', async () => {
    const frame = event(completed)
    await expect(probe([': heartbeat\r\n\r\n', frame.slice(0, 31), frame.slice(31, -1), frame.slice(-1), 'data: [DONE]\r\n\r\n'])).resolves.toBeUndefined()
  })

  it('rejects an error arriving after a completed event and sanitizes its message', async () => {
    await expect(probe([event(completed), event({ type: 'response.failed', response: { error: {
      code: 'subscription_sharing_usage_limit_exceeded', message: 'private-token' } } })])).rejects.toMatchObject({ code: 'USAGE_LIMIT' })
  })

  it('rejects oversize and malformed responses', async () => {
    await expect(probe(['x'.repeat(256 * 1024 + 1)])).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    await expect(probe(['data: invalid-json\n\n'])).rejects.toMatchObject({ code: 'NETWORK' })
  })

  it('does not equate HTTP success or text deltas with completed inference', async () => {
    await expect(probe([event({ type: 'response.output_text.delta', delta: 'OK' })])).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    await expect(probe([event({ ...completed, response: { ...completed.response, output: [] } })])).rejects.toMatchObject({ code: 'UNAVAILABLE' })
  })

  it('verifies streamed reply text when a matching completion omits the final output array', async () => {
    const report = vi.fn()
    await expect(probe([
      event({ type: 'response.output_text.delta', delta: 'OK' }),
      event({ type: 'response.completed', response: { status: 'completed', model: 'gpt-6.1-sol' } })
    ], 200, report)).resolves.toBeUndefined()
    expect(report).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      outcome: 'verified', hasStreamedText: true, hasFinalText: false, completedEvents: 1
    }))
  })

  it.each(['', '  \n', undefined, 7])('does not treat an empty or invalid delta as reply evidence (%s)', async delta => {
    await expect(probe([
      event({ type: 'response.output_text.delta', delta }),
      event({ type: 'response.completed', response: { status: 'completed', model: 'gpt-6.1-sol' } })
    ])).rejects.toMatchObject({ code: 'UNAVAILABLE', message: expect.stringContaining('no reply text') })
  })

  it('still rejects a different model or a late error after receiving streamed text', async () => {
    const delta = event({ type: 'response.output_text.delta', delta: 'OK' })
    await expect(probe([delta, event({ type: 'response.completed', response: { status: 'completed', model: 'gpt-6-astra' } })]))
      .rejects.toMatchObject({ code: 'UNAVAILABLE', message: expect.stringContaining('identified gpt-6-astra') })
    await expect(probe([delta,
      event({ type: 'response.completed', response: { status: 'completed', model: 'gpt-6.1-sol' } }),
      event({ type: 'error', code: 'subscription_sharing_usage_limit_exceeded' })
    ])).rejects.toMatchObject({ code: 'USAGE_LIMIT' })
  })

  it('classifies HTTP model and authentication errors without forwarding raw responses', async () => {
    await expect(probe([JSON.stringify({ error: { code: 'model_not_found', message: 'private-token' } })], 400)).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    await expect(probe([JSON.stringify({ error: 'invalid_token' })], 401)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
  })

  it.each([
    [event({ type: 'response.output_text.delta', delta: 'OK' }), 'missing_completion', 'without a response.completed'],
    [event({ ...completed, response: { ...completed.response, model: 'gpt-6-astra' } }), 'model_mismatch', 'identified gpt-6-astra'],
    [event({ ...completed, response: { ...completed.response, output: [] } }), 'missing_output', 'no reply text'],
    [event({ type: 'response.incomplete', response: { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } } }), 'incomplete_response', 'incomplete response']
  ])('distinguishes unverified responses without adding model access (%s)', async (frame, outcome, message) => {
    const report = vi.fn()
    await expect(probe([frame], 200, report)).rejects.toMatchObject({ code: 'UNAVAILABLE', message: expect.stringContaining(message) })
    expect(report).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ httpStatus: 200, outcome }))
  })

  it('reports bounded protocol metadata without token, output, headers or arbitrary provider strings', async () => {
    const report = vi.fn()
    const privateReply = { ...completed, response: { ...completed.response,
      output: [{ type: 'message', content: [{ type: 'output_text', text: 'private-token secret reply' }] }],
      headers: { authorization: 'private-token' }, unexpected: 'private-token' } }
    await probe([event({ type: 'response.output_text.delta', delta: 'private-token' }), event(privateReply)], 200, report)
    expect(report).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      requestedModel: 'gpt-6.1-sol', returnedModel: 'gpt-6.1-sol', responseStatus: 'completed',
      events: 2, textDeltaEvents: 1, completedEvents: 1, outcome: 'verified', elapsedMs: expect.any(Number)
    }))
    expect(JSON.stringify(report.mock.calls)).not.toMatch(/private-token|secret reply|authorization|unexpected/)

    const rejected = vi.fn()
    await expect(probe([event({ type: 'response.failed', response: { model: 'private-token', status: 'private-token',
      error: { code: 'private-token', message: 'private-token' } } })], 200, rejected)).rejects.toMatchObject({ code: 'NETWORK' })
    expect(rejected).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      returnedModel: 'unrecognized', responseStatus: 'unrecognized', providerCode: 'unrecognized', outcome: 'stream_error'
    }))
    expect(JSON.stringify(rejected.mock.calls)).not.toContain('private-token')
  })

  it('records an explicit HTTP access rejection separately from incomplete verification', async () => {
    const report = vi.fn()
    await expect(probe([JSON.stringify({ error: { code: 'model_not_found', message: 'private-token' } })], 400, report))
      .rejects.toMatchObject({ message: expect.stringContaining('HTTP 400') })
    expect(report).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ httpStatus: 400, providerCode: 'model_not_found', outcome: 'http_error' }))
    expect(JSON.stringify(report.mock.calls)).not.toContain('private-token')
  })

  it('keeps successful verification when a diagnostic sink fails', async () => {
    await expect(probe([event(completed)], 200, () => { throw new Error('logger failed') })).resolves.toBeUndefined()
  })
})
