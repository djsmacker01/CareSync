import { Router } from 'express'
import { supabase } from '../utils/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// ── GET /api/activity/today — all logs for today (all clients)
router.get('/today', async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const { shift } = req.query

    let query = supabase
      .from('activity_logs')
      .select(`
        id, log_date, shift, mood, mood_notes, activities, narrative,
        food_intake, fluid_intake, physical_observations, community_participation, created_at,
        client:clients!activity_logs_client_id_fkey(id, full_name, room_number),
        staff:users!activity_logs_logged_by_fkey(id, full_name)
      `)
      .eq('log_date', today)
      .order('created_at', { ascending: false })

    if (shift) query = query.eq('shift', shift)

    const { data, error } = await query
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    next(err)
  }
})

// ── GET /api/activity/client/:clientId — logs for a specific client
router.get('/client/:clientId', async (req, res, next) => {
  try {
    const { clientId } = req.params
    const { limit = 20, offset = 0 } = req.query

    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        id, log_date, shift, mood, mood_notes, activities, narrative,
        food_intake, fluid_intake, physical_observations, community_participation, created_at,
        staff:users!activity_logs_logged_by_fkey(id, full_name)
      `)
      .eq('client_id', clientId)
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1)

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    next(err)
  }
})

// ── GET /api/activity/history?date=YYYY-MM-DD — all logs for a date
router.get('/history', async (req, res, next) => {
  try {
    const { date } = req.query
    if (!date) return res.status(400).json({ error: 'date query param required' })

    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        id, log_date, shift, mood, mood_notes, activities, narrative,
        food_intake, fluid_intake, physical_observations, community_participation, created_at,
        client:clients!activity_logs_client_id_fkey(id, full_name, room_number),
        staff:users!activity_logs_logged_by_fkey(id, full_name)
      `)
      .eq('log_date', date)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    next(err)
  }
})

// ── POST /api/activity — create a new activity log
router.post('/', async (req, res, next) => {
  try {
    const {
      client_id, shift, mood, mood_notes, activities,
      narrative, food_intake, fluid_intake,
      physical_observations, community_participation, log_date,
    } = req.body

    if (!client_id || !shift || !mood || !narrative) {
      return res.status(400).json({ error: 'client_id, shift, mood, and narrative are required.' })
    }

    if (!['AM', 'PM', 'NIGHT'].includes(shift)) {
      return res.status(400).json({ error: 'Invalid shift.' })
    }

    const VALID_MOODS = ['happy', 'calm', 'anxious', 'low', 'distressed', 'unwell', 'other']
    if (!VALID_MOODS.includes(mood)) {
      return res.status(400).json({ error: 'Invalid mood.' })
    }

    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        client_id,
        logged_by:              req.user.id,
        log_date:               log_date || new Date().toISOString().slice(0, 10),
        shift,
        mood,
        mood_notes:             mood_notes?.trim() || null,
        activities:             Array.isArray(activities) ? activities : [],
        narrative:              narrative.trim(),
        food_intake:            food_intake || null,
        fluid_intake:           fluid_intake || null,
        physical_observations:  physical_observations?.trim() || null,
        community_participation: Boolean(community_participation),
      })
      .select(`
        id, log_date, shift, mood, mood_notes, activities, narrative,
        food_intake, fluid_intake, physical_observations, community_participation, created_at,
        client:clients!activity_logs_client_id_fkey(id, full_name, room_number),
        staff:users!activity_logs_logged_by_fkey(id, full_name)
      `)
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

export default router
