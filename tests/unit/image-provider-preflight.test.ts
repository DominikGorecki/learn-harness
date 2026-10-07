import { rm } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { prepareImageProvider } from '../../src/main/generation/image-provider-preflight'
import { createOpenRouterService } from '../../src/main/openrouter/service'
import type { OpenRouterService } from '../../src/main/openrouter/service'
import { projectEndpoints } from '../../src/main/openrouter/metadata'
import { openRouterImageModels } from '../../src/shared/openrouter'
import { routerFixture, routerAt, routerCatalog, routerEndpoint, routerKey } from '../fixtures/openrouter'

const roots: string[] = [], services: OpenRouterService[] = []
afterEach(async () => {
  await Promise.all(services.splice(0).map(service => service.dispose()))
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})
async function persisted(cache: 'empty' | 'fresh' | 'aged', fetcher?: typeof fetch) {
  const fixture = await routerFixture(root => roots.push(root), fetcher)
  services.push(fixture.service)
  await fixture.store.writeKey({ key: 'explicit-fixture-key', epoch: 'persisted-epoch' })
  if (cache !== 'empty') await fixture.store.writeCache(openRouterImageModels.map(model => projectEndpoints(model.id, routerEndpoint(model.id), cache === 'fresh' ? routerAt : '2026-10-05T18:00:00Z')), 'persisted-epoch')
  const service = createOpenRouterService({ store: fixture.store, ledger: fixture.ledger, gateway: fixture.gateway, now: fixture.now, createId: fixture.createId })
  services.push(service); await service.initialize()
  return { ...fixture, service }
}
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done }); return { promise, resolve } }

describe('explicit image provider preflight', () => {
  it('does not refresh absent credentials, startup or cached quotes', async () => {
    const fixture = await routerFixture(root => roots.push(root)); services.push(fixture.service)
    expect(await prepareImageProvider(fixture.service)).toBeNull()
    expect(fixture.service.getImageConfiguration().available).toBe(false)
    expect(fixture.requests).toHaveLength(0)
  })
  it.each(['empty', 'aged'] as const)('refreshes a persisted key with %s cache before choosing settings', async cache => {
    const { service, requests, ledger } = await persisted(cache)
    expect(requests).toHaveLength(0)
    expect(service.getImageConfiguration().estimate).toBeDefined(); expect(requests).toHaveLength(0)
    const prepared = await prepareImageProvider(service)
    expect(prepared?.settings).toEqual({ n: 1, aspectRatio: '1:1' })
    expect(requests).toHaveLength(5); expect(requests.every(request => !request.url.endsWith('/images'))).toBe(true)
    expect(ledger.list({ limit: 10 }).calls).toHaveLength(5)
    expect(service.getSettings().metadataStale).toBe(false)
    await expect(service.removeKey()).rejects.toMatchObject({ code: 'BUSY' })
    prepared!.lease.release(); expect((await service.removeKey()).connection).toBe('absent')
  })
  it('uses fresh compatible cache without metadata HTTP and releases unavailable routes', async () => {
    const { service, requests, store } = await persisted('fresh')
    const prepared = await prepareImageProvider(service); expect(prepared).not.toBeNull(); expect(requests).toHaveLength(0); prepared!.lease.release()
    await store.writeCache(openRouterImageModels.map(model => ({ modelId: model.id, availability: 'unavailable', reason: 'Fixture unavailable', checkedAt: routerAt, endpoints: [] })), 'persisted-epoch')
    await service.initialize()
    expect(await prepareImageProvider(service)).toBeNull(); expect(requests).toHaveLength(0)
    expect((await service.removeKey()).connection).toBe('absent')
  })
  it('recovers the last failed refresh and preserves fallback/no paid request when refresh still fails', async () => {
    let offline = true
    const paths: string[] = []
    const { service } = await persisted('fresh', async input => {
      const url = String(input); paths.push(url)
      if (offline) throw new Error('Fixture offline')
      return new Response(JSON.stringify(url.endsWith('/key') ? routerKey : url.endsWith('/images/models') ? routerCatalog : routerEndpoint(openRouterImageModels.find(model => url.includes(model.id))!.id)))
    })
    await expect(service.refreshMetadata()).rejects.toMatchObject({ code: 'NETWORK' })
    expect(service.getSettings()).toMatchObject({ connection: 'offline', metadataStale: true })
    expect(await prepareImageProvider(service)).toBeNull(); expect(paths).toHaveLength(2)
    const unused = service.acquireImageLease(); unused.release()
    offline = false
    const prepared = await prepareImageProvider(service); expect(prepared).not.toBeNull(); expect(paths).toHaveLength(7)
    expect(paths.some(path => path.endsWith('/images'))).toBe(false); prepared!.lease.release()
  })
  it.each([true, false])('pins prior output settings rather than selecting a new default (still supported: %s)', async supported => {
    const { service, store } = await persisted('aged', async input => {
      const url = String(input)
      if (url.endsWith('/key')) return new Response(JSON.stringify(routerKey))
      if (url.endsWith('/images/models')) return new Response(JSON.stringify(routerCatalog))
      const raw = routerEndpoint(openRouterImageModels.find(model => url.includes(model.id))!.id)
      Object.assign(raw.endpoints[0]!.supported_parameters, { resolution: { type: 'enum', values: supported ? ['512', '1K'] : ['1K'] }, output_format: { type: 'enum', values: ['png'] } })
      return new Response(JSON.stringify(raw))
    })
    const previous = openRouterImageModels.map(model => {
      const raw = routerEndpoint(model.id)
      Object.assign(raw.endpoints[0]!.supported_parameters, { resolution: { type: 'enum', values: ['512'] } })
      return projectEndpoints(model.id, raw, '2026-10-05T18:00:00Z')
    })
    await store.writeCache(previous, 'persisted-epoch'); await service.initialize()
    expect(service.getImageConfiguration().settings).toEqual({ n: 1, aspectRatio: '1:1', resolution: '512' })
    const prepared = await prepareImageProvider(service)
    if (supported) { expect(prepared?.settings).toEqual({ n: 1, aspectRatio: '1:1', resolution: '512' }); prepared!.lease.release() }
    else { expect(prepared).toBeNull(); const released = service.acquireImageLease(); released.release() }
  })
  it('holds configuration ownership during single-flight refresh and drains cancelled shutdown', async () => {
    const entered = deferred(), release = deferred()
    const { service } = await persisted('empty', async (input, init) => {
      const url = String(input)
      if (url.endsWith('/images/models')) { entered.resolve(); await Promise.race([release.promise, new Promise<void>((_, reject) => init!.signal!.addEventListener('abort', () => reject(new Error('Shutdown')), { once: true }))]) }
      return new Response(JSON.stringify(url.endsWith('/key') ? routerKey : url.endsWith('/images/models') ? routerCatalog : routerEndpoint(openRouterImageModels.find(model => url.includes(model.id))!.id)))
    })
    const preflight = prepareImageProvider(service); await entered.promise
    await expect(service.removeKey()).rejects.toMatchObject({ code: 'BUSY' })
    await expect(service.setImageModel({ modelId: 'google/gemini-3.1-flash-image' })).rejects.toMatchObject({ code: 'BUSY' })
    await expect(service.saveKey({ key: 'replacement-key' })).rejects.toMatchObject({ code: 'BUSY' })
    const first = service.refreshMetadata(), second = service.refreshMetadata(); expect(first).toBe(second)
    const cancelled = expect(preflight).rejects.toMatchObject({ code: 'CANCELLED' })
    void first.catch(() => {}); await service.dispose(); release.resolve(); await cancelled
  })
})
