import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import type { Appearance } from './appearance'
import { useOpenRouter } from './useOpenRouter'
import { OpenRouterPanel } from './OpenRouterPanel'
import './settings.css'

export function SettingsPanel({ open, onClose, appearance, onAppearance, persistent }: {
  open: boolean; onClose(): void; appearance: Appearance; onAppearance(value: Appearance): void; persistent: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [category, setCategory] = useState<'openrouter' | 'appearance'>('openrouter')
  const [keyDraft, setKeyDraft] = useState('')
  const router = useOpenRouter(open)
  const close = () => { router.close(); setKeyDraft(''); onClose() }
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current.close()
  }, [open])

  return <dialog ref={dialog} className="settings-dialog" aria-labelledby="settings-heading"
    onCancel={event => { event.preventDefault(); close() }} onClose={() => { if (!open && !dialog.current?.open) close() }}>
    <header className="settings-header"><h2 id="settings-heading">Settings</h2>
      <button className="icon-button" aria-label="Close settings" onClick={close}><Icon name="close" /></button></header>
    <div className="settings-layout"><nav className="settings-categories" aria-label="Settings categories">
      <button type="button" aria-current={category === 'openrouter' ? 'page' : undefined} onClick={() => setCategory('openrouter')}><Icon name="settings" size={18} />OpenRouter</button>
      <button type="button" aria-current={category === 'appearance' ? 'page' : undefined} onClick={() => setCategory('appearance')}><Icon name="sun" size={18} />Appearance</button>
    </nav><div className="settings-content">
      <div hidden={category !== 'openrouter'}><div className="settings-title"><h3>OpenRouter</h3></div><OpenRouterPanel router={router} active={open && category === 'openrouter'} keyDraft={keyDraft} onKeyDraft={setKeyDraft} onSaved={() => setKeyDraft('')} /></div>
      <div hidden={category !== 'appearance'}>
      <div className="settings-title"><Icon name="sun" size={22} /><h3>Appearance</h3></div>
      <p className="settings-description">Choose a comfortable space to learn.</p>
      <fieldset className="appearance-group"><legend>Mode</legend>
        <div className="appearance-options">
          {(['light', 'dark'] as const).map(mode => <label key={mode} className="appearance-option">
            <input type="radio" name="appearance" value={mode} checked={appearance === mode} onChange={() => onAppearance(mode)} />
            <span className={`appearance-preview preview-${mode}`} aria-hidden="true">
              <span className="preview-rail"><i /><i /><i /></span><span className="preview-sidebar"><i /><i /><i /></span>
              <span className="preview-workspace"><span className="preview-title" /><span className="preview-line" /><span className="preview-composer"><i /><b /></span></span>
            </span>
            <span className="appearance-label"><Icon name={mode === 'light' ? 'sun' : 'moon'} size={17} />{mode === 'light' ? 'Light' : 'Dark'}
              <span className="appearance-check" aria-hidden="true">{appearance === mode && <Icon name="check" size={14} />}</span></span>
          </label>)}
        </div>
      </fieldset>
      <p className="settings-note" role="status">{persistent ? 'Changes are saved on this device and apply to every project.' : 'Your choice applies for this session. This device could not save the preference.'}</p>
    </div></div></div>
    <footer className="settings-footer"><button className="button primary" onClick={close}>Done</button></footer>
  </dialog>
}
