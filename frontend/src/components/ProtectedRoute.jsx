import { Navigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

// Role → default landing page
const ROLE_HOME = {
  staff:      '/mar',
  supervisor: '/mar',
  manager:    '/dashboard',
  readonly:   '/mar',
}

/**
 * Wraps a route requiring authentication.
 * Optionally restrict to specific roles.
 *
 * @param {string[]} [roles] - If provided, only these roles can access
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, session, loading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)
  const timerRef = useRef(null)

  const isLoading = loading || (session && !user)

  useEffect(() => {
    if (!isLoading) {
      clearTimeout(timerRef.current)
      setTimedOut(false)
      return
    }
    // If still loading after 6 s, give up and let the route resolve.
    // The `!user` check below will redirect unauthenticated visitors to /login.
    timerRef.current = setTimeout(() => setTimedOut(true), 6_000)
    return () => clearTimeout(timerRef.current)
  }, [isLoading])

  if (isLoading && !timedOut) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-teal text-lg font-semibold animate-pulse">Loading…</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.role)) {
    // Redirect to their appropriate home rather than a blank 403
    return <Navigate to={ROLE_HOME[user.role] || '/mar'} replace />
  }

  return children
}

export { ROLE_HOME }
