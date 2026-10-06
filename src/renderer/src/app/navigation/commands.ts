export const macPlatform = () => /Mac/i.test(navigator.platform)
export type LocalCommand = 'open-project' | 'go-back' | 'go-forward' | 'toggle-sidebar' | 'show-appearance'
export function keyboardCommand(event: { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; isComposing: boolean }, mac: boolean, editing: boolean): LocalCommand | null {
  if (event.isComposing || event.shiftKey) return null
  if (!editing && (mac ? event.metaKey && !event.ctrlKey && !event.altKey : event.altKey && !event.metaKey && !event.ctrlKey)) {
    if (event.key === (mac ? '[' : 'ArrowLeft')) return 'go-back'
    if (event.key === (mac ? ']' : 'ArrowRight')) return 'go-forward'
  }
  if (!(mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey) || event.altKey) return null
  if (event.key === ',') return 'show-appearance'
  if (event.key.toLowerCase() === 'o') return 'open-project'
  if (!editing && event.key.toLowerCase() === 'b') return 'toggle-sidebar'
  return null
}
