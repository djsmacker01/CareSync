import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const INACTIVITY_WARN_MS  = 25 * 60 * 1000   // 25 minutes
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000   // 30 minutes
const ACTIVITY_EVENTS     = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll']

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)   // { id, full_name, role }
  const [session, setSession]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [showTimeoutWarn, setShowTimeoutWarn] = useState(false)

  const warnTimer    = useRef(null)
  const logoutTimer  = useRef(null)

  // ── Timeout management ────────────────────────────────────
  const clearTimers = useCallback(() => {
    clearTimeout(warnTimer.current)
    clearTimeout(logoutTimer.current)
  }, [])

  const resetTimers = useCallback(() => {
    if (!session) return
    clearTimers()
    setShowTimeoutWarn(false)
    warnTimer.current   = setTimeout(() => setShowTimeoutWarn(true), INACTIVITY_WARN_MS)
    logoutTimer.current = setTimeout(() => signOut(), INACTIVITY_LIMIT_MS)
  }, [session, clearTimers]) // eslint-disable-line react-hooks/exhaustive-deps

  // Attach activity listeners when session is active
  useEffect(() => {
    if (!session) { clearTimers(); return }
    resetTimers()
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimers, { passive: true }))
    return () => {
      clearTimers()
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimers))
    }
  }, [session, resetTimers, clearTimers])

  // ── Restore session on mount ──────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        try {
          await hydrateUser(session)
        } catch (err) {
          console.error('[AuthContext] hydrateUser failed on restore:', err.message)
          setUser(null)
          setSession(null)
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        try {
          await hydrateUser(session)
        } catch (err) {
          console.error('[AuthContext] hydrateUser failed on auth change:', err.message)
          setUser(null)
          setSession(null)
        }
      } else {
        setUser(null)
        setSession(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function hydrateUser(session) {
    setSession(session)

    // Always read the full profile from DB — this gives us full_name + role
    // regardless of whether app_metadata.role is already in the JWT.
    const { data: profile } = await supabase
      .from('users')
      .select('id, full_name, role')
      .eq('id', session.user.id)
      .single()

    if (profile) {
      setUser(profile)

      // Sync role into app_metadata in the background so that RLS policies
      // using get_auth_role() work via the JWT fast-path on the next request.
      // Fire-and-forget — failure here does not affect the UX because
      // migration 013 also added a DB-fallback to get_auth_role().
      if (!session.user?.app_metadata?.role) {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
        fetch(`${backendUrl}/api/auth/sync-role`, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }).catch(() => {/* non-critical */})
      }
      return
    }

    // No profile found — sign out and surface a clear error
    await supabase.auth.signOut()
    throw new Error('Account not found. Please contact an administrator to set up your profile.')
  }

  // ── Auth actions ──────────────────────────────────────────
  async function signInWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await hydrateUser(data.session)
    return data
  }

  async function signInWithPin(email, pin) {
    // Call backend — backend verifies PIN hash and creates session via admin API
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/auth/pin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'PIN login failed')

    // Inject the session Supabase-side so the client is aware
    const { error } = await supabase.auth.setSession({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
    if (error) throw error
    await hydrateUser(data.session)
    return data
  }

  async function signOut() {
    clearTimers()
    setShowTimeoutWarn(false)
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  const value = {
    user,
    session,
    loading,
    showTimeoutWarn,
    signInWithPassword,
    signInWithPin,
    signOut,
    dismissTimeoutWarn: resetTimers,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
