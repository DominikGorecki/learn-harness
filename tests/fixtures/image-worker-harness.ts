import { join } from 'node:path'
import { open, writeFile } from 'node:fs/promises'
import { createOpenRouterSettingsStore } from '../../src/main/openrouter/settings-store'
import { createOpenRouterLedger } from '../../src/main/openrouter/ledger'
import { createOpenRouterGateway } from '../../src/main/openrouter/gateway'
import { createOpenRouterService } from '../../src/main/openrouter/service'
import { runPiWorker } from '../../src/main/generation/worker-client'
import { imageWorkerAuthority } from '../../src/main/generation/image-worker-authority'
import { ApplicationError } from '../../src/shared/contracts'

/** Bundled ONLY for this test into out/main, then removed before packaging. */
export async function runImageWorkerFixture(input: { directory: string; baseUrl: string; failure?: 'intent' | 'checkpoint' | 'terminal'; hold?: 'terminal' | 'exit' }) {
  const store = createOpenRouterSettingsStore(join(input.directory, 'connection'), { available: () => false, encrypt: () => { throw new Error('unused') }, decrypt: () => { throw new Error('unused') } })
  let imageCallId: string | null = null
  const ledger = createOpenRouterLedger(join(input.directory, 'ledger'), { append: async (path, value) => {
    if (typeof value === 'object' && value !== null && 'endpoint' in value && value.endpoint === 'images') {
      imageCallId = (value as unknown as { id: string }).id
      if (input.failure === 'intent') throw new ApplicationError('STORAGE', 'Fixture intent write failure.')
    }
    if (typeof value === 'object' && value !== null && 'callId' in value && value.callId === imageCallId && 'sequence' in value && value.sequence === 1) {
      if (input.hold === 'terminal') { state.held = true; await gate }
      if (input.failure === 'terminal') throw new ApplicationError('STORAGE', 'Fixture terminal write failure.')
    }
    const file = await open(path, 'wx', 0o600)
    try { await file.writeFile(JSON.stringify(value)); await file.sync() } finally { await file.close() }
  } })
  const gateway = createOpenRouterGateway(ledger, { fixture: { baseUrl: input.baseUrl, isPackaged: false, isolatedProfile: true } })
  const service = createOpenRouterService({ store, ledger, gateway }); await service.initialize(); await service.saveKey({ key: 'fixture-image-key' })
  const lease = service.acquireImageLease(), controller = new AbortController()
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve })
  const state = { held: false, settled: false, exited: false, accepted: false, pid: null as number | null, error: null as string | null, resultDigest: null as string | null, firstByteAt: null as number | null, lastByteAt: null as number | null, endedAt: null as number | null, waitingHint: false, health: 0,
    release, cancel: () => controller.abort(), calls: () => service.listCalls({ limit: 100 }),
    leaseProbe: () => { try { const probe = service.acquireImageLease(); probe.release(); return 'available' } catch (error) { return (error as ApplicationError).code } } }
  const authority = imageWorkerAuthority({ service, lease, prompt: 'Fixture abstract learning illustration', request: { purpose: 'chapter-image', operationId: 'fixture-operation', runId: 'fixture-run', context: { projectId: 'portable-project', topicId: 'topic', projectName: 'Learning', topicTitle: 'Evidence' }, imageSlotId: 'fixture-slot', settings: { n: 1, aspectRatio: '1:1' }, activationImageRequests: 0, plannedImages: 1, signal: controller.signal,
    validateOwnership: async () => {}, checkpointRequested: async callId => { if (input.failure === 'checkpoint') throw new ApplicationError('STORAGE', 'Fixture checkpoint failure.'); await writeFile(join(input.directory, 'checkpoint.json'), JSON.stringify({ callId, state: 'requested' })) } },
    acceptAsset: async image => { await writeFile(join(input.directory, 'accepted.png'), image.bytes); state.accepted = true } })
  const task = runPiWorker({ profile: 'fixed-image', input: { imageSlotId: 'fixture-slot' } }, { signal: controller.signal, ...authority,
    onTransport: value => { if (value.bytes) { state.firstByteAt ??= Date.now(); state.lastByteAt = Date.now() }; if (value.stage === 'ended') state.endedAt = Date.now(); state.waitingHint ||= value.waiting },
    onLifecycle: (event, data) => { if (event === 'spawned') state.pid = data.pid as number; if (event === 'exited') state.exited = true; if (event === 'health') state.health++ } })
  void task.result.then(result => { if ('digest' in result) state.resultDigest = result.digest }, error => { state.error = error.code }).finally(async () => { lease.release(); await service.dispose(); state.settled = true })
  return state
}
