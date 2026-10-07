export const appOrigin = 'learningapp://workspace'
export const appEntry = `${appOrigin}/index.html`
export const developmentOrigin = 'http://127.0.0.1:5173'
export const productionCsp = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' learningmedia://topic; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
// Vite/React refresh use inline scripts/styles and a local websocket only in development.
export const developmentCsp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://127.0.0.1:5173; img-src 'self' learningmedia://topic; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"

export function isTrustedFrame(frame: { origin: string; url: string } | null, expectedOrigin: string): boolean {
  if (!frame || frame.origin !== expectedOrigin) return false
  try {
    const url = new URL(frame.url)
    return !url.username && !url.password &&
      `${url.protocol}//${url.host}` === expectedOrigin &&
      (url.pathname === '/' || url.pathname === '/index.html')
  } catch { return false }
}

export function rendererAsset(requestUrl: string): string | undefined {
  try {
    const url = new URL(requestUrl)
    if (`${url.protocol}//${url.host}` !== appOrigin || url.username || url.password) return undefined
    const pathname = decodeURIComponent(url.pathname)
    if (pathname === '/index.html') return 'index.html'
    if (/^\/assets\/[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.(js|css|svg|png|woff2)$/.test(pathname)) return pathname.slice(1)
    return undefined
  } catch { return undefined }
}
