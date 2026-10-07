import { mkdtemp, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SecretEncryption } from '../../src/main/auth/credential-store'
import { createOpenRouterSettingsStore } from '../../src/main/openrouter/settings-store'
import { createOpenRouterLedger } from '../../src/main/openrouter/ledger'
import { createOpenRouterGateway } from '../../src/main/openrouter/gateway'
import { createOpenRouterService } from '../../src/main/openrouter/service'
import { openRouterImageModels } from '../../src/shared/openrouter'
import type { PrepareImageCallRequest } from '../../src/main/openrouter/service'

export const routerAt = '2026-10-07T18:00:00.000Z'
export const routerCipher: SecretEncryption = { available: () => true, encrypt: value => Buffer.from(value).map(byte => byte ^ 0x55), decrypt: value => Buffer.from(value).map(byte => byte ^ 0x55).toString() }
/** Representative endpoint fixtures; GPT/Google prices here are not live-provider evidence. */
export const routerEndpoint = (id = 'openai/gpt-image-2', tag: string | null = 'fixture-provider') => ({ id, endpoints: [{ provider_name: 'Fixture provider', provider_slug: 'fixture-provider', provider_tag: tag, supported_parameters: { aspect_ratio: { type: 'enum', values: ['1:1', '3:2'] }, n: { type: 'range', min: 1, max: 1 } }, pricing: [{ billable: 'output_image', unit: 'image', cost_usd: '0.045' }, { billable: 'input_image', unit: 'image', cost_usd: '0.003' }] }] })
export const routerCatalog = { data: openRouterImageModels.map(model => ({ id: model.id, architecture: { output_modalities: ['image'] }, endpoints: 'https://hostile.test/ignored' })) }
export const routerKey = { data: { is_management_key: false, is_provisioning_key: false, label: 'sk-or-private-label', usage: '0.123456789123456789', usage_daily: '0.1', usage_weekly: '0.12', usage_monthly: '0.123', limit: '10', limit_remaining: '9.876543210876543211' } }
export async function routerFixture(register: (root: string) => void, fetcher?: typeof fetch) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-router-'))); register(root)
  let sequence = 0
  const now = () => routerAt, createId = () => `id-${++sequence}`, requests: { url: string; headers: Headers; signal: AbortSignal | null }[] = []
  const fetcherDefault: typeof fetch = async (input, init) => {
    const url = String(input), headers = new Headers(init?.headers); requests.push({ url, headers, signal: init?.signal ?? null })
    const value = url.endsWith('/key') ? routerKey : url.endsWith('/images/models') ? routerCatalog : routerEndpoint(openRouterImageModels.find(model => url.includes(model.id))!.id)
    return new Response(JSON.stringify(value), { status: 200 })
  }
  const store = createOpenRouterSettingsStore(join(root, 'connection'), routerCipher), ledger = createOpenRouterLedger(join(root, 'ledger'), { now })
  const gateway = createOpenRouterGateway(ledger, { now, createId, fetch: fetcher ?? fetcherDefault })
  const service = createOpenRouterService({ store, ledger, gateway, now, createId })
  await service.initialize()
  return { root, store, ledger, gateway, service, requests, now, createId }
}
export function imageRequest(patch: Partial<PrepareImageCallRequest> = {}): PrepareImageCallRequest {
  return { purpose: 'chapter-image', operationId: 'operation', runId: 'run', context: { projectId: 'portable-project', topicId: 'topic', projectName: 'Learning project', topicTitle: 'Priors' }, imageSlotId: 'image', settings: { n: 1, aspectRatio: '1:1' }, activationImageRequests: 0, plannedImages: 1, signal: new AbortController().signal, validateOwnership: async () => {}, checkpointRequested: async () => {}, ...patch }
}
