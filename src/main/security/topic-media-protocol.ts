import type { BrowserWindow, Session } from 'electron'
import { parseTopicMediaUrl } from '../../shared/topic-content-media'
import type { TopicMediaIdentity } from '../../shared/topic-content-media'
import { isTrustedFrame } from './policy'

/** One session listener owns the custom-scheme gate. Neither referrers nor public URL data confer authority. */
export function registerTopicMediaProtocol(session: Session, currentWindow: () => BrowserWindow | null, origin: string,
  resolve: (identity: TopicMediaIdentity) => Promise<{ bytes: Uint8Array; mime: string }>): void {
  const authorized = new Map<number, { url: string; expires: number }>()
  const prune = () => { for (const [id, entry] of authorized) if (entry.expires < Date.now()) authorized.delete(id) }
  session.webRequest.onCompleted(details => { authorized.delete(details.id) })
  session.webRequest.onErrorOccurred(details => { authorized.delete(details.id) })
  session.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
    if (!details.url.startsWith('learningmedia:')) { callback({}); return }
    prune()
    const window = currentWindow(), frame = details.frame
    let valid = false
    try {
      parseTopicMediaUrl(details.url)
      valid = Boolean(window && !window.isDestroyed() && !window.webContents.isDestroyed() && details.webContentsId === window.webContents.id &&
        frame && frame.processId === window.webContents.mainFrame.processId && frame.routingId === window.webContents.mainFrame.routingId &&
        isTrustedFrame(frame, origin) && details.initiatorOrigin === origin && details.method === 'GET' && details.resourceType === 'image')
    } catch { /* Canonical URI and owning frame are required. */ }
    if (valid && authorized.size >= 128) valid = false
    if (valid) authorized.set(details.id, { url: details.url, expires: Date.now() + 30_000 })
    callback({ cancel: !valid })
  })
  session.protocol.handle('learningmedia', async request => {
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
    prune()
    const authorization = [...authorized].find(([, entry]) => entry.url === request.url)
    if (authorization) authorized.delete(authorization[0])
    const window = currentWindow()
    if (!authorization || request.method !== 'GET' || (request as Request & { initiatorOrigin?: unknown }).initiatorOrigin !== origin || !window || window.isDestroyed() || window.webContents.isDestroyed()) return new Response(null, { status: 403, headers })
    try {
      const identity = parseTopicMediaUrl(request.url), media = await resolve(identity)
      if (currentWindow() !== window || window.isDestroyed() || window.webContents.isDestroyed() || !isTrustedFrame(window.webContents.mainFrame, origin)) return new Response(null, { status: 403, headers })
      return new Response(new Uint8Array(media.bytes), { status: 200, headers: { ...headers, 'Content-Type': media.mime } })
    } catch { return new Response(null, { status: 404, headers }) }
  })
}
