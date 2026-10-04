import { useState } from 'react'

export type Appearance = 'light' | 'dark'
const preferenceKey = 'learning-studio.appearance'

function preferredAppearance(): Appearance {
  try {
    const saved = localStorage.getItem(preferenceKey)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* Appearance still works for this session if storage is unavailable. */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function initializeAppearance(): void {
  document.documentElement.dataset.theme = preferredAppearance()
}

export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(preferredAppearance)
  const [persistent, setPersistent] = useState(true)
  const chooseAppearance = (value: Appearance) => {
    document.documentElement.dataset.theme = value
    setAppearance(value)
    try { localStorage.setItem(preferenceKey, value); setPersistent(true) }
    catch { setPersistent(false) }
  }
  return { appearance, chooseAppearance, persistent }
}
