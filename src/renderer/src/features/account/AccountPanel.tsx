import { useEffect, useRef } from 'react'
import { additionalAccountModels } from '../../../../shared/account'
import type { AccountController } from './useAccount'
import './account.css'

export function AccountPanel({ open, onClose, account, locked = false }: { open: boolean; onClose(): void; account: AccountController; locked?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { snapshot, busy, error, run, cancelModelTest } = account
  const status = snapshot?.status ?? 'disconnected'
  const connecting = status === 'connecting'
  const connected = status === 'connected'
  const testing = snapshot?.modelTestStatus === 'testing'
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
      snapshot?.modelsStatus === 'ready' ? `${snapshot.models.length} model choices for your projects` : 'Model availability needs a refresh.'}</p>}
    {snapshot?.modelTestMessage && <p className={`account-feedback ${snapshot.modelTestStatus === 'failed' ? 'is-error' : ''}`}
      role={snapshot.modelTestStatus === 'failed' ? 'alert' : 'status'}>{snapshot.modelTestMessage}</p>}
    {connected && <div>
      <p className="account-footnote">GPT-6.1 Sol and GPT-6 Luna are included as extra model choices. Check access with a short reply using a small amount of your ChatGPT plan allowance.</p>
      <div className="account-actions">{testing ? <button className="account-secondary" onClick={() => void cancelModelTest()}>Cancel model test</button> :
        additionalAccountModels.map(model => {
          const verified = snapshot?.verifiedModelIds.includes(model.id)
          return <button key={model.id} className="account-secondary" disabled={busy || locked || snapshot?.modelsStatus !== 'ready' || verified}
            onClick={() => void run(api => model.id === 'gpt-6.1-sol' ? api.testSolModel() : api.testLunaModel())}>
            {verified ? `${model.name} verified` : `Test ${model.name}`}</button>
        })}</div>
    </div>}
    <div className="account-actions">
      {connecting ? <>
        {snapshot?.canReopenBrowser && <button className="account-primary" disabled={busy} onClick={() => void run(api => api.reopenAccountBrowser())}>Open browser</button>}
        {snapshot?.canReopenBrowser && <button className="account-secondary" disabled={busy} onClick={() => void run(api => api.copyAccountSignInLink())}>Copy sign-in link</button>}
        <button className="account-secondary" disabled={busy} onClick={() => void run(api => api.cancelAccountConnection())}>Cancel sign-in</button>
      </> : connected ? <>
        <button className="account-primary" onClick={onClose}>Done</button>
        <button className="account-secondary" disabled={busy || testing} onClick={() => void run(api => api.refreshModels())}>Refresh models</button>
      </> : <><button className="account-primary" disabled={busy || !snapshot || locked} onClick={() => void run(api => api.connectAccount())}>
        {busy ? 'Connecting…' : status === 'permission-required' ? 'Enable ChatGPT plan usage' : status === 'reconnect-required' ? 'Reconnect ChatGPT' : 'Continue with ChatGPT'}
      </button>{snapshot?.name && ['usage-limited', 'restricted'].includes(status) && <button className="account-secondary" disabled={busy || locked} onClick={() => void run(api => api.refreshModels())}>Check availability</button>}</>}
    </div>
    <p className="account-footnote">AI activity counts toward your existing plan limits. Your ChatGPT conversations and memories stay private.</p>
    {snapshot?.persistence === 'local' && <p className="account-footnote">This device stores login details in the app’s private data folder. OS keychain encryption is unavailable, so the local credential file is not encrypted.</p>}
    <details className="account-shortcuts"><summary>Keyboard shortcuts</summary><dl><dt>Settings</dt><dd>⌘ / Ctrl + ,</dd><dt>Open project</dt><dd>⌘ / Ctrl + O</dd><dt>Toggle navigation</dt><dd>⌘ / Ctrl + B</dd><dt>Create outline</dt><dd>⌘ / Ctrl + Enter</dd></dl></details>
    {snapshot?.name && !connecting && <button className="account-signout" disabled={busy || locked || testing} onClick={() => void run(api => api.disconnectAccount())}>Sign out of this app</button>}
  </dialog>
}
