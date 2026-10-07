import { randomUUID } from 'node:crypto'
import { ApplicationError } from '../../shared/contracts'
import { identifier } from '../../shared/validation'
import { observeNotification } from '../../core/notifications'
import { openRouterImageModels, openRouterPolicy, parseImageGenerationSettings, parseOpenRouterGenerationId, parseOpenRouterImageModel, parseReportedCallCost, parseSaveOpenRouterKey } from '../../shared/openrouter'
import type { ImageGenerationSettings, OpenRouterCallContext, OpenRouterCallTransition, OpenRouterImageModelId, OpenRouterKeyUsage, OpenRouterModelMetadata, OpenRouterSettings, ListOpenRouterCallsRequest } from '../../shared/openrouter'
import type { OpenRouterSettingsStore, OpenRouterCredential } from './settings-store'
import type { OpenRouterLedger } from './ledger'
import type { OpenRouterGateway } from './gateway'
import { catalogIds, projectEndpoints, selectImageRoute, unavailableModels } from './metadata'
import { decimalLiteral } from './money'
import { moneyUnits } from './money'

export interface ImageProviderLease { readonly modelId: OpenRouterImageModelId; readonly connectionEpoch: string; release(): void }
export interface PrepareImageCallRequest {
  purpose: 'chapter-image' | 'image-replacement'; operationId: string; runId: string | null; context: OpenRouterCallContext;
  imageSlotId: string; settings: ImageGenerationSettings; activationImageRequests: number; plannedImages: number;
  signal: AbortSignal; validateOwnership(): Promise<void>; checkpointRequested(callId: string): Promise<void>
}
export function createOpenRouterService(options: { store: OpenRouterSettingsStore; ledger: OpenRouterLedger; gateway: OpenRouterGateway; now?: () => string; createId?: () => string }) {
  const { store, ledger, gateway } = options, now = options.now ?? (() => new Date().toISOString()), createId = options.createId ?? randomUUID
  let credential: OpenRouterCredential | null = null, revision = 0, connection: OpenRouterSettings['connection'] = 'absent', errorCode: OpenRouterSettings['errorCode'] = null
  let modelId = openRouterPolicy.defaultImageModel, models = unavailableModels(now()), keyUsage: OpenRouterKeyUsage | null = null, refreshFailed = false, disposed = false
  let queue: Promise<unknown> = Promise.resolve(), refreshing: Promise<OpenRouterSettings> | null = null, configurationMutation = false
  const shutdown = new AbortController(), listeners = new Set<(value: OpenRouterSettings) => void>(), leases = new Map<ImageProviderLease, { credential: OpenRouterCredential; slots: Set<string>; live: boolean; budget: number | null; consumed: number | null }>(), authorizedCalls = new Set<string>()
  const serial = <T>(action: () => Promise<T>): Promise<T> => { const result = queue.then(action, action); queue = result.catch(() => {}); return result }
  const stale = () => refreshFailed || models.some(model => model.availability === 'unknown' || Date.parse(now()) - Date.parse(model.checkedAt) >= openRouterPolicy.metadataCacheMs)
  const snapshot = (): OpenRouterSettings => structuredClone({ revision, connection, protection: credential ? store.protection : null, imageModelId: modelId, models, keyUsage, spend: ledger.spend(), metadataStale: stale(), errorCode })
  const emit = () => { revision++; for (const listener of listeners) observeNotification(() => listener(snapshot())) }
  function available(): void { if (disposed) throw new ApplicationError('CANCELLED', 'OpenRouter service is closed.') }
  function mutable(): void { available(); if (leases.size) throw new ApplicationError('BUSY', 'An image operation owns the current OpenRouter connection and model.') }
  function configure<T>(action: () => Promise<T>): Promise<T> {
    try { mutable(); if (configurationMutation) throw new ApplicationError('BUSY', 'OpenRouter configuration is already changing.'); configurationMutation = true }
    catch (error) { return Promise.reject(error) }
    return serial(async () => { try { return await action() } finally { configurationMutation = false } })
  }
  function active(lease: ImageProviderLease) { available(); const value = leases.get(lease); if (!value?.live || credential?.epoch !== lease.connectionEpoch || modelId !== lease.modelId) throw new ApplicationError('CONFLICT', 'This image-provider lease is no longer current.'); return value }
  function usage(value: unknown): OpenRouterKeyUsage {
    if (!value || typeof value !== 'object' || !('data' in value) || !value.data || typeof value.data !== 'object') throw new ApplicationError('UNAVAILABLE', 'Current-key metadata is unsupported.')
    const data = value.data as Record<string, unknown>
    if (data.is_management_key !== false || data.is_provisioning_key === true) throw new ApplicationError('ACCESS_RESTRICTED', 'Use an ordinary OpenRouter inference key.')
    const amount = (key: string) => data[key] == null ? null : typeof data[key] === 'string' ? decimalLiteral(data[key]) : (() => { throw new ApplicationError('UNAVAILABLE', 'Exact current-key amounts are unavailable.') })()
    return { checkedAt: now(), usageUsd: amount('usage'), limitUsd: amount('limit'), remainingUsd: amount('limit_remaining'), dailyUsd: amount('usage_daily'), weeklyUsd: amount('usage_weekly'), monthlyUsd: amount('usage_monthly') }
  }
  async function refresh(): Promise<OpenRouterSettings> {
    available(); if (!credential) throw new ApplicationError('AUTH_REQUIRED', 'Save an ordinary OpenRouter key first.')
    const current = credential
    try {
      const ids = catalogIds(await gateway.request(current, { endpoint: 'image-models', purpose: 'model-discovery' }, shutdown.signal)), updated: OpenRouterModelMetadata[] = []
      for (const model of openRouterImageModels) {
        if (!ids.has(model.id)) updated.push({ modelId: model.id, availability: 'unavailable', reason: 'This fixed image model is absent from the catalog.', checkedAt: now(), endpoints: [] })
        else updated.push(projectEndpoints(model.id, await gateway.request(current, { endpoint: 'image-model-endpoints', purpose: 'endpoint-discovery', modelId: model.id }, shutdown.signal), now()))
      }
      const checked = usage(await gateway.request(current, { endpoint: 'key', purpose: 'key-usage' }, shutdown.signal))
      if (credential?.epoch !== current.epoch || disposed) throw new ApplicationError('CANCELLED', 'Provider configuration changed during refresh.')
      await store.writeCache(updated, current.epoch)
      if (credential?.epoch !== current.epoch || disposed) throw new ApplicationError('CANCELLED', 'Provider configuration changed during cache persistence.')
      models = updated; keyUsage = checked; refreshFailed = false; connection = checked.remainingUsd !== null && moneyUnits(checked.remainingUsd) === 0n ? 'limited' : 'connected'; errorCode = connection === 'limited' ? 'USAGE_LIMIT' : null
    } catch (error) {
      if (credential?.epoch !== current.epoch || disposed) throw new ApplicationError('CANCELLED', 'Provider configuration changed during refresh.')
      refreshFailed = true; errorCode = error instanceof ApplicationError ? error.code : 'NETWORK'; connection = errorCode === 'STORAGE' ? 'storage-error' : errorCode === 'AUTH_REQUIRED' ? 'invalid' : errorCode === 'ACCESS_RESTRICTED' ? 'restricted' : errorCode === 'USAGE_LIMIT' ? 'limited' : 'offline'; emit(); throw error instanceof ApplicationError ? error : new ApplicationError('NETWORK', 'OpenRouter metadata could not be refreshed.')
    }
    emit(); return snapshot()
  }
  const service = {
    async initialize(): Promise<void> {
      await ledger.initialize()
      try { credential = await store.readKey(); modelId = await store.readModel(); const cached = await store.readCache(); if (cached) { models = cached.models; refreshFailed = cached.epoch !== credential?.epoch }; connection = credential ? 'connected' : 'absent'; if (!ledger.healthy) errorCode = 'STORAGE' }
      catch { connection = 'storage-error'; errorCode = 'STORAGE' }
      emit()
    },
    getSettings: snapshot,
    /** Cached main-owned quote; no HTTP, mutation or inference admission. Use returned settings for dispatch. */
    getImageConfiguration(count = 1, input?: ImageGenerationSettings) {
      const metadata = models.find(model => model.modelId === modelId)!
      const settings = input ? parseImageGenerationSettings(input) : metadata.endpoints.find(endpoint => {
        try { selectImageRoute(metadata, endpoint.settings, count, stale()); return true } catch { return false }
      })?.settings ?? null
      if (settings) {
        try { return { modelId, settings: structuredClone(settings), estimate: selectImageRoute(metadata, settings, count, stale()).estimate, available: connection === 'connected' } }
        catch { /* Unsupported cached settings remain an explicit unknown quote. */ }
      }
      return { modelId, settings, estimate: { kind: 'unknown' as const, reason: 'No compatible image configuration is currently available.' }, available: false }
    },
    subscribe(listener: (value: OpenRouterSettings) => void): () => void { listeners.add(listener); return () => listeners.delete(listener) },
    saveKey(value: { key: string }): Promise<OpenRouterSettings> {
      return configure(async () => {
        mutable(); const candidate = { key: parseSaveOpenRouterKey(value).key, epoch: createId() }
        const checked = usage(await gateway.request(candidate, { endpoint: 'key', purpose: 'key-validation' }, shutdown.signal))
        mutable(); await store.writeKey(candidate); available(); credential = candidate; keyUsage = checked; refreshFailed = true; connection = checked.remainingUsd !== null && moneyUnits(checked.remainingUsd) === 0n ? 'limited' : 'connected'; errorCode = connection === 'limited' ? 'USAGE_LIMIT' : null; emit()
        // Explicit setup refresh is non-inference; a discovery outage does not undo a validated saved key.
        await service.refreshMetadata().catch(() => {})
        return snapshot()
      })
    },
    removeKey(): Promise<OpenRouterSettings> { return configure(async () => { mutable(); await store.clearKey(); available(); credential = null; keyUsage = null; connection = 'absent'; errorCode = null; emit(); return snapshot() }) },
    setImageModel(value: { modelId: OpenRouterImageModelId }): Promise<OpenRouterSettings> { return configure(async () => { mutable(); const next = parseOpenRouterImageModel(value.modelId); await store.writeModel(next); available(); modelId = next; emit(); return snapshot() }) },
    refreshMetadata(): Promise<OpenRouterSettings> { available(); if (!refreshing) { refreshing = refresh(); void refreshing.finally(() => { refreshing = null }).catch(() => {}) }; return refreshing },
    listCalls(request: ListOpenRouterCallsRequest) { return ledger.list(request) },
    getCall(callId: string) { return ledger.get(callId) },
    acquireImageLease(): ImageProviderLease {
      available(); if (!credential) throw new ApplicationError('AUTH_REQUIRED', 'Save an ordinary OpenRouter key first.')
      if (configurationMutation) throw new ApplicationError('BUSY', 'OpenRouter configuration is changing.')
      if (leases.size) throw new ApplicationError('BUSY', 'Another image operation owns the provider.')
      const lease: ImageProviderLease = { modelId, connectionEpoch: credential.epoch, release: () => { const value = leases.get(lease); if (value) value.live = false; leases.delete(lease) } }
      leases.set(lease, { credential: { ...credential }, slots: new Set(), live: true, budget: null, consumed: null }); return lease
    },
    /** Main only: intent -> durable requested checkpoint -> recheck -> acknowledgement. No image HTTP. */
    async prepareImageCall(lease: ImageProviderLease, request: PrepareImageCallRequest) {
      let state = active(lease)
      request.signal.throwIfAborted(); identifier(request.imageSlotId)
      if (!ledger.healthy) throw new ApplicationError('STORAGE', 'Request history needs recovery before paid image generation.')
      if (!Number.isSafeInteger(request.plannedImages) || request.plannedImages < 1 || request.plannedImages > 6 || !Number.isSafeInteger(request.activationImageRequests) || request.activationImageRequests < 0 || request.activationImageRequests >= request.plannedImages || state.slots.has(request.imageSlotId)) throw new ApplicationError('CONFLICT', 'This image slot has already been requested or its activation budget is exhausted.')
      if (stale()) await service.refreshMetadata()
      active(lease); request.signal.throwIfAborted(); await request.validateOwnership(); active(lease)
      if (connection !== 'connected' || keyUsage?.remainingUsd !== null && keyUsage?.remainingUsd !== undefined && moneyUnits(keyUsage.remainingUsd) === 0n) throw new ApplicationError(errorCode ?? 'UNAVAILABLE', 'Validate a usable OpenRouter connection before image generation.')
      const metadata = models.find(model => model.modelId === lease.modelId)!, route = selectImageRoute(metadata, request.settings, 1, stale()), callId = createId()
      // Claim slot before asynchronous intent persistence: simultaneous worker intents cannot both dispatch it.
      state = active(lease)
      const consumed = state.consumed ?? request.activationImageRequests
      if (state.slots.has(request.imageSlotId) || consumed + state.slots.size >= request.plannedImages || state.budget !== null && state.budget !== request.plannedImages || request.activationImageRequests < consumed || request.activationImageRequests > consumed + state.slots.size) throw new ApplicationError('CONFLICT', 'The image slot or declared activation budget changed.')
      state.budget = request.plannedImages
      state.consumed = consumed
      state.slots.add(request.imageSlotId)
      await ledger.intent({ schemaVersion: 1, id: callId, startedAt: now(), connectionEpoch: lease.connectionEpoch, endpoint: 'images', purpose: request.purpose, operationId: request.operationId, runId: request.runId, context: request.context, modelId: lease.modelId, estimate: route.estimate, pricing: { settings: route.settings, endpoints: route.endpoints } })
      authorizedCalls.add(callId)
      await request.checkpointRequested(callId)
      request.signal.throwIfAborted(); active(lease); await request.validateOwnership(); request.signal.throwIfAborted(); active(lease)
      return { callId, imageSlotId: request.imageSlotId, key: state.credential.key, connectionEpoch: lease.connectionEpoch, modelId: lease.modelId, baseUrl: gateway.baseUrl, settings: route.settings, provider: route.provider, estimate: route.estimate }
    },
    /** Await after valid EOF, before decode/storage. Known billing survives independent result rejection. */
    async recordTerminal(callId: string, value: Omit<OpenRouterCallTransition, 'schemaVersion' | 'callId' | 'sequence' | 'recordedAt' | 'disposition'>): Promise<void> {
      if (!authorizedCalls.has(callId)) throw new ApplicationError('FORBIDDEN', 'No image intent owns this result.')
      await ledger.transition(callId, { ...value, cost: parseReportedCallCost(value.cost), recordedAt: now(), disposition: ledger.get(callId).latest?.disposition ?? 'none' }); emit()
    },
    async setDisposition(callId: string, disposition: OpenRouterCallTransition['disposition']): Promise<void> {
      const call = ledger.get(callId), previous = call.latest
      await ledger.transition(callId, { recordedAt: now(), status: previous?.status ?? 'intended', httpStatus: previous?.httpStatus ?? null, errorCode: previous?.errorCode ?? null, generationId: previous?.generationId ?? null, returnedModelId: previous?.returnedModelId ?? null, cost: previous?.cost ?? { kind: 'unknown' }, disposition }); emit()
    },
    async reconcile(callId: string): Promise<void> {
      available(); const call = ledger.get(callId)
      if (!credential || credential.epoch !== call.intent.connectionEpoch) throw new ApplicationError('AUTH_REQUIRED', 'This request belongs to a different saved connection.')
      if (call.intent.endpoint !== 'images' || !call.latest?.generationId) throw new ApplicationError('UNAVAILABLE', 'This image request has no provider generation ID to reconcile.')
      const generationId = parseOpenRouterGenerationId(call.latest.generationId), raw = await gateway.request(credential, { endpoint: 'generation', purpose: 'cost-reconciliation', generationId }, shutdown.signal)
      const data = raw && typeof raw === 'object' && 'data' in raw ? raw.data as Record<string, unknown> : null
      if (!data || data.id !== generationId || data.model !== call.intent.modelId || typeof data.total_cost !== 'string') throw new ApplicationError('UNAVAILABLE', 'Generation metadata did not match this request.')
      const previous = ledger.get(callId).latest!
      await ledger.transition(callId, { ...previous, recordedAt: now(), cost: { kind: 'known', usd: decimalLiteral(data.total_cost), source: 'generation-metadata', recordedAt: now() } }); emit()
    },
    async dispose(): Promise<void> { disposed = true; shutdown.abort(); await gateway.dispose(); for (const lease of leases.keys()) lease.release(); await refreshing?.catch(() => {}); await queue.catch(() => {}); await ledger.drain(); listeners.clear() }
  }
  return service
}
export type OpenRouterService = ReturnType<typeof createOpenRouterService>
