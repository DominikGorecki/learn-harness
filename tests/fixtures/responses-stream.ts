import type { ServerResponse } from 'node:http'
let responseNumber = 0

/** A real fragmented tool stream, advanced explicitly by UI interaction assertions. */
export function writeProgressiveToolResponse(response: ServerResponse, args: unknown): () => void {
  response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
  const number = ++responseNumber
  const text = JSON.stringify(args)
  const item = { type: 'function_call', id: `fc_fixture_${number}`, call_id: `call_fixture_${number}`, name: 'submit_outline', namespace: 'learning', arguments: text, status: 'completed' }
  const event = (type: string, data: Record<string, unknown>) => response.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`)
  event('response.created', { response: { id: 'resp_fixture', status: 'in_progress', output: [] } })
  event('response.output_item.added', { output_index: 0, item: { ...item, arguments: '', status: 'in_progress' } })
  const first = Math.min(8_000, Math.floor(text.length / 2))
  event('response.function_call_arguments.delta', { output_index: 0, item_id: item.id, delta: text.slice(0, first) })
  let advanced = false
  return () => {
    if (advanced || response.destroyed) return
    advanced = true
    event('response.function_call_arguments.delta', { output_index: 0, item_id: item.id, delta: text.slice(first) })
    event('response.function_call_arguments.done', { output_index: 0, item_id: item.id, arguments: text })
    event('response.output_item.done', { output_index: 0, item })
    event('response.completed', { response: { id: 'resp_fixture', status: 'completed', output: [item], usage: { input_tokens: 100, output_tokens: 200, total_tokens: 300 } } })
    // EOF stays held: no tool/domain acceptance can occur before completePending().
  }
}

export function writeToolResponse(response: ServerResponse, options: {
  name?: string; args: unknown; terminal?: 'completed' | 'incomplete' | 'failed' | 'missing'; code?: string; namespace?: string; tail?: string; keepOpen?: boolean
}) {
  if (!response.headersSent) response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
  const event = (type: string, data: Record<string, unknown>) => response.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`)
  const number = ++responseNumber
  const item = { type: 'function_call', id: `fc_fixture_${number}`, call_id: `call_fixture_${number}`, name: options.name ?? 'submit_outline',
    namespace: options.namespace ?? 'learning', arguments: JSON.stringify(options.args), status: 'completed' }
  event('response.created', { response: { id: 'resp_fixture', status: 'in_progress', output: [] } })
  event('response.output_item.added', { output_index: 0, item: { ...item, arguments: '', status: 'in_progress' } })
  event('response.function_call_arguments.delta', { output_index: 0, item_id: item.id, delta: item.arguments })
  event('response.function_call_arguments.done', { output_index: 0, item_id: item.id, arguments: item.arguments })
  event('response.output_item.done', { output_index: 0, item })
  const terminal = options.terminal ?? 'completed'
  if (terminal !== 'missing') event(`response.${terminal}`, { response: { id: 'resp_fixture', status: terminal, output: [item],
    usage: { input_tokens: 100, output_tokens: 200, total_tokens: 300 },
    ...(terminal === 'incomplete' ? { incomplete_details: { reason: 'max_output_tokens' } } : {}),
    ...(terminal === 'failed' ? { error: { code: options.code ?? 'subscription_sharing_usage_limit_exceeded', message: 'RAW SECRET PROVIDER ERROR' } } : {}) } })
  if (options.tail) response.write(options.tail)
  if (!options.keepOpen) response.end()
}
