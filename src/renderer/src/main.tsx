import './lib/diagnostics'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './styles.css'
import { initializeAppearance } from './features/settings/appearance'

initializeAppearance()
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
