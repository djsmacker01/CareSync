import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const INACTIVITY_WARN_MS  = 25 * 60 * 1000   // 25 minutes
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000   // 30 minutes
const ACTIVITY_EVENTS     = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll']
const PIN_LOGIN_TIMEOUT_MS = 12_000
const PIN_MAX_NETWORK_RETRIES = 1

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)   // { id, full_name, role }
  const [session, setSession]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [showTimeoutWarn, setShowTimeoutWarn] = useState(false)
  const [warnDeadline, setWarnDeadline] = useState(null)

  const warnTimer      = useRef(null)
  const logoutTimer    = useRef(null)
  const hydratingPromise = useRef(null)

  // ── Timeout management ────────────────────────────────────
  const clearTimers = useCallback(() => {
    clearTimeout(warnTimer.current)
    clearTimeout(logoutTimer.current)
  }, [])

  const resetTimers = useCallback(() => {
    if (!session) return
    clearTimers()
    setShowTimeoutWarn(false)
    setWarnDeadline(null)
    warnTimer.current   = setTimeout(() => setShowTimeoutWarn(true), INACTIVITY_WARN_MS)
    logoutTimer.current = setTimeout(() => signOut({ reason: 'inactivity-timeout' }), INACTIVITY_LIMIT_MS)
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
  // Only use onAuthStateChange — it fires INITIAL_SESSION immediately with
  // any existing session, so a separate getSession() call is redundant and
  // causes concurrent lock contention on the Supabase navigator lock.
  useEffect(() => {
    let mounted = true
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    async function tryRestoreSession({ retries = 2, delayMs = 400 } = {}) {
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        if (!mounted) return false
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession()
          if (!currentSession) return false
          if (mounted) setSession(currentSession)
          // Clear loading immediately so the app never hangs — hydrateUser
          // fills in `user` shortly after (ProtectedRoute handles the interim).
          if (mounted) setLoading(false)
          await hydrateUser(currentSession)
          return true
        } catch {
          if (attempt < retries) await sleep(delayMs)
        }
      }
      return false
    }

    // Safety valve: if Supabase doesn't fire onAuthStateChange within 8 s
    // (e.g. stale refresh token, no network), clear the loading gate so the
    // app never hangs on the "Loading…" screen.
    const safetyTimer = setTimeout(async () => {
      if (!mounted) return
      const restored = await tryRestoreSession({ retries: 3, delayMs: 500 })
      if (!restored && mounted) setLoading(false)
    }, 8_000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return

      if (newSession) {
        // Keep session state in sync immediately; profile hydration can finish shortly after.
        if (mounted) setSession(newSession)
        // Clear the loading gate right away — ProtectedRoute can render
        // the loading spinner independently while hydrateUser completes.
        clearTimeout(safetyTimer)
        if (mounted) setLoading(false)
        try {
          await hydrateUser(newSession)
        } catch (err) {
          console.error('[AuthContext] hydrateUser failed on auth change:', err.message)
          if (mounted) { setUser(null); setSession(null) }
        }
      } else {
        if (mounted) { setUser(null); setSession(null); setShowTimeoutWarn(false); setWarnDeadline(null) }
        clearTimeout(safetyTimer)
        if (mounted) setLoading(false)
      }
    })

    // Fallback path: in rare cases INITIAL_SESSION can be delayed/missed.
    // Querying once avoids getting stuck in a signed-out-looking state.
    const sessionFallbackTimer = setTimeout(async () => {
      if (!mounted) return
      await tryRestoreSession({ retries: 2, delayMs: 350 })
    }, 1200)

    return () => {
      mounted = false
      clearTimeout(safetyTimer)
      clearTimeout(sessionFallbackTimer)
      subscription.unsubscribe()
    }
  }, [])

  async function hydrateUser(session) {
    if (!session?.user?.id) {
      setUser(null)
      setSession(null)
      return
    }

    if (hydratingPromise.current) {
      return hydratingPromise.current
    }

    const hydrate = (async () => {
      setSession(session)

      // Always read the full profile from DB — this gives us full_name + role
      // regardless of whether app_metadata.role is already in the JWT.
      // Race with a 7 s timeout so a hanging Supabase query doesn't leave
      // the app in an indefinite (session && !user) limbo state.
      const profileQuery = supabase
        .from('users')
        .select('id, full_name, role')
        .eq('id', session.user.id)
        .single()

      const timeoutGuard = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile query timed out')), 7_000)
      )

      const { data: profile } = await Promise.race([profileQuery, timeoutGuard])

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
    })()

    hydratingPromise.current = hydrate.finally(() => {
      hydratingPromise.current = null
    })

    return hydratingPromise.current
  }

  // ── Auth actions ──────────────────────────────────────────
  async function signInWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await hydrateUser(data.session)
    return data
  }

  async function signInWithPin(email, pin) {
    // Call backend with timeout + one network retry for slow/unstable links
    let data = null
    let lastError = null

    for (let attempt = 0; attempt <= PIN_MAX_NETWORK_RETRIES; attempt += 1) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), PIN_LOGIN_TIMEOUT_MS)
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/auth/pin-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, pin }),
          signal: controller.signal,
        })
        data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'PIN login failed')
        clearTimeout(timeoutId)
        lastError = null
        break
      } catch (err) {
        clearTimeout(timeoutId)
        lastError = err
        const aborted = err?.name === 'AbortError'
        const networkish = aborted || /Failed to fetch|NetworkError|Load failed/i.test(err?.message || '')
        if (!networkish || attempt >= PIN_MAX_NETWORK_RETRIES) {
          if (aborted) throw new Error('PIN login timed out. Please check connection and try again.')
          throw err
        }
        await new Promise(resolve => setTimeout(resolve, 600))
      }
    }

    if (lastError) throw lastError

    // Inject the session Supabase-side so the client is aware
    const { error } = await supabase.auth.setSession({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
    if (error) throw error
    await hydrateUser(data.session)
    return data
  }

  async function signOut({ reason } = {}) {
    if (reason === 'inactivity-timeout' || reason === 'inactivity-warning') {
      window.dispatchEvent(new CustomEvent('caresync:autosave-requested', { detail: { reason } }))
    }
    clearTimers()
    setShowTimeoutWarn(false)
    setWarnDeadline(null)
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  useEffect(() => {
    if (!showTimeoutWarn) return
    setWarnDeadline(Date.now() + (INACTIVITY_LIMIT_MS - INACTIVITY_WARN_MS))
    window.dispatchEvent(new CustomEvent('caresync:autosave-requested', { detail: { reason: 'inactivity-warning' } }))
  }, [showTimeoutWarn])

  const value = {
    user,
    session,
    loading,
    showTimeoutWarn,
    warnDeadline,
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
