import type { ServerResponse } from 'node:http'

/** Genuine incomplete function arguments, with independent byte heartbeats and real EOF. */
export function controlledOutlineStream(response: ServerResponse, args: { title: string; overview: string }, durationMs?: number) {
  const text = JSON.stringify(args)
  const item = { type: 'function_call', id: 'fc_controlled', call_id: 'call_controlled', name: 'submit_outline', namespace: 'learning', arguments: text, status: 'completed' }
  let bytes = 0, offset = 0, begun = false, completedAt: number | null = null
  const write = (value: string) => { if (!response.destroyed) { bytes += Buffer.byteLength(value); response.write(value) } }
  const event = (type: string, data: Record<string, unknown>) => write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`)
  response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
  const firstByteAt = Date.now()
  write(': receiving\n\n')
  const heartbeat = setInterval(() => write(': receiving\n\n'), 5_000)
  let terminal: ReturnType<typeof setTimeout> | undefined
  const begin = () => {
    if (begun) return
    begun = true
    event('response.created', { response: { id: 'resp_controlled', status: 'in_progress', output: [] } })
    event('response.output_item.added', { output_index: 0, item: { ...item, arguments: '', status: 'in_progress' } })
    offset = text.indexOf('"overview":') + '"overview":"'.length + 24
    event('response.function_call_arguments.delta', { output_index: 0, item_id: item.id, delta: text.slice(0, offset) })
  }
  const burst = (marker: string) => {
    begin()
    const end = text.indexOf(marker) + marker.length
    if (end < marker.length || end <= offset) throw new Error('Fixture marker must follow the current argument fragment')
    // Separate real SSE deltas exercise SDK projection and both coalescers.
    let markerAt = Date.now()
    while (offset < end) {
      if (offset === end - 1) markerAt = Date.now()
      event('response.function_call_arguments.delta', { output_index: 0, item_id: item.id, delta: text.slice(offset, ++offset) })
    }
    return markerAt
  }
  const finish = () => {
    if (completedAt !== null || response.destroyed) return
    begin()
    event('response.function_call_arguments.delta', { output_index: 0, item_id: item.id, delta: text.slice(offset) })
    event('response.function_call_arguments.done', { output_index: 0, item_id: item.id, arguments: text })
    event('response.output_item.done', { output_index: 0, item })
    event('response.completed', { response: { id: 'resp_controlled', status: 'completed', output: [item], usage: { input_tokens: 100, output_tokens: 200, total_tokens: 300 } } })
    completedAt = Date.now(); response.end(); clearInterval(heartbeat)
    if (terminal) clearTimeout(terminal)
  }
  if (durationMs !== undefined) terminal = setTimeout(finish, durationMs)
  response.once('close', () => { clearInterval(heartbeat); if (terminal) clearTimeout(terminal) })
  return { firstByteAt, begin, burst, finish, bytes: () => bytes, completedAt: () => completedAt }
}
