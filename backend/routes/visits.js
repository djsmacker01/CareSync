import { Router } from 'express'
import { supabase } from '../utils/supabase.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// ── GET /api/visits/today — all visits for today
router.get('/today', async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('staff_visits')
      .select(`
        id, staff_id, client_id, address,
        scheduled_start, scheduled_end,
        checked_in_at, checked_out_at,
        check_in_notes, check_out_notes,
        status, visit_date, created_at,
        staff:users!staff_visits_staff_id_fkey(id, full_name),
        client:clients!staff_visits_client_id_fkey(id, full_name, room_number)
      `)
      .eq('visit_date', today)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    next(err)
  }
})

// ── GET /api/visits/history?date=YYYY-MM-DD — visit history for a date
router.get('/history', async (req, res, next) => {
  try {
    const { date } = req.query
    if (!date) return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' })

    const { data, error } = await supabase
      .from('staff_visits')
      .select(`
        id, staff_id, client_id, address,
        scheduled_start, scheduled_end,
        checked_in_at, checked_out_at,
        check_in_notes, check_out_notes,
        status, visit_date, created_at,
        staff:users!staff_visits_staff_id_fkey(id, full_name),
        client:clients!staff_visits_client_id_fkey(id, full_name, room_number)
      `)
      .eq('visit_date', date)
      .order('checked_in_at', { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    next(err)
  }
})

// ── POST /api/visits — create a new visit (check in)
router.post('/', requireRole('staff', 'supervisor', 'manager'), async (req, res, next) => {
  try {
    const { client_id, address, scheduled_end, check_in_notes } = req.body

    if (!client_id) return res.status(400).json({ error: 'client_id is required.' })

    const { data, error } = await supabase
      .from('staff_visits')
      .insert({
        staff_id:       req.user.id,
        client_id,
        address:        address?.trim() || null,
        scheduled_end:  scheduled_end || null,
        checked_in_at:  new Date().toISOString(),
        check_in_notes: check_in_notes?.trim() || null,
        status:         'active',
        visit_date:     new Date().toISOString().slice(0, 10),
      })
      .select(`
        *,
        staff:users!staff_visits_staff_id_fkey(id, full_name),
        client:clients!staff_visits_client_id_fkey(id, full_name, room_number)
      `)
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/visits/:id/checkout — check out of a visit
router.patch('/:id/checkout', requireRole('staff', 'supervisor', 'manager'), async (req, res, next) => {
  try {
    const { id } = req.params
    const { check_out_notes } = req.body

    // Fetch the visit first to verify ownership
    const { data: visit, error: fetchErr } = await supabase
      .from('staff_visits')
      .select('id, staff_id, status')
      .eq('id', id)
      .single()

    if (fetchErr || !visit) return res.status(404).json({ error: 'Visit not found.' })

    // Only the staff member or manager/supervisor can check out
    const userRole = req.user.role
    if (visit.staff_id !== req.user.id && !['manager', 'supervisor'].includes(userRole)) {
      return res.status(403).json({ error: 'You can only check out your own visits.' })
    }

    if (visit.status === 'completed') {
      return res.status(409).json({ error: 'Visit already checked out.' })
    }

    const { data, error } = await supabase
      .from('staff_visits')
      .update({
        checked_out_at:  new Date().toISOString(),
        check_out_notes: check_out_notes?.trim() || null,
        status:          'completed',
      })
      .eq('id', id)
      .select(`
        *,
        staff:users!staff_visits_staff_id_fkey(id, full_name),
        client:clients!staff_visits_client_id_fkey(id, full_name, room_number)
      `)
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/visits/:id/overdue — mark a visit overdue (manager/supervisor)
router.patch('/:id/overdue', requireRole('manager', 'supervisor'), async (req, res, next) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase
      .from('staff_visits')
      .update({ status: 'overdue' })
      .eq('id', id)
      .eq('status', 'active')
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

export default router
