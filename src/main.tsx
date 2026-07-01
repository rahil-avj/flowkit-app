// Polyfill for crypto.randomUUID in non-secure contexts (HTTP on mobile)
if (typeof crypto.randomUUID !== 'function') {
  crypto.randomUUID = function () {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => {
      const n = parseInt(c)
      return (n ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(16)
    }) as `${string}-${string}-${string}-${string}-${string}`
  }
}

import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
