import { createServer } from 'node:http'
import type { ServerResponse } from 'node:http'
import { routerCatalog, routerEndpoint, routerKey } from './openrouter'

/** Ordinary-key metadata HTTP fixture; provider strings intentionally include unsafe data. */
export async function startSettingsFixture() {
  const requests: { path: string; authorization: string | undefined }[] = []
  let held: ServerResponse | null = null, heldOnce = false, failDiscovery = false, omitSelected = false
  let exhaustedAllowance = false
  let generationMode: 'matching' | 'unsupported' | 'mismatch' | 'failed' = 'matching'
  const server = createServer((request, response) => {
    requests.push({ path: request.url!, authorization: request.headers.authorization })
    response.setHeader('Content-Type', 'application/json')
    if (request.url?.startsWith('/api/v1/generation?')) {
      if (generationMode === 'failed') { response.statusCode = 503; response.end('{}'); return }
      response.end(generationMode === 'unsupported' ? '{}' : `{"data":{"id":"${generationMode === 'matching' ? 'gen-known' : 'gen-other'}","model":"openai/gpt-image-2","total_cost":0.123456789123456789}}`); return
    }

    if (request.headers.authorization === 'Bearer invalid-fixture-key') { response.statusCode = 401; response.end(JSON.stringify({ error: 'sk-or-unsafe-error https://private.invalid/path' })); return }
    if (request.url === '/api/v1/key' && request.headers.authorization === 'Bearer held-fixture-key' && !heldOnce) { held = response; heldOnce = true; return }
    if (request.url === '/api/v1/images/models' && failDiscovery) { response.statusCode = 503; response.end(JSON.stringify({ error: 'sk-or-unsafe-error' })); return }
    const catalog = omitSelected ? { data: routerCatalog.data.filter(model => model.id !== 'bytedance-seed/seedream-5-0-pro') } : routerCatalog
    const result = request.url === '/api/v1/key' ? { data: { ...routerKey.data, ...(exhaustedAllowance ? { limit_remaining: '0' } : {}) } } : request.url === '/api/v1/images/models' ? catalog : routerEndpoint(request.url!.slice('/api/v1/images/models/'.length, -'/endpoints'.length))
    response.end(JSON.stringify(result))
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  return { baseUrl: `http://127.0.0.1:${(server.address() as { port: number }).port}/api/v1`, requests,
    exhaustAllowance(value: boolean) { exhaustedAllowance = value },
    generation(value: typeof generationMode) { generationMode = value },
    get held() { return Boolean(held) },
    release() { held?.end(JSON.stringify(routerKey)); held = null },
    failDiscovery(value: boolean) { failDiscovery = value }, omitSelected(value: boolean) { omitSelected = value },
    async close() { held?.destroy(); server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
  }
}
