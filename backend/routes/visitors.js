import { Router } from 'express'
import { supabase } from '../utils/supabase.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const VISITOR_SELECT = `
  id, visitor_name, purpose, sign_in_time, sign_out_time, created_at,
  clients!visitors_visiting_client_id_fkey(id, full_name, room_number),
  users!visitors_signed_in_by_fkey(full_name)
`

// ── GET /api/visitors/active — all visitors currently signed in
router.get('/active', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('visitors')
      .select(VISITOR_SELECT)
      .is('sign_out_time', null)
      .order('sign_in_time', { ascending: false })

    if (error) throw error
    res.json({ visitors: data || [] })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/visitors/history?date=YYYY-MM-DD&limit=50
router.get('/history', async (req, res, next) => {
  try {
    const { date, limit = 50 } = req.query
    const cap = Math.min(parseInt(limit) || 50, 200)

    let query = supabase
      .from('visitors')
      .select(VISITOR_SELECT)
      .not('sign_out_time', 'is', null)
      .order('sign_in_time', { ascending: false })
      .limit(cap)

    if (date) {
      query = query
        .gte('sign_in_time', `${date}T00:00:00Z`)
        .lte('sign_in_time', `${date}T23:59:59Z`)
    }

    const { data, error } = await query
    if (error) throw error
    res.json({ visitors: data || [] })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/visitors/sign-in
router.post('/sign-in', async (req, res, next) => {
  try {
    const { visitor_name, visiting_client_id, purpose } = req.body

    if (!visitor_name?.trim()) return res.status(400).json({ error: 'Visitor name is required.' })
    if (!visiting_client_id)   return res.status(400).json({ error: 'Client is required.' })
    if (!purpose?.trim())      return res.status(400).json({ error: 'Purpose is required.' })

    const { data, error } = await supabase
      .from('visitors')
      .insert({
        visitor_name:       visitor_name.trim(),
        visiting_client_id,
        purpose:            purpose.trim(),
        signed_in_by:       req.user.id,
      })
      .select(VISITOR_SELECT)
      .single()

    if (error) throw error
    res.status(201).json({ visitor: data })
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/visitors/:id/sign-out
router.patch('/:id/sign-out', async (req, res, next) => {
  try {
    const { id } = req.params

    const { data: existing, error: findErr } = await supabase
      .from('visitors')
      .select('id, sign_out_time')
      .eq('id', id)
      .single()

    if (findErr || !existing) return res.status(404).json({ error: 'Visitor record not found.' })
    if (existing.sign_out_time) return res.status(409).json({ error: 'Visitor already signed out.' })

    const { data, error } = await supabase
      .from('visitors')
      .update({ sign_out_time: new Date().toISOString() })
      .eq('id', id)
      .select(VISITOR_SELECT)
      .single()

    if (error) throw error
    res.json({ visitor: data })
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/visitors/:id — manager only
router.delete('/:id', requireRole('manager'), async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('visitors')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
