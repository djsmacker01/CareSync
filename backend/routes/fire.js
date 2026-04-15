import { Router } from 'express'
import { supabase } from '../utils/supabase.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const CHECK_TYPES   = ['fire_door', 'extinguisher', 'alarm_test', 'evacuation_drill']
const VALID_STATUS  = ['pass', 'fail', 'action_required']

// ── GET /api/fire/status
// Returns latest check + overdue flag for each check type
router.get('/status', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('fire_safety_checks')
      .select('*, users!fire_safety_checks_checked_by_fkey(full_name)')
      .order('check_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const checks = CHECK_TYPES.map(type => {
      const latest = (data || []).find(c => c.check_type === type) || null
      const overdue = latest?.next_due_date
        ? new Date(latest.next_due_date) < today
        : true

      return { check_type: type, latest, overdue }
    })

    const overdueCount = checks.filter(c => c.overdue).length
    res.json({ checks, overdueCount })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/fire/history?type=&limit=30
router.get('/history', async (req, res, next) => {
  try {
    const { type, limit = 30 } = req.query
    const cap = Math.min(parseInt(limit) || 30, 100)

    let query = supabase
      .from('fire_safety_checks')
      .select('*, users!fire_safety_checks_checked_by_fkey(full_name)')
      .order('check_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(cap)

    if (type && CHECK_TYPES.includes(type)) {
      query = query.eq('check_type', type)
    }

    const { data, error } = await query
    if (error) throw error

    res.json({ checks: data || [] })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/fire/check — record a new check
router.post('/check', requireRole('staff', 'supervisor', 'manager'), async (req, res, next) => {
  try {
    const { check_type, status, notes } = req.body

    if (!check_type || !CHECK_TYPES.includes(check_type)) {
      return res.status(400).json({ error: 'Invalid check_type.' })
    }
    if (!status || !VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: 'status must be pass | fail | action_required.' })
    }
    if (['fail', 'action_required'].includes(status) && !notes?.trim()) {
      return res.status(400).json({ error: 'Notes are required when status is fail or action_required.' })
    }

    const { data, error } = await supabase
      .from('fire_safety_checks')
      .insert({ check_type, checked_by: req.user.id, status, notes: notes?.trim() || null })
      .select('*, users!fire_safety_checks_checked_by_fkey(full_name)')
      .single()

    if (error) throw error

    res.status(201).json({ check: data })
  } catch (err) {
    next(err)
  }
})

export default router
