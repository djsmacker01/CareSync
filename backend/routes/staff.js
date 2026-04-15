import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../utils/supabase.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// All staff management routes require manager role
router.use(requireAuth, requireRole('manager'))

// ── GET /api/staff — list all staff ─────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, pin, created_at')
      .order('full_name')

    if (error) throw error

    // Never expose the PIN hash — just tell the frontend whether one is set
    const staff = (data || []).map(({ pin, ...rest }) => ({
      ...rest,
      has_pin: !!pin,
    }))

    res.json({ staff })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/staff — create new staff member ────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { full_name, email, role, password, pin } = req.body

    if (!full_name?.trim())  return res.status(400).json({ error: 'Full name is required.' })
    if (!email?.trim())      return res.status(400).json({ error: 'Email address is required.' })
    if (!role)               return res.status(400).json({ error: 'Role is required.' })
    if (!['staff', 'supervisor', 'manager', 'readonly'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' })
    }

    const tempPassword = password?.trim() || generatePassword()

    // 1. Create Supabase Auth user (requires service-role key)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email:         email.trim().toLowerCase(),
      password:      tempPassword,
      email_confirm: true,           // skip email verification
      app_metadata:  { role },       // bake role into JWT for fast RLS path
    })

    if (authError) {
      const alreadyExists =
        authError.message?.toLowerCase().includes('already been registered') ||
        authError.status === 422
      if (alreadyExists) {
        return res.status(409).json({ error: 'An account with this email already exists.' })
      }
      throw authError
    }

    const userId = authData.user.id

    // 2. Hash PIN if provided
    let hashedPin = null
    if (pin && /^\d{6}$/.test(String(pin))) {
      hashedPin = await bcrypt.hash(String(pin), 12)
    }

    // 3. Insert public.users profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        id:        userId,
        email:     email.trim().toLowerCase(),
        full_name: full_name.trim(),
        role,
        pin:       hashedPin,
        is_active: true,
      })
      .select('id, email, full_name, role, is_active, created_at')
      .single()

    if (profileError) {
      // Rollback: remove the auth user so we don't leave orphans
      await supabase.auth.admin.deleteUser(userId).catch(() => {})
      throw profileError
    }

    res.status(201).json({
      staff:       { ...profile, has_pin: !!hashedPin },
      tempPassword,   // returned so manager can share it with the new staff member
    })
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/staff/:id — update name and/or role ──────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { full_name, role } = req.body

    if (!full_name?.trim() && !role) {
      return res.status(400).json({ error: 'Provide full_name or role to update.' })
    }
    if (role && !['staff', 'supervisor', 'manager', 'readonly'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' })
    }

    const updates = {}
    if (full_name?.trim()) updates.full_name = full_name.trim()
    if (role)              updates.role      = role

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, email, full_name, role, is_active, pin, created_at')
      .single()

    if (error) throw error

    // Keep app_metadata in sync so RLS JWT fast-path stays correct
    if (role) {
      await supabase.auth.admin.updateUserById(id, { app_metadata: { role } }).catch(() => {})
    }

    res.json({ staff: { ...data, pin: undefined, has_pin: !!data.pin } })
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/staff/:id/deactivate ─────────────────────────────────
router.patch('/:id/deactivate', async (req, res, next) => {
  try {
    const { id } = req.params

    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' })
    }

    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id)
      .select('id, email, full_name, role, is_active, pin, created_at')
      .single()

    if (error) throw error
    res.json({ staff: { ...data, pin: undefined, has_pin: !!data.pin } })
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/staff/:id/reactivate ─────────────────────────────────
router.patch('/:id/reactivate', async (req, res, next) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', id)
      .select('id, email, full_name, role, is_active, pin, created_at')
      .single()

    if (error) throw error
    res.json({ staff: { ...data, pin: undefined, has_pin: !!data.pin } })
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/staff/:id/pin — set or clear PIN ──────────────────────
router.patch('/:id/pin', async (req, res, next) => {
  try {
    const { id } = req.params
    const { pin } = req.body   // pass null/empty to clear

    if (!pin) {
      const { error } = await supabase.from('users').update({ pin: null }).eq('id', id)
      if (error) throw error
      return res.json({ ok: true, has_pin: false })
    }

    if (!/^\d{6}$/.test(String(pin))) {
      return res.status(400).json({ error: 'PIN must be exactly 6 digits.' })
    }

    const hashedPin = await bcrypt.hash(String(pin), 12)
    const { error } = await supabase.from('users').update({ pin: hashedPin }).eq('id', id)
    if (error) throw error

    res.json({ ok: true, has_pin: true })
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/staff/:id — permanent delete (safety: only if no records) ──
// Not exposed in the UI — deactivate is preferred. Available for cleanup only.
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' })
    }

    // Soft-guard: refuse if the user has any clinical records
    const { count } = await supabase
      .from('mar_entries')
      .select('id', { count: 'exact', head: true })
      .eq('administered_by', id)
    if (count > 0) {
      return res.status(409).json({
        error: 'This staff member has recorded clinical entries. Deactivate instead of deleting.',
      })
    }

    await supabase.from('users').delete().eq('id', id)
    await supabase.auth.admin.deleteUser(id).catch(() => {})
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ── Helper ────────────────────────────────────────────────────────────
function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  let pw = ''
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw
}

export default router
