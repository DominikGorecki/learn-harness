import { createServer } from 'node:http'
import type { ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { ApplicationError } from '../../shared/contracts'

export interface AuthorizationCallback { code: string; clientId: string }

function respond(response: ServerResponse, status: number, message: string): void {
  response.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"
  })
  response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Learning Studio</title><style>body{font:16px/1.6 system-ui;color:#171717;margin:12vh auto;padding:32px;max-width:540px}h1{font-size:26px}p{color:#626262}</style><h1>Learning Studio</h1><p>${message}</p></html>`)
}

export async function createLoopback(options: { state: string; clientId?: string; signal: AbortSignal; timeoutMs?: number }) {
  options.signal.throwIfAborted()
  let resolve!: (value: AuthorizationCallback) => void
  let reject!: (error: Error) => void
  const result = new Promise<AuthorizationCallback>((yes, no) => { resolve = yes; reject = no })
  // The browser may fail before the caller starts awaiting the callback.
  void result.catch(() => {})
  let redirectUri = ''
  let settled = false
  const fail = (error: Error) => { if (!settled) { settled = true; reject(error) } }
  const server = createServer((request, response) => {
    if (request.method !== 'GET' || request.headers.host !== new URL(redirectUri).host) {
      respond(response, 400, 'This sign-in callback was not accepted. Return to the app and try again.'); return
    }
    const url = new URL(request.url ?? '', redirectUri)
    if (url.pathname !== '/auth/callback') { respond(response, 404, 'This page is not available.'); return }
    if (url.searchParams.get('state') !== options.state) {
      respond(response, 400, 'This sign-in request did not match. Use the browser window opened by Learning Studio.'); return
    }
    if (settled) { respond(response, 409, 'This sign-in has already finished. Return to Learning Studio.'); return }
    if (url.searchParams.has('error')) {
      respond(response, 200, 'Sign-in was cancelled. You can return to Learning Studio.')
      fail(new ApplicationError('CANCELLED', 'ChatGPT sign-in was cancelled.')); return
    }
    const code = url.searchParams.get('code')
    const returnedId = url.searchParams.get('client_id')
    const clientId = returnedId || options.clientId
    if (!code || code.length > 8192 || !clientId || clientId.length > 256 || clientId === 'dynamic_agent_client' ||
        (options.clientId && returnedId && returnedId !== options.clientId)) {
      respond(response, 400, 'The connection could not be verified. Return to Learning Studio and try again.'); return
    }
    settled = true
    respond(response, 200, 'Finishing your connection. You can return to Learning Studio and close this tab.')
    resolve({ code, clientId })
  })
  await new Promise<void>((yes, no) => {
    server.once('error', no)
    server.listen(0, '127.0.0.1', () => { server.off('error', no); yes() })
  })
  redirectUri = `http://127.0.0.1:${(server.address() as AddressInfo).port}/auth/callback`
  const abort = () => fail(new ApplicationError('CANCELLED', 'ChatGPT sign-in was cancelled.'))
  options.signal.addEventListener('abort', abort, { once: true })
  if (options.signal.aborted) abort()
  server.on('error', () => fail(new ApplicationError('NETWORK', 'The sign-in callback could not be received. Please try again.')))
  const timeout = setTimeout(() => fail(new ApplicationError('NETWORK', 'Sign-in timed out. Please try again.')), options.timeoutMs ?? 10 * 60_000)
  timeout.unref()
  return {
    redirectUri, result,
    close() {
      clearTimeout(timeout)
      options.signal.removeEventListener('abort', abort)
      fail(new ApplicationError('CANCELLED', 'ChatGPT sign-in was cancelled.'))
      server.closeAllConnections()
      server.close()
    }
  }
}
