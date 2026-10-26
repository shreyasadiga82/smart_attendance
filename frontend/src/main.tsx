import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ThemeProvider } from './hooks/useTheme'
import { WebSocketProvider } from './lib/ws'

// Clear any stale service workers and old cache from previous development builds
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister().catch(() => {})
    }
  }).catch(() => {})
}
if ('caches' in window) {
  caches.keys().then(names => {
    for (const name of names) {
      caches.delete(name).catch(() => {})
    }
  }).catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <WebSocketProvider>
            <App />
          </WebSocketProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)