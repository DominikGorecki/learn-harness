import { readFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createOpenRouterGateway, openRouterBaseUrl } from '../../src/main/openrouter/gateway'
import { createOpenRouterLedger } from '../../src/main/openrouter/ledger'
import { createOpenRouterService } from '../../src/main/openrouter/service'
import { createOpenRouterSettingsStore } from '../../src/main/openrouter/settings-store'
import { projectEndpoints, selectImageRoute } from '../../src/main/openrouter/metadata'
import { parseProviderJson } from '../../src/main/openrouter/money'
import { openRouterImageModels, openRouterPolicy, parseOpenRouterCallIntent } from '../../src/shared/openrouter'
import { ApplicationError } from '../../src/shared/contracts'
import type { OpenRouterService } from '../../src/main/openrouter/service'
import { routerFixture, routerAt, routerCatalog, routerCipher, routerEndpoint, routerKey, imageRequest } from '../fixtures/openrouter'
const roots: string[] = [], services: OpenRouterService[] = []
afterEach(async () => { await Promise.all(services.splice(0).map(service => service.dispose())); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
const setup = async (fetcher?: typeof fetch) => { const fixture = await routerFixture(root => roots.push(root), fetcher); services.push(fixture.service); return fixture }
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done }); return { promise, resolve } }
describe('audited fixed OpenRouter gateway', () => {
  it('quotes recorded chapter settings independently from a changed selected model default without new HTTP', async () => {
    let requests = 0
    const { service } = await setup(async input => {
      requests++
      const url = String(input), id = openRouterImageModels.find(model => url.includes(model.id))?.id
      const endpoint = routerEndpoint(id)
      if (id === 'google/gemini-3.1-flash-image') endpoint.endpoints[0]!.supported_parameters.aspect_ratio.values = ['3:2']
      return new Response(JSON.stringify(url.endsWith('/key') ? routerKey : url.endsWith('/images/models') ? routerCatalog : endpoint))
    })
    await service.saveKey({ key: 'ordinary-fixture-key' })
    expect(service.getImageConfiguration(2, { n: 1, aspectRatio: '1:1' }).available).toBe(true)
    await service.setImageModel({ modelId: 'google/gemini-3.1-flash-image' })
    const before = requests
    expect(service.getImageConfiguration(6)).toMatchObject({ settings: { n: 1, aspectRatio: '3:2' }, available: true })
    expect(service.getImageConfiguration(2, { n: 1, aspectRatio: '1:1' })).toMatchObject({ settings: { n: 1, aspectRatio: '1:1' }, available: false, estimate: { kind: 'unknown' } })
    expect(requests).toBe(before)
  })
  it('persists every real loopback metadata HTTP request before dispatch, excludes management keys and retains history on removal', async () => {
    const fixture = await setup(), { root, store, ledger } = fixture
    const requests: string[] = []
    const server = createServer(async (request, response) => {
      requests.push(request.url!); expect(ledger.list({ limit: 100 }).calls.some(call => call.latest === null)).toBe(true)
      const value = request.url === '/api/v1/key' ? routerKey : request.url === '/api/v1/images/models' ? routerCatalog : routerEndpoint(openRouterImageModels.find(model => request.url!.includes(model.id))!.id)
      response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(value))
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); const address = server.address() as { port: number }
    const gateway = createOpenRouterGateway(ledger, { now: fixture.now, createId: fixture.createId, fixture: { baseUrl: `http://127.0.0.1:${address.port}/api/v1`, isPackaged: false, isolatedProfile: true } })
    const service = createOpenRouterService({ store, ledger, gateway, now: fixture.now, createId: fixture.createId }); services.push(service)
    try {
      await service.saveKey({ key: 'secret-ordinary-key' })
      expect(requests).toHaveLength(6); expect(requests.every(path => !path.includes('images?') && !path.endsWith('/images'))).toBe(true)
      expect(service.getSettings()).toMatchObject({ connection: 'connected', metadataStale: false, spend: { allTimeUsd: '0', unresolvedCount: 0 } })
      expect(service.getSettings().keyUsage?.usageUsd).toBe('0.123456789123456789')
      expect(JSON.stringify(service.getSettings())).not.toContain('secret-ordinary-key'); expect(JSON.stringify(service.getSettings())).not.toContain('sk-or-private-label')
      const history = JSON.stringify(service.listCalls({ limit: 100 })); for (const forbidden of ['secret-ordinary-key', 'sk-or-private-label', '127.0.0.1', 'Authorization', 'hostile.test']) expect(history).not.toContain(forbidden)
      await service.removeKey(); expect(service.listCalls({ limit: 100 }).calls).toHaveLength(6)
      const restarted = createOpenRouterService({ store: createOpenRouterSettingsStore(join(root, 'connection'), routerCipher), ledger, gateway, now: fixture.now, createId: fixture.createId }); services.push(restarted); await restarted.initialize()
      expect(restarted.getSettings().connection).toBe('absent'); expect(requests).toHaveLength(6)
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
  })
  it('rejects nonprivate fixture URLs, invalid endpoint models and generation IDs before HTTP', async () => {
    for (const fixture of [{ baseUrl: 'https://evil.test/api/v1', isPackaged: false, isolatedProfile: true }, { baseUrl: 'http://127.0.0.1:42/api/v1', isPackaged: true, isolatedProfile: true }, { baseUrl: 'http://127.0.0.1:42/api/v1', isPackaged: false, isolatedProfile: false }]) expect(() => openRouterBaseUrl(fixture)).toThrow()
    const { gateway, requests } = await setup()
    await expect(gateway.request({ key: 'key', epoch: 'epoch' }, { endpoint: 'generation', purpose: 'cost-reconciliation', generationId: 'local-id' })).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    expect(requests).toHaveLength(0)
  })
  it('ignores ambient credentials and quotes only cached validated settings without admission or HTTP', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'ambient-key')
    try {
      const { service, requests } = await setup()
      expect(service.getSettings().connection).toBe('absent'); expect(service.getImageConfiguration().available).toBe(false); expect(requests).toHaveLength(0)
      await service.saveKey({ key: 'explicit-key' }); const count = requests.length
      expect(service.getImageConfiguration(3)).toMatchObject({ modelId: 'openai/gpt-image-2', settings: { n: 1, aspectRatio: '1:1' }, estimate: { kind: 'fixed', minimumUsd: '0.135' }, available: true })
      expect(requests).toHaveLength(count); const lease = service.acquireImageLease(); lease.release()
    } finally { vi.unstubAllEnvs() }
  })
  it.each([401, 403, 402, 429, 500])('records failed HTTP %s with safe status and non-inference zero', async status => {
    const { service, ledger, store } = await setup(async () => new Response('{"error":{"message":"secret provider payload"}}', { status }))
    await expect(service.saveKey({ key: 'candidate-key' })).rejects.toBeInstanceOf(ApplicationError)
    expect(await store.readKey()).toBeNull(); const call = ledger.list({ limit: 10 }).calls[0]!
    expect(call.latest).toMatchObject({ status: 'failed', httpStatus: status, cost: { kind: 'known', usd: '0' } }); expect(JSON.stringify(call)).not.toContain('secret provider payload'); expect(call.intent.connectionEpoch).not.toBe('candidate-key')
  })
  it('rejects redirects, oversized bytes and invalid metadata without storing raw response bodies', async () => {
    for (const response of [new Response(null, { status: 302, headers: { location: 'https://evil.test' } }), new Response('x'.repeat(openRouterPolicy.metadataBytes + 1)), new Response('{"usage":1e-19}')]) {
      const fixture = await setup(async () => response)
      await expect(fixture.service.saveKey({ key: 'key' })).rejects.toBeInstanceOf(ApplicationError)
      expect(fixture.ledger.list({ limit: 10 }).calls[0]!.latest?.status).toBe('failed')
    }
  })
  it('does not send HTTP after intent failure and leaves terminal-fault dispatch unresolved', async () => {
    const { root } = await setup(), fetcher = vi.fn(async () => new Response(JSON.stringify(routerKey)))
    for (const phase of ['intent', 'terminal']) {
      const ledger = createOpenRouterLedger(join(root, phase), { now: () => routerAt }); await ledger.initialize()
      if (phase === 'intent') vi.spyOn(ledger, 'intent').mockRejectedValue(new ApplicationError('STORAGE', 'Storage unavailable'))
      else vi.spyOn(ledger, 'transition').mockRejectedValue(new ApplicationError('STORAGE', 'Storage unavailable'))
      const gateway = createOpenRouterGateway(ledger, { fetch: fetcher, now: () => routerAt }); await expect(gateway.request({ key: 'key', epoch: 'epoch' }, { endpoint: 'key', purpose: 'key-validation' })).rejects.toMatchObject({ code: 'STORAGE' }); await gateway.dispose()
      expect(fetcher.mock.calls).toHaveLength(phase === 'intent' ? 0 : 1)
      if (phase === 'terminal') expect(ledger.list({ limit: 10 }).calls[0]!.latest).toBeNull()
    }
  })
  it('distinguishes a metadata timeout from explicit shutdown cancellation and awaits accounting', async () => {
    const { ledger } = await setup(), fetcher: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => { init!.signal!.addEventListener('abort', () => reject(new Error('Aborted')), { once: true }) })
    const timeout = createOpenRouterGateway(ledger, { fetch: fetcher, timeoutMs: 10, now: () => routerAt }); await expect(timeout.request({ key: 'key', epoch: 'epoch' }, { endpoint: 'key', purpose: 'key-usage' })).rejects.toMatchObject({ code: 'NETWORK' }); await timeout.dispose()
    const cancel = createOpenRouterGateway(ledger, { fetch: fetcher, now: () => routerAt }); const pending = cancel.request({ key: 'key', epoch: 'epoch' }, { endpoint: 'key', purpose: 'key-usage' }); const result = expect(pending).rejects.toMatchObject({ code: 'CANCELLED' }); await new Promise(resolve => setTimeout(resolve, 10)); await cancel.dispose(); await result
    expect(ledger.list({ limit: 10 }).calls.every(call => call.latest !== null)).toBe(true)
  })
})
describe('capability routing, cache and authorization', () => {
  it('uses endpoint descriptors, pins compatible tags, retains complete prices and refuses unsupported variants/settings', () => {
    const metadata = projectEndpoints('openai/gpt-image-2', routerEndpoint(), routerAt), route = selectImageRoute(metadata, { n: 1, aspectRatio: '1:1' }, 3, false)
    expect(route.provider).toEqual({ only: ['fixture-provider'], allow_fallbacks: false }); expect(route.estimate).toMatchObject({ kind: 'fixed', minimumUsd: '0.135', imageCount: 3 })
    expect(route.settings).not.toHaveProperty('resolution')
    for (const settings of [{ n: 1, aspectRatio: '16:9' }, { n: 1, aspectRatio: '1:1', resolution: '1K' }, { n: 1, aspectRatio: '1:1', resolution: '4K' }]) expect(() => selectImageRoute(metadata, settings as never, 1, false)).toThrow()
    const raw = routerEndpoint(); raw.endpoints[0]!.pricing.push({ billable: 'extra_billable', unit: 'unsupported', cost_usd: '0.2' })
    expect(selectImageRoute(projectEndpoints('openai/gpt-image-2', raw, routerAt), { n: 1, aspectRatio: '1:1' }, 1, false).estimate.kind).toBe('unknown')
    const tiered = routerEndpoint(); Object.assign(tiered.endpoints[0]!.pricing[0]!, { variant: 'high_resolution' })
    expect(selectImageRoute(projectEndpoints('openai/gpt-image-2', tiered, routerAt), { n: 1, aspectRatio: '1:1' }, 1, false).estimate.kind).toBe('unknown')
    for (const variant of ['https://private.test/tier', 'sk-or-private-secret', 'C:\\private\\tier']) {
      const unsafe = routerEndpoint(); Object.assign(unsafe.endpoints[0]!.pricing[0]!, { variant })
      const projected = projectEndpoints('openai/gpt-image-2', unsafe, routerAt)
      expect(JSON.stringify(projected)).not.toContain(variant); expect(projected.endpoints[0]!.lines[0]!.variant).toBe('unsupported')
      expect(projected.endpoints[0]!.lines[0]!.usd).toBe('0.045'); expect(selectImageRoute(projected, { n: 1, aspectRatio: '1:1' }, 1, false).estimate.kind).toBe('unknown')
    }
    const legacy = { ...metadata, endpoints: metadata.endpoints.map(endpoint => { const copy = { ...endpoint }; delete copy.capabilities; return copy }) }
    expect(() => selectImageRoute(legacy, { n: 1, aspectRatio: '1:1' }, 1, false)).toThrow()
  })
  it('requires every potentially routed endpoint compatible when a tag cannot be pinned', () => {
    const raw = routerEndpoint('openai/gpt-image-2', null); const other = structuredClone(raw.endpoints[0]!); other.supported_parameters.aspect_ratio.values = ['3:2']; raw.endpoints.push(other)
    expect(() => selectImageRoute(projectEndpoints('openai/gpt-image-2', raw, routerAt), { n: 1, aspectRatio: '1:1' }, 1, false)).toThrow()
    raw.endpoints.pop(); expect(selectImageRoute(projectEndpoints('openai/gpt-image-2', raw, routerAt), { n: 1, aspectRatio: '1:1' }, 1, false).provider).toBeNull()
  })
  it('keeps working credentials after validation/store failure and acknowledges saved keys despite metadata outage', async () => {
    const { service, store, gateway } = await setup(); await service.saveKey({ key: 'original-key' }); const original = await store.readKey()
    const request = gateway.request.bind(gateway)
    vi.spyOn(gateway, 'request').mockImplementation((credential, input, signal) => credential.key === 'management-key' ? Promise.resolve({ data: { ...routerKey.data, is_management_key: true } }) : request(credential, input, signal))
    await expect(service.saveKey({ key: 'management-key' })).rejects.toMatchObject({ code: 'ACCESS_RESTRICTED' }); expect(await store.readKey()).toEqual(original)
    const write = vi.spyOn(store, 'writeKey').mockRejectedValueOnce(new ApplicationError('STORAGE', 'Disk full'))
    await expect(service.saveKey({ key: 'replacement-key' })).rejects.toMatchObject({ code: 'STORAGE' }); expect(await store.readKey()).toEqual(original); write.mockRestore()
    vi.spyOn(gateway, 'request').mockImplementation((credential, input, signal) => input.endpoint === 'image-models' ? Promise.reject(new ApplicationError('NETWORK', 'Offline')) : request(credential, input, signal))
    const saved = await service.saveKey({ key: 'saved-despite-discovery-outage' }); expect(saved.metadataStale).toBe(true); expect((await store.readKey())!.key).toBe('saved-despite-discovery-outage'); expect(saved.models).toHaveLength(3)
  })
  it('records intents/checkpoints before ACK, prevents replay, preserves cost on model mismatch and independent discard', async () => {
    const { service, ledger, requests } = await setup(); await service.saveKey({ key: 'private-key' }); const count = requests.length, lease = service.acquireImageLease()
    for (const mutation of [() => service.saveKey({ key: 'new-key' }), () => service.removeKey(), () => service.setImageModel({ modelId: 'google/gemini-3.1-flash-image' })]) await expect(mutation()).rejects.toMatchObject({ code: 'BUSY' })
    const checkpoint = vi.fn(async (callId: string) => { expect(ledger.get(callId).latest).toBeNull() })
    const authorization = await service.prepareImageCall(lease, imageRequest({ checkpointRequested: checkpoint }))
    expect(checkpoint).toHaveBeenCalledWith(authorization.callId); expect(requests).toHaveLength(count)
    expect(ledger.get(authorization.callId).intent.pricing).toMatchObject({ settings: { n: 1, aspectRatio: '1:1' } })
    await expect(service.prepareImageCall(lease, imageRequest())).rejects.toMatchObject({ code: 'CONFLICT' })
    await service.recordTerminal(authorization.callId, { status: 'failed', httpStatus: 200, errorCode: 'UNAVAILABLE', generationId: 'gen-cost', returnedModelId: 'google/gemini-3.1-flash-image', cost: { kind: 'known', usd: '0.000000000000000001', source: 'response', recordedAt: routerAt } })
    await service.setDisposition(authorization.callId, 'discarded'); expect(service.getSettings().spend.allTimeUsd).toBe('0.000000000000000001')
    lease.release(); await service.removeKey(); expect(service.getCall(authorization.callId).latest?.cost.kind).toBe('known')
  })
  it.each(['same-slot', 'five-of-six'])('reserves slots and consumed budgets atomically across delayed ownership: %s', async scenario => {
    const { service, ledger } = await setup(); await service.saveKey({ key: 'key' }); const lease = service.acquireImageLease(), gate = deferred()
    const patch = scenario === 'five-of-six' ? { plannedImages: 6, activationImageRequests: 5 } : {}
    let entered = 0
    const validateOwnership = async () => { entered++; await gate.promise }
    const first = service.prepareImageCall(lease, imageRequest({ ...patch, validateOwnership })), second = service.prepareImageCall(lease, imageRequest({ ...patch, validateOwnership, imageSlotId: scenario === 'same-slot' ? 'image' : 'other-image' }))
    while (entered < 2) await new Promise(resolve => setTimeout(resolve, 1))
    gate.resolve(); const outcomes = await Promise.allSettled([first, second]); expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(ledger.list({ limit: 100, purpose: 'chapter-image' }).calls).toHaveLength(1); lease.release()
  })
  it('keeps checkpoint failures unresolved and prevents a second authorization or cancelled ACK', async () => {
    const { service, ledger } = await setup(); await service.saveKey({ key: 'key' }); const lease = service.acquireImageLease()
    await expect(service.prepareImageCall(lease, imageRequest({ checkpointRequested: async () => { throw new ApplicationError('STORAGE', 'Disk full') } }))).rejects.toMatchObject({ code: 'STORAGE' })
    expect(ledger.list({ limit: 100, purpose: 'chapter-image' }).calls[0]!.latest).toBeNull()
    await expect(service.prepareImageCall(lease, imageRequest())).rejects.toMatchObject({ code: 'CONFLICT' }); lease.release()
    const next = service.acquireImageLease(), cancel = new AbortController()
    await expect(service.prepareImageCall(next, imageRequest({ signal: cancel.signal, checkpointRequested: async () => { cancel.abort() } }))).rejects.toBeDefined(); next.release()
  })
  it('keeps fresh cache without startup HTTP, refreshes stale preflight once and preserves failed refresh values', async () => {
    const { service, store, ledger, gateway, requests, createId } = await setup(); await service.saveKey({ key: 'key' }); const cached = await store.readCache(), count = requests.length
    const restored = createOpenRouterService({ store, ledger, gateway, now: () => routerAt, createId }); services.push(restored); await restored.initialize(); expect(requests).toHaveLength(count); expect(restored.getSettings().metadataStale).toBe(false)
    const stale = createOpenRouterService({ store, ledger, gateway, now: () => '2026-10-09T18:00:00Z', createId }); services.push(stale); await stale.initialize(); expect(stale.getSettings().metadataStale).toBe(true)
    const refreshed = await stale.refreshMetadata(); expect(refreshed.metadataStale).toBe(false)
    vi.spyOn(gateway, 'request').mockRejectedValue(new ApplicationError('NETWORK', 'Offline'))
    await expect(stale.refreshMetadata()).rejects.toMatchObject({ code: 'NETWORK' }); expect(stale.getSettings().models).toEqual(refreshed.models); expect(stale.getSettings().metadataStale).toBe(true); expect(cached!.models).toHaveLength(3)
  })
  it('blocks inference on known zero allowance and rejects missing capability proof', async () => {
    const { service, gateway } = await setup(), request = gateway.request.bind(gateway)
    vi.spyOn(gateway, 'request').mockImplementation((credential, input, signal) => input.endpoint === 'key' ? Promise.resolve({ data: { ...routerKey.data, limit_remaining: '0' } }) : request(credential, input, signal))
    await service.saveKey({ key: 'key' }); expect(service.getSettings().connection).toBe('limited'); const lease = service.acquireImageLease()
    await expect(service.prepareImageCall(lease, imageRequest())).rejects.toMatchObject({ code: 'USAGE_LIMIT' }); lease.release()
  })
  it('serializes config mutation against leases and rejects stale post-cache refresh assignment after removal', async () => {
    const { service, store } = await setup(); await service.saveKey({ key: 'key' })
    const gate = deferred(), entered = deferred(), original = store.writeModel.bind(store)
    vi.spyOn(store, 'writeModel').mockImplementation(async model => { entered.resolve(); await gate.promise; await original(model) })
    const mutation = service.setImageModel({ modelId: 'google/gemini-3.1-flash-image' }); await entered.promise
    expect(() => service.acquireImageLease()).toThrow(); gate.resolve(); await mutation
    const cacheGate = deferred(), cacheEntered = deferred(), cacheWrite = store.writeCache.bind(store)
    vi.spyOn(store, 'writeCache').mockImplementation(async (models, epoch) => { cacheEntered.resolve(); await cacheGate.promise; await cacheWrite(models, epoch) })
    const refresh = service.refreshMetadata(), same = service.refreshMetadata(); expect(refresh).toBe(same)
    const rejected = expect(refresh).rejects.toMatchObject({ code: 'CANCELLED' }); await cacheEntered.promise; await service.removeKey(); cacheGate.resolve(); await rejected
    expect(service.getSettings()).toMatchObject({ connection: 'absent', keyUsage: null })
  })
  it('reconciles only genuine known IDs in their current key epoch and retains latest cost once', async () => {
    const { service, gateway, ledger } = await setup(); await service.saveKey({ key: 'key' }); const lease = service.acquireImageLease(), authorization = await service.prepareImageCall(lease, imageRequest())
    await service.recordTerminal(authorization.callId, { status: 'succeeded', httpStatus: 200, errorCode: null, generationId: 'gen-known', returnedModelId: 'openai/gpt-image-2', cost: { kind: 'unknown' } }); lease.release()
    const request = gateway.request.bind(gateway)
    vi.spyOn(gateway, 'request').mockImplementation((credential, input, signal) => input.endpoint === 'generation' ? Promise.resolve(parseProviderJson('{"data":{"id":"gen-known","model":"openai/gpt-image-2","total_cost":0.123456789123456789}}')) : request(credential, input, signal))
    await service.reconcile(authorization.callId); await service.reconcile(authorization.callId); expect(ledger.spend().allTimeUsd).toBe('0.123456789123456789')
    await service.saveKey({ key: 'same-key-new-epoch' }); await expect(service.reconcile(authorization.callId)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
  })
  it('deduplicates held cost rechecks, preserves publication and rejects an old epoch after removal', async () => {
    const { service, gateway, ledger } = await setup(); await service.saveKey({ key: 'key' })
    const lease = service.acquireImageLease(), authorization = await service.prepareImageCall(lease, imageRequest())
    await service.recordTerminal(authorization.callId, { status: 'succeeded', httpStatus: 200, errorCode: null, generationId: 'gen-known', returnedModelId: 'openai/gpt-image-2', cost: { kind: 'unknown' } }); lease.release()
    await service.setDisposition(authorization.callId, 'published')
    const request = gateway.request.bind(gateway), gate = deferred(); let checks = 0
    vi.spyOn(gateway, 'request').mockImplementation(async (credential, input, signal) => {
      if (input.endpoint !== 'generation') return request(credential, input, signal)
      checks++; await gate.promise; return parseProviderJson('{"data":{"id":"gen-known","model":"openai/gpt-image-2","total_cost":0.123456789123456789}}')
    })
    const first = service.reconcile(authorization.callId), second = service.reconcile(authorization.callId)
    expect(second).toBe(first); expect(checks).toBe(1)
    await service.removeKey(); gate.resolve(); await expect(first).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
    expect(ledger.get(authorization.callId).latest).toMatchObject({ disposition: 'published', cost: { kind: 'unknown' } })
    await expect(service.reconcile(authorization.callId)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' }); expect(checks).toBe(1)
  })
  it('serializes a held reconciliation append with publication disposition and retains both', async () => {
    const { service, gateway, ledger } = await setup(); await service.saveKey({ key: 'key' })
    const lease = service.acquireImageLease(), authorization = await service.prepareImageCall(lease, imageRequest())
    await service.recordTerminal(authorization.callId, { status: 'succeeded', httpStatus: 200, errorCode: null, generationId: 'gen-known', returnedModelId: 'openai/gpt-image-2', cost: { kind: 'unknown' } }); lease.release()
    vi.spyOn(gateway, 'request').mockResolvedValue(parseProviderJson('{"data":{"id":"gen-known","model":"openai/gpt-image-2","total_cost":0.123456789123456789}}'))
    const transition = ledger.transition.bind(ledger), entered = deferred(), gate = deferred(); let writes = 0
    vi.spyOn(ledger, 'transition').mockImplementation(async (id, next) => { writes++; if (writes === 1) { entered.resolve(); await gate.promise }; return transition(id, next) })
    const recheck = service.reconcile(authorization.callId); await entered.promise
    const published = service.setDisposition(authorization.callId, 'published'); await Promise.resolve(); expect(writes).toBe(1)
    gate.resolve(); await recheck; await published
    expect(ledger.get(authorization.callId).latest).toMatchObject({ disposition: 'published', cost: { kind: 'known', usd: '0.123456789123456789' } })
    expect(ledger.spend().allTimeUsd).toBe('0.123456789123456789')
  })
  it('keeps prior exact cost when generation metadata is unsupported, mismatched or fails', async () => {
    const { service, gateway, ledger } = await setup(); await service.saveKey({ key: 'key' })
    const lease = service.acquireImageLease(), authorization = await service.prepareImageCall(lease, imageRequest())
    await service.recordTerminal(authorization.callId, { status: 'succeeded', httpStatus: 200, errorCode: null, generationId: 'gen-known', returnedModelId: 'openai/gpt-image-2', cost: { kind: 'known', usd: '0.045', source: 'response', recordedAt: routerAt } }); lease.release()
    for (const response of [{}, { data: { id: 'gen-other', model: 'openai/gpt-image-2', total_cost: '1' } }, { data: { id: 'gen-known', model: 'google/gemini-3.1-flash-image', total_cost: '1' } }]) {
      vi.spyOn(gateway, 'request').mockResolvedValue(response)
      await expect(service.reconcile(authorization.callId)).rejects.toMatchObject({ code: 'UNAVAILABLE' })
      expect(ledger.spend().allTimeUsd).toBe('0.045')
    }
    vi.spyOn(gateway, 'request').mockRejectedValue(new ApplicationError('NETWORK', 'Unavailable'))
    await expect(service.reconcile(authorization.callId)).rejects.toMatchObject({ code: 'NETWORK' }); expect(ledger.spend().allTimeUsd).toBe('0.045')
  })
  it('rejects unpageable pricing-rich intents before storage while reserving terminal frame space', async () => {
    const { service, ledger, root } = await setup(); await service.saveKey({ key: 'key' }); const lease = service.acquireImageLease(), authorization = await service.prepareImageCall(lease, imageRequest()), original = ledger.get(authorization.callId).intent
    const endpoint = original.pricing!.endpoints[0]!, line = { ...endpoint.lines[0]!, variant: 'v'.repeat(128), billable: 'b'.repeat(64) }
    const rich = (id: string, target: number) => {
      const value = { ...original, id, pricing: { settings: original.pricing!.settings, endpoints: [] as (typeof endpoint)[] } }
      for (let index = 0; index < 64; index++) {
        const entry = { ...endpoint, id: `rich-${index}`, lines: [] as typeof endpoint.lines }; value.pricing.endpoints.push(entry)
        for (let count = 0; count < 16; count++) { entry.lines.push(line); if (Buffer.byteLength(JSON.stringify(value)) >= target) return value }
      }
      throw new Error('Could not construct boundary fixture')
    }
    const rejected = rich('too-rich', openRouterPolicy.ledgerIntentBytes + 100)
    expect(Buffer.byteLength(JSON.stringify(rejected))).toBeGreaterThan(openRouterPolicy.ledgerIntentBytes)
    expect(Buffer.byteLength(JSON.stringify(rejected))).toBeLessThan(openRouterPolicy.ledgerFrameBytes)
    expect(() => parseOpenRouterCallIntent(rejected)).toThrow()
    await expect(ledger.intent(rejected)).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    expect(await readdir(join(root, 'ledger'))).not.toContain('too-rich'); lease.release()
    for (const id of ['near-reserve-a', 'near-reserve-b']) {
      const accepted = rich(id, openRouterPolicy.ledgerIntentBytes - 500)
      expect(Buffer.byteLength(JSON.stringify(accepted))).toBeLessThanOrEqual(openRouterPolicy.ledgerIntentBytes)
      await ledger.intent(accepted)
      await ledger.transition(id, { recordedAt: routerAt, status: 'failed', httpStatus: 200, errorCode: 'UNAVAILABLE', generationId: 'gen-' + 'a'.repeat(124), returnedModelId: 'google/gemini-3.1-flash-image', cost: { kind: 'known', usd: '99999999999999999999.999999999999999999', source: 'response', recordedAt: routerAt }, disposition: 'save-failed' })
      expect(Buffer.byteLength(JSON.stringify(ledger.get(id)))).toBeLessThanOrEqual(openRouterPolicy.ledgerFrameBytes)
    }
    const first = ledger.list({ limit: 100, purpose: 'chapter-image' }); expect(first.calls.map(call => call.intent.id)).toEqual(['near-reserve-b']); expect(first.nextCursor).toBe('near-reserve-b')
    const second = ledger.list({ limit: 100, purpose: 'chapter-image', cursor: first.nextCursor! }); expect(second.calls[0]!.intent.id).toBe('near-reserve-a')
    expect(Buffer.byteLength(JSON.stringify(first))).toBeLessThanOrEqual(openRouterPolicy.ledgerFrameBytes); expect(Buffer.byteLength(JSON.stringify(second))).toBeLessThanOrEqual(openRouterPolicy.ledgerFrameBytes)
    expect(Buffer.byteLength(JSON.stringify(service.getCall(authorization.callId)))).toBeLessThan(openRouterPolicy.ledgerFrameBytes)
    expect(await readFile(join(root, 'ledger', authorization.callId, 'intent.json'), 'utf8')).not.toContain('"key"')
  })
})
