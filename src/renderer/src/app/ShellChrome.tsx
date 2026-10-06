import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Icon } from '../components/Icon'
import type { ApplicationMenu } from '../../../shared/application-menu'
import { macPlatform } from './navigation/commands'

export function ShellChrome({ back, forward, pending, sidebarVisible, toggleRef, onBack, onForward, onToggle }: {
  back: boolean; forward: boolean; pending: boolean; sidebarVisible: boolean; toggleRef: RefObject<HTMLButtonElement | null>;
  onBack(): void; onForward(): void; onToggle(): void
}) {
  const mac = macPlatform()
  const [opened, setOpened] = useState<ApplicationMenu | null>(null)
  const popupPending = useRef(false)
  const composition = useRef(false)
  const menuEntryFocus = useRef<HTMLElement | null>(null)
  const strip = useRef<HTMLElement>(null)
  const buttons = useRef(new Map<ApplicationMenu, HTMLButtonElement>())
  const show = async (menu: ApplicationMenu, keyboard = false) => {
    if (popupPending.current || composition.current || document.querySelector('dialog[open]')) return
    const trigger = buttons.current.get(menu)
    if (!trigger) return
    const editingSurface = keyboard ? menuEntryFocus.current : null
    const bounds = trigger.getBoundingClientRect()
    // Native editing roles act on the focused surface, even when keyboard
    // entry temporarily moved DOM focus to a top-level menu label.
    if (editingSurface?.isConnected) editingSurface.focus({ preventScroll: true })
    popupPending.current = true; setOpened(menu)
    try { await window.learning.showApplicationMenu({ menu, anchor: { x: bounds.left, y: bounds.bottom } }) }
    finally {
      popupPending.current = false; setOpened(null)
      if (keyboard && !document.querySelector('dialog[open]') && (document.activeElement === trigger || document.activeElement === editingSurface || document.activeElement === document.body)) trigger.focus({ preventScroll: true })
    }
  }
  useEffect(() => {
    const entry = (event: KeyboardEvent) => {
      if (mac || event.isComposing || composition.current || document.querySelector('dialog[open]')) return
      if (event.key === 'F10' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey || event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && ['f', 'e', 'v', 'h'].includes(event.key.toLowerCase())) {
        event.preventDefault()
        if (!document.activeElement?.closest('.application-menu-labels')) menuEntryFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        const compact = buttons.current.get('compact')
        const menu: ApplicationMenu = compact && compact.getClientRects().length ? 'compact' : ({ f: 'file', e: 'edit', v: 'view', h: 'help' } as const)[event.key.toLowerCase() as 'f'] ?? 'file'
        buttons.current.get(menu)?.focus()
      }
    }
    window.addEventListener('keydown', entry)
    const start = () => { composition.current = true }, end = () => { composition.current = false }
    window.addEventListener('compositionstart', start); window.addEventListener('compositionend', end)
    return () => { window.removeEventListener('keydown', entry); window.removeEventListener('compositionstart', start); window.removeEventListener('compositionend', end) }
  }, [mac])
  return <header ref={strip} className={'application-strip' + (mac ? ' mac-title-strip' : '')} aria-label="Application navigation">
    <button className="icon-button" aria-label="Back" title={`Back (${mac ? '⌘+[' : 'Alt+Left'})`} disabled={!back || pending} onClick={onBack}><Icon name="back" size={18} /></button>
    <button className="icon-button" aria-label="Forward" title={`Forward (${mac ? '⌘+]' : 'Alt+Right'})`} disabled={!forward || pending} onClick={onForward}><Icon name="arrow" size={18} /></button>
    <button ref={toggleRef} className="icon-button" aria-label={sidebarVisible ? 'Hide navigation' : 'Show navigation'} title="Toggle navigation (⌘/Ctrl+B)" aria-expanded={sidebarVisible} onClick={onToggle}><Icon name="panel" size={18} /></button>
    {!mac && <nav className="application-menu-labels" aria-label="Application menus">{(['file', 'edit', 'view', 'help', 'compact'] as const).map(menu => <button key={menu}
      ref={element => { if (element) buttons.current.set(menu, element); else buttons.current.delete(menu) }} className={'application-menu-label ' + (menu === 'compact' ? 'compact-menu' : 'full-menu')}
      aria-haspopup="menu" aria-expanded={opened === menu} onMouseDown={event => event.preventDefault()}
      onClick={event => void show(menu, event.detail === 0)} onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); const previous = menuEntryFocus.current; menuEntryFocus.current = null; (previous?.isConnected ? previous : toggleRef.current)?.focus({ preventScroll: true }); return }
        if (event.key === 'ArrowDown') { event.preventDefault(); void show(menu, true); return }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault()
          const visible = Array.from(buttons.current.values()).filter(button => button.getClientRects().length)
          const index = visible.indexOf(event.currentTarget)
          visible[(index + (event.key === 'ArrowRight' ? 1 : visible.length - 1)) % visible.length]?.focus()
        }
      }}>{menu === 'compact' ? 'Menu' : menu.charAt(0).toUpperCase() + menu.slice(1)}</button>)}</nav>}
    <div className="title-drag-space" aria-hidden="true" />
  </header>
}
