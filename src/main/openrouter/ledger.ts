import { mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { ApplicationError } from '../../shared/contracts'
import { parseListOpenRouterCalls, parseOpenRouterCall, parseOpenRouterCallIntent, parseOpenRouterCallPage, parseOpenRouterCallTransition, openRouterPolicy } from '../../shared/openrouter'
import type { OpenRouterCall, OpenRouterCallIntent, OpenRouterCallTransition, ListOpenRouterCallsRequest, OpenRouterSpend } from '../../shared/openrouter'
import { identifier } from '../../shared/validation'
import { appendPrivate, privateDirectory, readPrivate, storageError } from './private-files'
import { addMoney } from './money'
import { ledgerDisplayLabel, ledgerPriceVariant } from './safe-projection'

export function createOpenRouterLedger(directory: string, options: { now?: () => string; append?: typeof appendPrivate } = {}) {
  const now = options.now ?? (() => new Date().toISOString()), append = options.append ?? appendPrivate
  const calls = new Map<string, OpenRouterCall>(); let healthy = true, initialized = false, queue: Promise<unknown> = Promise.resolve()
  const serial = <T>(action: () => Promise<T>): Promise<T> => { const result = queue.then(action, action); queue = result.catch(() => {}); return result }
  function validateTransition(call: OpenRouterCall, value: OpenRouterCallTransition): OpenRouterCallTransition {
    const next = parseOpenRouterCallTransition(value), previous = call.latest
    if (next.callId !== call.intent.id || next.sequence !== (previous?.sequence ?? 0) + 1 || previous && Date.parse(next.recordedAt) < Date.parse(previous.recordedAt) || Date.parse(next.recordedAt) < Date.parse(call.intent.startedAt)) throw storageError()
    if (previous?.cost.kind === 'known' && next.cost.kind === 'unknown' || previous?.generationId && next.generationId !== previous.generationId || previous?.returnedModelId && next.returnedModelId !== previous.returnedModelId) throw new ApplicationError('CONFLICT', 'Call correlation or known billing evidence cannot be discarded.')
    parseOpenRouterCall({ intent: call.intent, latest: next })
    return next
  }
  async function transition(call: OpenRouterCall, value: OpenRouterCallTransition): Promise<void> {
    const next = validateTransition(call, value)
    try { await append(join(directory, call.intent.id, `transition-${next.sequence.toString().padStart(10, '0')}.json`), next, openRouterPolicy.ledgerFrameBytes) }
    catch { healthy = false; throw storageError() }
    call.latest = next
  }
  return {
    get healthy() { return healthy && initialized },
    async initialize(): Promise<void> {
      return serial(async () => {
        calls.clear(); healthy = true; await privateDirectory(directory)
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          try {
            if (!entry.isDirectory() || entry.isSymbolicLink()) throw storageError()
            const id = identifier(entry.name), folder = join(directory, id); await privateDirectory(folder, false)
            const raw = await readPrivate(join(folder, 'intent.json'), openRouterPolicy.ledgerFrameBytes); if (!raw) throw storageError()
            const intent = parseOpenRouterCallIntent(JSON.parse(raw)); if (intent.id !== id) throw storageError()
            const call: OpenRouterCall = { intent, latest: null }; calls.set(id, call)
            const entries = (await readdir(folder)).filter(name => name !== 'intent.json').sort()
            for (const name of entries) {
              if (!/^transition-[0-9]{10}\.json$/.test(name)) throw storageError()
              const text = await readPrivate(join(folder, name), openRouterPolicy.ledgerFrameBytes); if (!text) throw storageError()
              const next = parseOpenRouterCallTransition(JSON.parse(text))
              if (next.callId !== id || next.sequence !== (call.latest?.sequence ?? 0) + 1 || name !== `transition-${next.sequence.toString().padStart(10, '0')}.json`) throw storageError()
              call.latest = validateTransition(call, next)
            }
            if (!call.latest || call.latest.status === 'intended') await transition(call, { schemaVersion: 1, callId: id, sequence: (call.latest?.sequence ?? 0) + 1, recordedAt: now(), status: 'interrupted', httpStatus: call.latest?.httpStatus ?? null, errorCode: null, generationId: call.latest?.generationId ?? null, returnedModelId: call.latest?.returnedModelId ?? null, cost: call.latest?.cost ?? { kind: 'unknown' }, disposition: call.latest?.disposition ?? 'none' })
          } catch { healthy = false }
        }
        initialized = true
      })
    },
    intent(value: OpenRouterCallIntent): Promise<OpenRouterCall> {
      return serial(async () => {
        const intent = parseOpenRouterCallIntent({ ...value,
          context: value.context && { ...value.context, projectName: ledgerDisplayLabel(value.context.projectName, 'Learning project'), topicTitle: ledgerDisplayLabel(value.context.topicTitle, 'Topic') },
          ...(value.pricing && { pricing: { ...value.pricing, endpoints: value.pricing.endpoints.map(endpoint => ({ ...endpoint, lines: endpoint.lines.map(line => ({ ...line, variant: ledgerPriceVariant(line.variant) })) })) } })
        })
        if (!initialized || intent.endpoint === 'images' && !healthy) throw storageError()
        if (calls.has(intent.id)) throw new ApplicationError('CONFLICT', 'This request intent already exists; it cannot authorize replay.')
        try { const folder = join(directory, intent.id); await privateDirectory(directory); await mkdir(folder, { mode: 0o700 }); await privateDirectory(folder, false); await append(join(folder, 'intent.json'), intent, openRouterPolicy.ledgerFrameBytes) }
        catch { healthy = false; throw storageError() }
        const call: OpenRouterCall = { intent, latest: null }; calls.set(intent.id, call); return structuredClone(call)
      })
    },
    transition(callId: string, value: Omit<OpenRouterCallTransition, 'schemaVersion' | 'callId' | 'sequence'>): Promise<void> {
      return serial(async () => { const call = calls.get(identifier(callId)); if (!call) throw new ApplicationError('NOT_FOUND', 'This request is not in app history.'); await transition(call, { ...value, schemaVersion: 1, callId, sequence: (call.latest?.sequence ?? 0) + 1 }) })
    },
    get(callId: string): OpenRouterCall { const call = calls.get(identifier(callId)); if (!call) throw new ApplicationError('NOT_FOUND', 'This request is not in app history.'); return structuredClone(call) },
    list(value: ListOpenRouterCallsRequest) {
      const request = parseListOpenRouterCalls(value), ordered = [...calls.values()].sort((a, b) => Date.parse(b.intent.startedAt) - Date.parse(a.intent.startedAt) || b.intent.id.localeCompare(a.intent.id))
      const filtered = ordered.filter(call => (!request.from || Date.parse(call.intent.startedAt) >= Date.parse(request.from)) && (!request.to || Date.parse(call.intent.startedAt) <= Date.parse(request.to)) && (!request.purpose || call.intent.purpose === request.purpose) && (!request.modelId || call.intent.modelId === request.modelId) && (!request.status || (call.latest?.status ?? 'intended') === request.status))
      const offset = request.cursor ? filtered.findIndex(call => call.intent.id === request.cursor) + 1 : 0
      if (request.cursor && offset === 0) throw new ApplicationError('CONFLICT', 'This history cursor no longer matches its filters.')
      const page: { calls: OpenRouterCall[]; nextCursor: string | null } = { calls: [], nextCursor: null }
      for (const call of filtered.slice(offset, offset + request.limit)) {
        const candidate = { calls: [...page.calls, call], nextCursor: call.intent.id }
        if (Buffer.byteLength(JSON.stringify(candidate)) > openRouterPolicy.ledgerFrameBytes) break
        page.calls.push(call)
      }
      if (offset + page.calls.length < filtered.length) page.nextCursor = page.calls.at(-1)?.intent.id ?? null
      return structuredClone(parseOpenRouterCallPage(page))
    },
    spend(): OpenRouterSpend {
      const date = new Date(now()).toISOString().slice(0, 10), month = date.slice(0, 7), all: string[] = [], today: string[] = [], monthly: string[] = []; let unresolvedCount = 0
      for (const call of calls.values()) { if (call.latest?.cost.kind !== 'known') { unresolvedCount++; continue }; const usd = call.latest.cost.usd, started = new Date(call.intent.startedAt).toISOString(); all.push(usd); if (started.startsWith(month)) monthly.push(usd); if (started.startsWith(date)) today.push(usd) }
      return { allTimeUsd: addMoney(all), todayUsd: addMoney(today), monthUsd: addMoney(monthly), unresolvedCount }
    },
    async drain(): Promise<void> { await queue }
  }
}
export type OpenRouterLedger = ReturnType<typeof createOpenRouterLedger>
