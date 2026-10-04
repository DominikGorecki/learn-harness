import { useEffect, useRef } from 'react'
import type { AccountController } from './useAccount'
import './account.css'

export function AccountPanel({ open, onClose, account, locked = false }: { open: boolean; onClose(): void; account: AccountController; locked?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { snapshot, busy, error, run } = account
  const status = snapshot?.status ?? 'disconnected'
  const connecting = status === 'connecting'
  const connected = status === 'connected'
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current?.close()
  }, [open])

  return <dialog ref={dialog} className="account-dialog" aria-labelledby="account-heading"
    onCancel={event => { event.preventDefault(); onClose() }} onClose={onClose}>
    <header className="account-dialog-header"><span className="account-kicker">Your account</span>
      <button className="account-close" aria-label="Close account settings" onClick={onClose}>×</button></header>
    <div className="account-emblem" aria-hidden="true">✳</div>
    <h2 id="account-heading">{connected ? 'Connected to ChatGPT' : connecting ? 'Continue in your browser' : 'Connect with ChatGPT'}</h2>
    <p className="account-description">Use your included ChatGPT plan to explore subjects and build learning outlines.</p>
    {snapshot?.name && <div className="account-identity"><span className="account-avatar" aria-hidden="true">{snapshot.name.charAt(0).toUpperCase()}</span>
      <div><strong>{snapshot.name}</strong>{snapshot.email && snapshot.email !== snapshot.name && <span>{snapshot.email}</span>}</div>
      <span className={`account-indicator ${connected ? 'is-connected' : ''}`}>{connected ? 'Connected' : 'Signed in'}</span>
    </div>}
    {snapshot?.message && <p className="account-feedback" role="status">{snapshot.message}</p>}
    {error && <p className="account-feedback is-error" role="alert">{error}</p>}
    {locked && <p className="account-feedback" role="status">Finish or cancel your outline before changing this connection.</p>}
    {connected && <p className="account-model-count" role="status">{snapshot?.modelsStatus === 'loading' ? 'Finding your available models…' :
      snapshot?.modelsStatus === 'ready' ? `${snapshot.models.length} ${snapshot.models.length === 1 ? 'model' : 'models'} available for your projects` : 'Model availability needs a refresh.'}</p>}
    <div className="account-actions">
      {connecting ? <>
        {snapshot?.canReopenBrowser && <button className="account-primary" disabled={busy} onClick={() => void run(api => api.reopenAccountBrowser())}>Open browser</button>}
        <button className="account-secondary" disabled={busy} onClick={() => void run(api => api.cancelAccountConnection())}>Cancel sign-in</button>
      </> : connected ? <>
        <button className="account-primary" onClick={onClose}>Done</button>
        <button className="account-secondary" disabled={busy} onClick={() => void run(api => api.refreshModels())}>Refresh models</button>
      </> : <><button className="account-primary" disabled={busy || !snapshot || locked} onClick={() => void run(api => api.connectAccount())}>
        {busy ? 'Connecting…' : status === 'permission-required' ? 'Enable ChatGPT plan usage' : status === 'reconnect-required' ? 'Reconnect ChatGPT' : 'Continue with ChatGPT'}
      </button>{snapshot?.name && ['usage-limited', 'restricted'].includes(status) && <button className="account-secondary" disabled={busy || locked} onClick={() => void run(api => api.refreshModels())}>Check availability</button>}</>}
    </div>
    <p className="account-footnote">AI activity counts toward your existing plan limits. Your ChatGPT conversations and memories stay private.</p>
    {snapshot?.persistence === 'session' && <p className="account-footnote">Protected storage is unavailable on this device. Your connection lasts until you quit the app.</p>}
    <details className="account-shortcuts"><summary>Keyboard shortcuts</summary><dl><dt>Open project</dt><dd>⌘ / Ctrl + O</dd><dt>Toggle navigation</dt><dd>⌘ / Ctrl + B</dd><dt>Create outline</dt><dd>⌘ / Ctrl + Enter</dd></dl></details>
    {snapshot?.name && !connecting && <button className="account-signout" disabled={busy || locked} onClick={() => void run(api => api.disconnectAccount())}>Sign out of this app</button>}
  </dialog>
}
