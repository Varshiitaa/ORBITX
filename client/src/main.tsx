import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import App from './App'
import './index.css'
import { useMissionStore } from './store/missionStore'

const root = document.getElementById('root')
if (!root) throw new Error('ORBITX could not find its root element.')

if (!window.__orbitxTicker) {
  window.__orbitxTicker = window.setInterval(() => {
    useMissionStore.getState().tick(0.25)
  }, 250)
}

if (import.meta.env.DEV) {
  window.__ORBITX__ = useMissionStore as unknown as Window['__ORBITX__']
}

window.setTimeout(() => {
  if (!useMissionStore.getState().hydrated) useMissionStore.setState({ hydrated: true })
}, 1500)

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
