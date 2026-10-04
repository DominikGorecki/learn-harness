import { describe, expect, it } from 'vitest'
import { appOrigin, developmentOrigin, isTrustedFrame, rendererAsset } from '../../src/main/security/policy'

describe('frame trust', () => {
  it('accepts the app entry and configured dev origin', () => {
    expect(isTrustedFrame({ origin: appOrigin, url: `${appOrigin}/index.html` }, appOrigin)).toBe(true)
    expect(isTrustedFrame({ origin: developmentOrigin, url: `${developmentOrigin}/` }, developmentOrigin)).toBe(true)
  })

  it.each([
    null,
    { origin: 'https://example.com', url: `${appOrigin}/index.html` },
    { origin: appOrigin, url: 'about:blank' },
    { origin: appOrigin, url: 'file:///tmp/index.html' },
    { origin: appOrigin, url: `${appOrigin}/assets/index.html` },
    { origin: appOrigin, url: 'learningapp://workspace.evil/index.html' },
    { origin: appOrigin, url: 'learningapp://user:pass@workspace/index.html' }
  ])('rejects untrusted or non-entry frames %#', frame => {
    expect(isTrustedFrame(frame, appOrigin)).toBe(false)
  })

  it('does not permit a dev origin in production', () => {
    expect(isTrustedFrame({ origin: developmentOrigin, url: `${developmentOrigin}/` }, appOrigin)).toBe(false)
  })
})

describe('asset protocol', () => {
  it('allows only renderer entry and flat bundled assets', () => {
    expect(rendererAsset(`${appOrigin}/index.html`)).toBe('index.html')
    expect(rendererAsset(`${appOrigin}/assets/index-a23.js`)).toBe('assets/index-a23.js')
    expect(rendererAsset(`${appOrigin}/assets/index-a23.css`)).toBe('assets/index-a23.css')
  })

  it.each([
    'file:///etc/passwd', 'learningapp://evil/index.html', 'learningapp://workspace/etc/passwd',
    'learningapp://workspace/assets/%2e%2e%2fsecret.js', 'learningapp://workspace/assets/..%5csecret.js',
    'learningapp://workspace/assets/.env', 'learningapp://workspace/assets/config.json',
    'learningapp://workspace/assets/nested/index.js', 'learningapp://workspace/%zz',
    'learningapp://user:pass@workspace/index.html'
  ])('refuses non-assets and traversal %#', url => { expect(rendererAsset(url)).toBeUndefined() })
})
