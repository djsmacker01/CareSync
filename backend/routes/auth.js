import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../utils/supabase.js'
import bcrypt from 'bcryptjs'
import { requireAuth } from '../middleware/auth.js'

// Anon-key client used solely to exchange a magic-link token for a session.
// (The admin createSession API no longer exists in @supabase/auth-js v2.)
const anonSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

// ── PIN brute-force protection ────────────────────────────────────────
// Simple in-memory store: email → { count, lockedUntil }
// Suitable for single-server deployments. For multi-instance, replace with Redis.
const PIN_MAX_ATTEMPTS = 5
const PIN_LOCKOUT_MS   = 15 * 60 * 1000  // 15 minutes

const pinFailures = new Map()

function getPinLockMinutes(email) {
  const entry = pinFailures.get(email)
  if (!entry?.lockedUntil) return 0
  const remaining = entry.lockedUntil - Date.now()
  if (remaining <= 0) { pinFailures.delete(email); return 0 }
  return Math.ceil(remaining / 60_000)
}

function recordPinFailure(email) {
  const entry = pinFailures.get(email) || { count: 0, lockedUntil: null }
  entry.count += 1
  if (entry.count >= PIN_MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + PIN_LOCKOUT_MS
  }
  pinFailures.set(email, entry)
  return entry.count
}

function clearPinFailures(email) {
  pinFailures.delete(email)
}

const router = Router()

// POST /api/auth/login — email + password login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return res.status(401).json({ error: 'Invalid credentials.' })

    // Fetch role
    const { data: profile } = await supabase
      .from('users')
      .select('id, full_name, role, is_active')
      .eq('id', data.user.id)
      .single()

    if (!profile?.is_active) {
      return res.status(403).json({ error: 'Account is deactivated.' })
    }

    res.json({
      session: data.session,
      user: { id: profile.id, full_name: profile.full_name, role: profile.role },
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/pin-login — 6-digit PIN login (tablet mode)
router.post('/pin-login', async (req, res, next) => {
  try {
    const { email, pin } = req.body
    if (!email || !pin) {
      return res.status(400).json({ error: 'Email and PIN are required.' })
    }

    // ── Lockout check ──────────────────────────────────────────────
    const lockedMinutes = getPinLockMinutes(email.toLowerCase())
    if (lockedMinutes > 0) {
      return res.status(429).json({
        error: `Too many failed PIN attempts. Account locked for ${lockedMinutes} more minute${lockedMinutes === 1 ? '' : 's'}.`,
      })
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('id, full_name, role, pin, is_active, email')
      .eq('email', email)
      .single()

    if (error || !profile) return res.status(401).json({ error: 'User not found.' })
    if (!profile.is_active) return res.status(403).json({ error: 'Account is deactivated.' })
    if (!profile.pin) return res.status(401).json({ error: 'PIN login not set up for this user.' })

    const valid = await bcrypt.compare(pin, profile.pin)
    if (!valid) {
      const attempts = recordPinFailure(email.toLowerCase())
      const remaining = PIN_MAX_ATTEMPTS - attempts
      const msg = remaining > 0
        ? `Invalid PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : `Invalid PIN. Account locked for ${PIN_LOCKOUT_MS / 60_000} minutes.`
      return res.status(401).json({ error: msg })
    }

    // Success — clear any previous failure count
    clearPinFailures(email.toLowerCase())

    // Sync role into app_metadata so the JWT fast-path in get_auth_role() works.
    // This is a no-op if already correct; safe to run on every PIN login.
    await supabase.auth.admin.updateUserById(profile.id, {
      app_metadata: { role: profile.role },
    })

    // Generate a one-time magic link for this user (admin API), then immediately
    // exchange the hashed token for a real access/refresh session pair.
    // This replaces the removed admin.createSession() method.
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type:  'magiclink',
      email: profile.email,
    })
    if (linkError) return res.status(500).json({ error: 'Could not generate session link.' })

    const { data: sessionData, error: sessionError } = await anonSupabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type:       'email',
    })
    if (sessionError || !sessionData?.session) {
      return res.status(500).json({ error: 'Could not establish session.' })
    }

    res.json({
      session: sessionData.session,
      user: { id: profile.id, full_name: profile.full_name, role: profile.role },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/auth/me — return current user profile
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

// POST /api/auth/sync-role
// Ensures the authenticated user's role is stored in auth.users app_metadata
// so that RLS policies using get_auth_role() work via the JWT fast-path.
// Called by the frontend after every email/password login.
router.post('/sync-role', requireAuth, async (req, res, next) => {
  try {
    const { id, role } = req.user
    if (!role) return res.status(400).json({ error: 'No role found for user.' })

    const { error } = await supabase.auth.admin.updateUserById(id, {
      app_metadata: { role },
    })
    if (error) return res.status(500).json({ error: 'Could not sync role.' })

    res.json({ ok: true, role })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await supabase.auth.signOut()
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
