import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Initialise Sentry only when a DSN is provided (skipped in local dev by default)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn:              import.meta.env.VITE_SENTRY_DSN,
    environment:      import.meta.env.MODE,
    release:          import.meta.env.VITE_APP_VERSION || 'unknown',
    tracesSampleRate: 0.1,   // capture 10 % of transactions for performance
    integrations:     [Sentry.browserTracingIntegration()],
  })
}

// StrictMode intentionally double-invokes effects in development, which causes
// two simultaneous onAuthStateChange subscriptions that race for the Supabase
// navigator lock. Omitting it here has zero effect on the production build.
createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
