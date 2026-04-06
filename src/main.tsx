import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

function mount() {
  const el = document.getElementById('root')
  if (!el) {
    // SW 快取舊版頁面或 DOM 尚未就緒 — 延遲重試
    requestAnimationFrame(mount)
    return
  }
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}
