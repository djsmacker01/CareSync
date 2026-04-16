import { Navigate } from 'react-router-dom'
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

  if (loading || (session && !user)) {
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
