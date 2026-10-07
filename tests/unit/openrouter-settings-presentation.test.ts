import { describe, expect, it } from 'vitest'
import { estimateLabel, routerRecovery, SettingsRequestScope, usd, utcDateBounds } from '../../src/renderer/src/features/settings/openrouter-presentation'

describe('provider settings presentation boundaries', () => {
  it('preserves exact decimal precision and distinguishes unknown estimates from known zero', () => {
    expect(usd('0.123456789123456789')).toBe('$0.123456789123456789')
    expect(usd('10000000000000000000.000000000000000001')).toBe('$10,000,000,000,000,000,000.000000000000000001')
    expect(usd('0')).toBe('$0.00')
    expect(estimateLabel({ kind: 'unknown', reason: 'Unknown units' })).toBe('Estimate unavailable')
    expect(estimateLabel({ kind: 'fixed', minimumUsd: '0', maximumUsd: '0', approximate: true, imageCount: 1, modelId: 'openai/gpt-image-2', checkedAt: '2026-10-07T00:00:00.000Z', basis: 'Fixture', stale: true })).toBe('$0.00 USD estimated')
  })
  it('uses inclusive UTC day bounds and distinct safe recovery categories', () => {
    expect(utcDateBounds('2026-10-07', '2026-10-08')).toEqual({ from: '2026-10-07T00:00:00.000Z', to: '2026-10-08T23:59:59.999Z' })
    expect(utcDateBounds('', '')).toEqual({})
    const messages = ['BUSY', 'AUTH_REQUIRED', 'ACCESS_RESTRICTED', 'USAGE_LIMIT', 'NETWORK', 'STORAGE'].map(code => routerRecovery(code as Parameters<typeof routerRecovery>[0]))
    expect(new Set(messages).size).toBe(messages.length)
  })
  it('denies late replies across close/reopen and superseded quote/history requests', () => {
    const scope = new SettingsRequestScope(), first = scope.begin(), acknowledgement = scope.request('mutation'), oldQuote = scope.request('quote')
    const newQuote = scope.request('quote'); expect(scope.accepts(oldQuote)).toBe(false); expect(scope.accepts(newQuote)).toBe(true)
    scope.close(); scope.begin(); expect(scope.current(first)).toBe(false); expect(scope.accepts(acknowledgement)).toBe(false)
    const newDraftSave = scope.request('mutation'); expect(scope.accepts(newDraftSave)).toBe(true)
    const history = scope.request('history'); scope.request('history'); expect(scope.accepts(history)).toBe(false)
  })
})
