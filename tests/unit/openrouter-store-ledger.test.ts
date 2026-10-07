import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createOpenRouterSettingsStore } from '../../src/main/openrouter/settings-store'
import { createOpenRouterLedger } from '../../src/main/openrouter/ledger'
import { appendPrivate } from '../../src/main/openrouter/private-files'
import { decimalLiteral, parseProviderJson, addMoney } from '../../src/main/openrouter/money'
import { unavailableModels } from '../../src/main/openrouter/metadata'
import type { OpenRouterCallIntent, OpenRouterCallTransition } from '../../src/shared/openrouter'
import { openRouterPolicy, parseOpenRouterCallPage } from '../../src/shared/openrouter'
import { routerAt, routerCipher } from '../fixtures/openrouter'
const roots: string[] = []
const directory = async () => { const root = await mkdtemp(join(tmpdir(), 'edu-ledger-')); roots.push(root); return root }
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
const intent = (id: string, startedAt = routerAt): OpenRouterCallIntent => ({ schemaVersion: 1, id, startedAt, connectionEpoch: 'epoch', endpoint: 'images', purpose: 'chapter-image', operationId: 'op', runId: 'run', context: { projectId: 'project', topicId: 'topic', projectName: 'Math', topicTitle: 'Probability' }, modelId: 'openai/gpt-image-2', estimate: { kind: 'unknown', reason: 'No proven quantities' } })
const terminal = (patch: Partial<Omit<OpenRouterCallTransition, 'schemaVersion' | 'callId' | 'sequence'>> = {}) => ({ recordedAt: routerAt, status: 'succeeded' as const, httpStatus: 200, errorCode: null, generationId: null, returnedModelId: null, cost: { kind: 'known' as const, usd: '0.100000000000000001', source: 'response' as const, recordedAt: routerAt }, disposition: 'none' as const, ...patch })
describe('independent private OpenRouter storage', () => {
  it.each([true, false])('persists/restores/removes an independent key with protected=%s', async protectedStorage => {
    const path = await directory(), cipher = { ...routerCipher, available: () => protectedStorage }, store = createOpenRouterSettingsStore(path, cipher), credential = { key: 'sk-private', epoch: 'opaque-epoch' }
    await writeFile(join(path, 'chatgpt.json'), 'Other provider bytes')
    await store.writeKey(credential); await store.writeModel('google/gemini-3.1-flash-image')
    const bytes = await readFile(join(path, 'openrouter-key.json'), 'utf8')
    expect(bytes.includes('sk-private')).toBe(!protectedStorage)
    const restored = createOpenRouterSettingsStore(path, cipher)
    expect(await restored.readKey()).toEqual(credential); expect(await restored.readModel()).toBe('google/gemini-3.1-flash-image')
    await restored.clearKey(); expect(await restored.readKey()).toBeNull()
    expect(await readFile(join(path, 'chatgpt.json'), 'utf8')).toBe('Other provider bytes')
  })
  it('upgrades local protection and preserves a working key on encryption failure', async () => {
    const path = await directory(), local = createOpenRouterSettingsStore(path, { ...routerCipher, available: () => false }), credential = { key: 'original-key', epoch: 'epoch' }
    await local.writeKey(credential); expect(await createOpenRouterSettingsStore(path, routerCipher).readKey()).toEqual(credential)
    expect(await readFile(join(path, 'openrouter-key.json'), 'utf8')).not.toContain('original-key')
    const failing = createOpenRouterSettingsStore(path, { ...routerCipher, encrypt: () => { throw new Error('Raw secret error') } })
    await expect(failing.writeKey({ key: 'replacement', epoch: 'new' })).rejects.toMatchObject({ code: 'STORAGE' })
    expect(await createOpenRouterSettingsStore(path, routerCipher).readKey()).toEqual(credential)
  })
  it('preserves hostile envelopes, unavailable encryption, duplicate cache and linked files', async () => {
    const path = await directory(), store = createOpenRouterSettingsStore(path, routerCipher)
    await store.writeKey({ key: 'protected-key', epoch: 'epoch' })
    await expect(createOpenRouterSettingsStore(path, { ...routerCipher, available: () => false }).readKey()).rejects.toMatchObject({ code: 'STORAGE' })
    const envelope = JSON.parse(await readFile(join(path, 'openrouter-key.json'), 'utf8')); envelope.credential = { key: 'ignored-plaintext', epoch: 'epoch' }
    await writeFile(join(path, 'openrouter-key.json'), JSON.stringify(envelope)); await expect(store.readKey()).rejects.toMatchObject({ code: 'STORAGE' })
    expect(await readFile(join(path, 'openrouter-key.json'), 'utf8')).toContain('ignored-plaintext')
    const models = unavailableModels(routerAt); await store.writeCache(models, 'epoch'); expect(await store.readCache()).toEqual({ epoch: 'epoch', models })
    await expect(store.writeCache([models[0]!, models[0]!, models[2]!], 'epoch')).rejects.toMatchObject({ code: 'STORAGE' })
    await writeFile(join(path, 'openrouter-cache.json'), JSON.stringify({ version: 1, epoch: 'epoch', models: [models[0], models[0], models[2]] })); await expect(store.readCache()).rejects.toMatchObject({ code: 'STORAGE' })
    await rm(join(path, 'openrouter-key.json')); const outside = join(path, 'outside'); await writeFile(outside, 'Unrelated')
    await symlink(outside, join(path, 'openrouter-key.json')); await expect(store.clearKey()).rejects.toMatchObject({ code: 'STORAGE' }); expect(await readFile(outside, 'utf8')).toBe('Unrelated')
  })
})
describe('exact money and durable request history', () => {
  it('projects unsafe display labels without changing identities, ordinary titles or monetary evidence', async () => {
    const path = await directory(), ledger = createOpenRouterLedger(path, { now: () => routerAt }); await ledger.initialize()
    const original = intent('safe-labels'); original.context = { ...original.context!, projectName: 'Project at C:\\private\\project', topicTitle: 'Account sk-or-private-secret' }
    await ledger.intent(original)
    expect(ledger.get(original.id).intent.context).toEqual({ projectId: 'project', topicId: 'topic', projectName: 'Learning project', topicTitle: 'Topic' })
    expect(original.context.projectName).toBe('Project at C:\\private\\project')
    await ledger.intent({ ...intent('ordinary-labels'), context: { ...original.context, projectName: 'Probability: evidence and belief', topicTitle: 'Prior P(A) and ratios 1:2' } })
    expect(ledger.get('ordinary-labels').intent.context?.topicTitle).toBe('Prior P(A) and ratios 1:2')
    const bytes = await readFile(join(path, original.id, 'intent.json'), 'utf8'); expect(bytes).not.toContain('private-secret'); expect(bytes).not.toContain('C:')
  })
  it('retains numeric source literals and exponent precision without binary sums', () => {
    expect(parseProviderJson('{"usage":0.123456789123456789,"cost":1e-18,"count":1}')).toEqual({ usage: '0.123456789123456789', cost: '0.000000000000000001', count: 1 })
    expect(decimalLiteral('1.23e2')).toBe('123'); expect(addMoney(['0.1', '0.2', '0.000000000000000001'])).toBe('0.300000000000000001')
    for (const value of ['1e-19', '1e20', '-0.1', 'NaN', '1e100000', '0.1234567891234567891']) expect(() => decimalLiteral(value)).toThrow()
  })
  it('aggregates latest costs once across disposition, reconciliation, offset filters and restart', async () => {
    const path = await directory(), now = () => routerAt, ledger = createOpenRouterLedger(path, { now }); await ledger.initialize()
    await ledger.intent(intent('first', '2026-10-07T23:30:00+06:00')); await ledger.transition('first', terminal({ returnedModelId: 'google/gemini-3.1-flash-image', status: 'failed', generationId: 'gen-first' }))
    await ledger.transition('first', terminal({ returnedModelId: 'google/gemini-3.1-flash-image', status: 'failed', generationId: 'gen-first', disposition: 'discarded' }))
    expect(ledger.spend().allTimeUsd).toBe('0.100000000000000001')
    await ledger.transition('first', terminal({ returnedModelId: 'google/gemini-3.1-flash-image', status: 'failed', generationId: 'gen-first', disposition: 'discarded', cost: { kind: 'known', usd: '0.200000000000000001', source: 'generation-metadata', recordedAt: routerAt } }))
    expect(ledger.list({ limit: 10, from: '2026-10-07T17:00:00Z', to: '2026-10-07T18:00:00Z' }).calls.map(call => call.intent.id)).toEqual(['first'])
    expect(ledger.spend().todayUsd).toBe('0.200000000000000001')
    await expect(ledger.transition('first', terminal({ cost: { kind: 'unknown' } }))).rejects.toMatchObject({ code: 'CONFLICT' })
    const restored = createOpenRouterLedger(path, { now }); await restored.initialize(); expect(restored.healthy).toBe(true); expect(restored.spend()).toEqual(ledger.spend())
    expect(restored.get('first').latest?.returnedModelId).toBe('google/gemini-3.1-flash-image')
  })
  it('marks null and persisted intended orphans interrupted without erasing known evidence', async () => {
    const path = await directory(), ledger = createOpenRouterLedger(path, { now: () => routerAt }); await ledger.initialize()
    await ledger.intent(intent('orphan')); await ledger.intent(intent('intended')); await ledger.transition('intended', terminal({ status: 'intended', generationId: 'gen-intended', disposition: 'checkpointed' }))
    const restored = createOpenRouterLedger(path, { now: () => routerAt }); await restored.initialize()
    expect(restored.get('orphan').latest).toMatchObject({ status: 'interrupted', cost: { kind: 'unknown' } })
    expect(restored.get('intended').latest).toMatchObject({ status: 'interrupted', generationId: 'gen-intended', disposition: 'checkpointed', cost: { kind: 'known', usd: '0.100000000000000001' } })
    await expect(restored.intent(intent('orphan'))).rejects.toMatchObject({ code: 'CONFLICT' })
  })
  it.each(['time', 'generation', 'returned-model'])('preserves corrupt transition %s evidence and blocks paid intents', async kind => {
    const path = await directory(), ledger = createOpenRouterLedger(path, { now: () => routerAt }); await ledger.initialize()
    await ledger.intent(intent('call')); await ledger.transition('call', terminal({ generationId: 'gen-original', returnedModelId: 'openai/gpt-image-2' })); await ledger.transition('call', terminal({ generationId: 'gen-original', returnedModelId: 'openai/gpt-image-2' }))
    const target = join(path, 'call/transition-0000000002.json'), next = JSON.parse(await readFile(target, 'utf8'))
    if (kind === 'time') next.recordedAt = '2026-10-06T18:00:00Z'; if (kind === 'generation') next.generationId = 'gen-changed'; if (kind === 'returned-model') next.returnedModelId = 'google/gemini-3.1-flash-image'
    const bytes = JSON.stringify(next); await writeFile(target, bytes)
    const restored = createOpenRouterLedger(path, { now: () => routerAt }); await restored.initialize(); expect(restored.healthy).toBe(false)
    await expect(restored.intent(intent('blocked'))).rejects.toMatchObject({ code: 'STORAGE' }); expect(await readFile(target, 'utf8')).toBe(bytes)
    await restored.intent({ ...intent('metadata'), endpoint: 'key', purpose: 'key-usage', modelId: null, operationId: null, runId: null, context: null })
  })
  it('prevents dispatch permission after intent or terminal persistence faults and retains unknown bytes', async () => {
    const path = await directory(), ledger = createOpenRouterLedger(path, { now: () => routerAt, append: async (target, value, limit) => { if (target.endsWith('intent.json')) throw new Error('Disk full'); await appendPrivate(target, value, limit) } }); await ledger.initialize()
    await expect(ledger.intent(intent('blocked'))).rejects.toMatchObject({ code: 'STORAGE' }); expect(ledger.healthy).toBe(false)
    const other = await directory(), terminalFault = createOpenRouterLedger(other, { now: () => routerAt, append: async (target, value, limit) => { if (target.includes('transition')) throw new Error('Disk full'); await appendPrivate(target, value, limit) } }); await terminalFault.initialize(); await terminalFault.intent(intent('unresolved'))
    await expect(terminalFault.transition('unresolved', terminal())).rejects.toMatchObject({ code: 'STORAGE' }); expect(terminalFault.get('unresolved').latest).toBeNull()
    expect(await readdir(join(other, 'unresolved'))).toEqual(['intent.json'])
  })
  it('pages a stable filtered history and bounds the entire frame including pricing snapshots', async () => {
    const path = await directory(), ledger = createOpenRouterLedger(path, { now: () => routerAt }); await ledger.initialize()
    for (let index = 0; index < 60; index++) await ledger.intent({ ...intent(`call-${index.toString().padStart(3, '0')}`), estimate: { kind: 'unknown', reason: 'x'.repeat(512) } })
    const first = ledger.list({ limit: 100 }); expect(Buffer.byteLength(JSON.stringify(first))).toBeLessThanOrEqual(openRouterPolicy.ledgerFrameBytes)
    const second = first.nextCursor ? ledger.list({ limit: 100, cursor: first.nextCursor }) : { calls: [] }
    expect(new Set([...first.calls, ...second.calls].map(call => call.intent.id)).size).toBe(60)
    await expect(async () => ledger.list({ limit: 10, cursor: 'missing' })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(() => parseOpenRouterCallPage({ calls: Array(100).fill(first.calls[0]), nextCursor: null })).toThrow()
  })
})
