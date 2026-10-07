import { describe, expect, it } from 'vitest'
import { openRouterImageModels, parseImageCostEstimate, parseImageGenerationSettings, parseListOpenRouterCalls, parseOpenRouterCall, parseOpenRouterCallIntent, parseOpenRouterImageModel, parseOpenRouterModelMetadata, parseReportedCallCost, parseSaveOpenRouterKey, parseUsdDecimal } from '../../src/shared/openrouter'
const at = '2026-10-07T14:00:00.000Z'
const intent = { schemaVersion: 1, id: 'call', startedAt: at, connectionEpoch: 'epoch', endpoint: 'images', purpose: 'chapter-image', operationId: 'operation', runId: 'run', context: { projectId: 'portable-project', topicId: 'topic', projectName: 'Economics', topicTitle: 'Inflation' }, modelId: 'openai/gpt-image-2', estimate: { kind: 'unknown', reason: 'No supported pricing metadata' } }
const transition = { schemaVersion: 1, callId: 'call', sequence: 1, recordedAt: at, status: 'succeeded', httpStatus: 200, errorCode: null, generationId: null, returnedModelId: null, cost: { kind: 'unknown' }, disposition: 'discarded' }
describe('safe provider and ledger contracts', () => {
  it('permits exactly the fixed image catalog with no automatic parameter invention', () => {
    for (const model of openRouterImageModels) expect(parseOpenRouterImageModel(model.id)).toBe(model.id)
    expect(() => parseOpenRouterImageModel('openai/gpt-other')).toThrow()
    expect(parseImageGenerationSettings({ n: 1, aspectRatio: '1:1' })).toEqual({ n: 1, aspectRatio: '1:1' })
    expect(() => parseImageGenerationSettings({ n: 1, aspectRatio: '1:1', endpoint: 'arbitrary' })).toThrow()
    expect(() => parseImageGenerationSettings({ n: 2, aspectRatio: '1:1' })).toThrow()
  })
  it('preserves decimal precision and separates unknown from known zero', () => {
    expect(parseUsdDecimal('0.000000000000000001')).toBe('0.000000000000000001')
    for (const amount of [0.1, '-1', '1e-9', 'NaN', '01.2', '0.0000000000000000001']) expect(() => parseUsdDecimal(amount)).toThrow()
    expect(parseReportedCallCost({ kind: 'unknown' })).toEqual({ kind: 'unknown' })
    expect(parseReportedCallCost({ kind: 'known', usd: '0', source: 'non-inference-contract', recordedAt: at }).kind).toBe('known')
    const estimate = { kind: 'range', minimumUsd: '0.100000000000000001', maximumUsd: '0.100000000000000002', approximate: true, imageCount: 1, modelId: 'openai/gpt-image-2', checkedAt: at, basis: 'Compatible endpoint prices', stale: false }
    expect(parseImageCostEstimate(estimate)).toEqual(estimate)
    expect(() => parseImageCostEstimate({ ...estimate, minimumUsd: estimate.maximumUsd, maximumUsd: estimate.minimumUsd })).toThrow()
    expect(() => parseImageCostEstimate({ ...estimate, kind: 'fixed' })).toThrow()
  })
  it('retains endpoint billable unit and variant semantics without accepting upstream URLs', () => {
    const metadata = { modelId: 'openai/gpt-image-2', availability: 'available', reason: null, checkedAt: at, endpoints: [{ id: 'endpoint', settings: { n: 1, aspectRatio: '1:1' }, lines: [{ billable: 'output', unit: 'megapixel', usd: '0.04', quantity: 1, variant: '1K' }] }] }
    expect(parseOpenRouterModelMetadata(metadata)).toEqual(metadata)
    expect(() => parseOpenRouterModelMetadata({ ...metadata, endpoints: [{ ...metadata.endpoints[0], url: 'https://evil.test' }] })).toThrow()
  })
  it('binds request classes and paid call context while retaining discarded-image costs', () => {
    expect(parseOpenRouterCallIntent(intent)).toEqual(intent)
    expect(parseOpenRouterCall({ intent, latest: transition }).latest?.cost).toEqual({ kind: 'unknown' })
    const known = { ...transition, cost: { kind: 'known', usd: '0.125', source: 'response', recordedAt: at } }
    expect(parseOpenRouterCall({ intent, latest: known }).latest?.disposition).toBe('discarded')
    for (const patch of [{ purpose: 'key-validation' }, { operationId: null }, { context: null }, { key: 'secret' }, { prompt: 'private' }, { endpoint: 'chat' }]) expect(() => parseOpenRouterCallIntent({ ...intent, ...patch })).toThrow()
    expect(() => parseOpenRouterCall({ intent, latest: { ...transition, callId: 'other' } })).toThrow()
    expect(() => parseOpenRouterCall({ intent, latest: { ...transition, generationId: 'https://evil.test' } })).toThrow()
    expect(() => parseOpenRouterCall({ intent, latest: { ...transition, generationId: 'gen-invalid_underscore' } })).toThrow()
    expect(parseOpenRouterCall({ intent, latest: { ...transition, generationId: 'gen-' + 'a'.repeat(120) } }).latest?.generationId).toHaveLength(124)
  })
  it('bounds history and one-way key input and never accepts privileged filters', () => {
    expect(parseListOpenRouterCalls({})).toEqual({ limit: 50 })
    for (const request of [{ limit: 101 }, { cursor: '../history' }, { from: '2026-10-08', to: '2026-10-07' }, { modelId: 'other' }, { key: 'secret' }]) expect(() => parseListOpenRouterCalls(request)).toThrow()
    expect(parseSaveOpenRouterKey({ key: '  sk-example  ' })).toEqual({ key: 'sk-example' })
    expect(() => parseSaveOpenRouterKey({ key: 'key with spaces' })).toThrow()
    expect(() => parseSaveOpenRouterKey({ key: 'x'.repeat(1025) })).toThrow()
  })
})
