import { createServer } from 'node:http'
import sharp from 'sharp'
import { routerCatalog, routerEndpoint, routerKey } from './openrouter'

/** Local deterministic pixels/pricing, never evidence of live model eligibility. */
export async function startImageFixture(educationalPixels?: readonly [Buffer, Buffer]) {
  const png = educationalPixels?.[0] ?? await sharp({ create: { width: 4, height: 3, channels: 4, background: '#208050' } }).png().toBuffer()
  const secondPng = educationalPixels?.[1] ?? await sharp({ create: { width: 5, height: 3, channels: 4, background: '#804020' } }).png().toBuffer()
  const requests: { path: string; body: Record<string, unknown> | null; authorization: string | undefined; startedAt: number }[] = []
  let delayMs = 0, bodyChunkMs = 0
  let alternating = false, imageIndex = 0, failureStatus: number | null = null
  let metadataFailure = false, metadataGate: Promise<void> | null = null, releaseMetadata: (() => void) | null = null
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk))
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null
    requests.push({ path: request.url!, body, authorization: request.headers.authorization, startedAt: Date.now() })
    response.setHeader('Content-Type', 'application/json')
    if (request.url !== '/api/v1/images') {
      if (request.url === '/api/v1/images/models') {
        if (metadataGate) await metadataGate
        if (metadataFailure) { response.statusCode = 503; response.end('{}'); return }
      }
      response.end(JSON.stringify(request.url === '/api/v1/key' ? routerKey : request.url === '/api/v1/images/models' ? routerCatalog : routerEndpoint(request.url!.slice('/api/v1/images/models/'.length, -'/endpoints'.length)))); return
    }
    if (failureStatus) { const status = failureStatus; failureStatus = null; response.statusCode = status; response.end(JSON.stringify({ error: 'Fixture image failure', usage: { cost: '0.045' } })); return }
    const pixels = alternating && imageIndex++ % 2 === 1 ? secondPng : png
    response.flushHeaders()
    const timer = setTimeout(() => {
      if (response.destroyed) return
      const payload = `{"data":[{"b64_json":"${pixels.toString('base64')}","media_type":"image/png"}],"usage":{"cost":0.04500000000000001}}`
      if (!bodyChunkMs) { response.end(payload); return }
      let position = 0
      const interval = setInterval(() => {
        if (position >= payload.length) { clearInterval(interval); response.end(); return }
        response.write(payload.slice(position, position + 32)); position += 32
      }, bodyChunkMs)
      response.once('close', () => clearInterval(interval))
    }, delayMs)
    response.once('close', () => clearTimeout(timer))
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as { port: number }
  return { baseUrl: `http://127.0.0.1:${address.port}/api/v1`, png, secondPng, requests,
    alternateImages() { alternating = true }, failNext(status: number) { failureStatus = status },
    failMetadata(value: boolean) { metadataFailure = value },
    holdMetadata() { metadataGate = new Promise<void>(resolve => { releaseMetadata = resolve }) },
    releaseMetadata() { releaseMetadata?.(); metadataGate = null; releaseMetadata = null },
    delay(ms: number) { delayMs = ms }, chunkEvery(ms: number) { bodyChunkMs = ms },
    async close() { releaseMetadata?.(); server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) } }
}
