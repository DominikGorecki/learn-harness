import { net } from 'electron'
import type { Session } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { productionCsp, rendererAsset } from './policy'

export function registerRendererProtocol(session: Session, rendererDirectory: string): void {
  session.protocol.handle('learningapp', async request => {
    const asset = rendererAsset(request.url)
    if (request.method !== 'GET' || !asset) return new Response('Not found', { status: 404 })
    try {
      const response = await net.fetch(pathToFileURL(join(rendererDirectory, asset)).href)
      const headers = new Headers(response.headers)
      headers.set('Content-Security-Policy', productionCsp)
      headers.set('X-Content-Type-Options', 'nosniff')
      return new Response(response.body, { status: response.status, headers })
    } catch { return new Response('Not found', { status: 404 }) }
  })
}
