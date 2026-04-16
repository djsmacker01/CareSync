import { Component } from 'react'
import * as Sentry from '@sentry/react'
import { AlertTriangle } from 'lucide-react'

/**
 * Top-level error boundary.
 * Catches unhandled React render errors, reports them to Sentry,
 * and shows a user-friendly fallback instead of a blank white page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, eventId: null }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    const eventId = Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    })
    this.setState({ eventId })
  }

  handleReload() {
    window.location.href = '/login'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-4 text-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full space-y-5">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Something went wrong</h1>
            <p className="text-sm text-gray-500 mt-2">
              An unexpected error occurred. Your work is safe — please reload and try again.
              If this keeps happening, contact your manager.
            </p>
          </div>

          {this.state.eventId && (
            <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-xl px-3 py-2">
              Error ID: {this.state.eventId}
            </p>
          )}

          <button
            onClick={this.handleReload}
            className="w-full min-h-[52px] rounded-xl bg-teal text-white font-bold text-sm hover:bg-teal/90 transition-colors"
          >
            Return to login
          </button>
        </div>
      </div>
    )
  }
}
