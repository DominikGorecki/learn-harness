import { Agent } from '@earendil-works/pi-agent-core'
import type { Model } from '@earendil-works/pi-ai'
import { stream } from '@earendil-works/pi-ai/api/openai-responses'
import { ApplicationError } from '../../shared/contracts'
import { parseOutline } from '../../shared/outline'
import type { OutlineEngineResult, EnginePhase } from '../../shared/generation'
export type { OutlineEngineResult, EnginePhase } from '../../shared/generation'
import type { ModelChoice } from '../../shared/account'
import { boundedText } from '../../shared/validation'
import { providerFailure } from '../auth/provider-errors'
import { outlineSchema, clarificationSchema } from './outline-schema'
import { learningPrompt } from './learning-prompt'

export interface OutlineEngineInput {
  model: ModelChoice; accessToken: string; baseUrl: string; brief: string
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function boundedResponse(response: Response, maximumBytes: number): Response {
  if (!response.body) return response
  let bytes = 0
  const body = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytes += chunk.byteLength
      if (bytes > maximumBytes) { controller.error(new Error('Provider response exceeded its size limit')); return }
      controller.enqueue(chunk)
    }
  }))
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers })
}

/** Whitelist the plan route payload, rather than inherit arbitrary provider defaults. */
export function planPayload(value: unknown): unknown {
  const data = record(value)
  return { model: data.model, stream: true, store: false,
    input: Array.isArray(data.input) ? data.input.map(value => {
      const item = record(value)
      return item.role === 'system' ? { ...item, role: 'developer' } : item
    }) : [],
    ...(Array.isArray(data.tools) && data.tools.length ? { tools: [{ type: 'namespace', name: 'learning',
      description: 'Build a learning outline or ask for essential learning context.', tools: data.tools }] } : {}) }
}

export async function generateWithPi(input: OutlineEngineInput, options: {
  signal: AbortSignal; onPhase(phase: EnginePhase): void; maximumTurns?: number; timeoutMs?: number
}): Promise<OutlineEngineResult> {
  if (!input.accessToken || input.accessToken.startsWith('sk-')) throw new ApplicationError('AUTH_REQUIRED', 'Connect a ChatGPT plan to create an outline.')
  const endpoint = new URL(`${input.baseUrl.replace(/\/$/, '')}/responses`)
  const permitted = endpoint.origin === 'https://api.openai.com' || (endpoint.protocol === 'http:' && endpoint.hostname === '127.0.0.1' && Boolean(endpoint.port))
  if (!permitted || endpoint.pathname !== '/v1/responses' || endpoint.search || endpoint.hash || endpoint.username || endpoint.password) throw new ApplicationError('FORBIDDEN', 'The inference destination is unavailable.')
  const timeout = AbortSignal.timeout(options.timeoutMs ?? 180_000)
  const signal = AbortSignal.any([options.signal, timeout])
  if (options.signal.aborted) throw new ApplicationError('CANCELLED', 'Outline creation cancelled. Your previous work is unchanged.')
  let outcome: OutlineEngineResult | null = null
  let failure: ApplicationError | null = null
  let completed = false
  let turns = 0
  const model: Model<'openai-responses'> = {
    id: input.model.id, name: input.model.name, provider: 'openai', api: 'openai-responses', baseUrl: input.baseUrl,
    reasoning: false, input: ['text'], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    // Internal budgeting defaults, never advertised as account model capabilities.
    contextWindow: 128_000, maxTokens: 16_000, compat: { supportsDeveloperRole: true, supportsMaxOutputTokens: false }
  }
  const agent = new Agent({
    initialState: { model, systemPrompt: learningPrompt, thinkingLevel: 'off', tools: [
      { name: 'submit_outline', label: 'Complete learning outline', description: 'Submit every project, lesson, and module field in a complete learning outline.',
        parameters: outlineSchema, execute: async (_id, value) => {
          signal.throwIfAborted()
          options.onPhase('validating')
          if (JSON.stringify(value).length > 1_500_000) throw new Error('The outline is too large. Keep it focused.')
          const document = parseOutline(value)
          if (document.lessons.some(lesson => lesson.sources.length)) throw new Error('No project material was read in this request. Use empty source lists.')
          outcome = { kind: 'outline', document }
          return { content: [{ type: 'text', text: 'Complete outline accepted.' }], details: undefined, terminate: true }
        } },
      { name: 'request_learning_details', label: 'Clarify learning direction', description: 'Ask one essential question only if no coherent subject can be determined.',
        parameters: clarificationSchema, execute: async (_id, value) => {
          signal.throwIfAborted()
          const details = record(value)
          outcome = { kind: 'needs-details', question: boundedText(details.question, 'Question', 2000), reason: boundedText(details.reason, 'Reason', 2000) }
          return { content: [{ type: 'text', text: 'The learner will provide details.' }], details: undefined, terminate: true }
        } }
    ] },
    toolExecution: 'sequential',
    beforeToolCall: async ({ toolCall }) => {
      if (!completed || failure || outcome || (toolCall.namespace !== undefined && toolCall.namespace !== 'learning')) {
        return { block: true, reason: 'Only a completed response in the learning namespace can submit one result.', terminate: true }
      }
      return undefined
    },
    streamFn: (_model, context, streamOptions) => {
      completed = false
      options.onPhase('planning')
      return stream(model, context, { ...streamOptions, apiKey: input.accessToken, signal, cacheRetention: 'none',
        timeoutMs: options.timeoutMs ?? 180_000, maxRetries: 0, onPayload: planPayload,
        fetch: async (url, init) => {
          if (String(url) !== endpoint.href) throw new Error('Unexpected provider destination')
          if (typeof init?.body !== 'string' || Buffer.byteLength(init.body) > 4 * 1024 * 1024) throw new Error('Provider request exceeded its size limit')
          const response = await fetch(url, { ...init, redirect: 'error' })
          if (!response.ok) {
            let code: string | undefined
            try {
              const body = record(await boundedResponse(response, 64 * 1024).json())
              const error = record(body.error)
              code = typeof error.code === 'string' ? error.code : undefined
            } catch { /* The status still provides a safe recovery classification. */ }
            failure = providerFailure(response.status, code)
            // Do not forward raw provider messages, which may echo input or credentials.
            return new Response(JSON.stringify({ error: { message: 'Provider request failed.' } }), { status: response.status, headers: { 'content-type': 'application/json' } })
          }
          return boundedResponse(response, 8 * 1024 * 1024)
        },
        onProviderStreamEvent: value => {
          const event = record(value)
          if (event.type === 'response.completed') completed = record(event.response).status === 'completed'
          if (event.type === 'response.failed' || event.type === 'error') {
            const error = event.type === 'error' ? event : record(record(event.response).error)
            failure = providerFailure(0, typeof error.code === 'string' ? error.code : undefined)
          }
          if (event.type === 'response.incomplete') failure = new ApplicationError('UNAVAILABLE', 'The outline was incomplete. Your previous work is unchanged; try again.')
        }
      })
    },
    finishTurn: () => {
      turns++
      return { action: outcome || failure || !completed || turns >= (options.maximumTurns ?? 6) ? 'end' : 'continue' }
    }
  })
  const abort = () => agent.abort()
  signal.addEventListener('abort', abort, { once: true })
  try {
    await agent.prompt(`Learning intent (learner-provided data):\n${input.brief}\n\nNo project files have been read for this request.`)
    if (options.signal.aborted) throw new ApplicationError('CANCELLED', 'Outline creation cancelled. Your previous work is unchanged.')
    if (timeout.aborted) throw new ApplicationError('NETWORK', 'Outline creation took too long. Your previous work is unchanged; try again.')
    if (failure) throw failure
    if (!outcome || !completed || agent.state.errorMessage) throw new ApplicationError('UNAVAILABLE', 'A complete outline was not returned. Your previous work is unchanged; try again.')
    return outcome
  } catch (error) {
    if (error instanceof ApplicationError) throw error
    throw new ApplicationError('NETWORK', 'Outline creation could not finish. Your previous work is unchanged; try again.')
  } finally { signal.removeEventListener('abort', abort); agent.abort(); await agent.waitForIdle() }
}
