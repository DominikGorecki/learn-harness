import { chatgptEndpoints } from './chatgpt-provider'
import type { ChatGPTEndpoints } from './chatgpt-provider'

/** Local protocol fixtures are possible only in unpackaged, isolated automation profiles. */
export function providerEnvironment(options: { packaged: boolean; testProfile?: string; fixtureOrigin?: string }): ChatGPTEndpoints {
  if (options.packaged || !options.testProfile || !options.fixtureOrigin) return chatgptEndpoints
  const origin = new URL(options.fixtureOrigin)
  if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1' || !origin.port || origin.username || origin.password ||
      origin.pathname !== '/' || origin.search || origin.hash) throw new Error('The automation provider must be a local loopback origin.')
  return {
    issuer: origin.origin, authorize: `${origin.origin}/authorize`, token: `${origin.origin}/token`, revoke: `${origin.origin}/revoke`,
    jwks: `${origin.origin}/.well-known/jwks.json`, models: `${origin.origin}/models`, resource: `${origin.origin}/v1`
  }
}
