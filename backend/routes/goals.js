import { Router } from 'express'
import { supabase } from '../utils/supabase.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// ── GET /api/goals/client/:clientId — all goals for a client
router.get('/client/:clientId', async (req, res, next) => {
  try {
    const { clientId } = req.params

    // Fetch goals with latest progress update each
    const { data: goals, error } = await supabase
      .from('goals')
      .select(`
        id, title, description, category, priority, status,
        target_date, achieved_at, created_at,
        creator:users!goals_created_by_fkey(id, full_name),
        goal_updates(id, progress_level, notes, created_at,
          staff:users!goal_updates_logged_by_fkey(id, full_name))
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .order('created_at', { ascending: false, foreignTable: 'goal_updates' })

    if (error) throw error
    res.json(goals || [])
  } catch (err) {
    next(err)
  }
})

// ── POST /api/goals — create a new goal
router.post('/', requireRole('manager', 'supervisor'), async (req, res, next) => {
  try {
    const { client_id, title, description, category, priority, target_date } = req.body

    if (!client_id || !title || !category) {
      return res.status(400).json({ error: 'client_id, title, and category are required.' })
    }

    const VALID_CATEGORIES = ['life_skills','employment','social','health','education','housing','finance','wellbeing','other']
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category.' })
    }

    const { data, error } = await supabase
      .from('goals')
      .insert({
        client_id,
        title:       title.trim(),
        description: description?.trim() || null,
        category,
        priority:    priority || 'medium',
        target_date: target_date || null,
        status:      'active',
        created_by:  req.user.id,
      })
      .select(`
        id, title, description, category, priority, status,
        target_date, achieved_at, created_at,
        creator:users!goals_created_by_fkey(id, full_name),
        goal_updates(id, progress_level, notes, created_at,
          staff:users!goal_updates_logged_by_fkey(id, full_name))
      `)
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/goals/:id/status — update goal status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const VALID = ['active', 'achieved', 'paused', 'discontinued']
    if (!VALID.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' })
    }

    const updates = { status }
    if (status === 'achieved') updates.achieved_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// ── POST /api/goals/:id/update — log a progress update
router.post('/:id/update', async (req, res, next) => {
  try {
    const { id } = req.params
    const { progress_level, notes, client_id } = req.body

    if (!notes?.trim() || progress_level === undefined) {
      return res.status(400).json({ error: 'progress_level and notes are required.' })
    }

    const level = Number(progress_level)
    if (level < 1 || level > 5) {
      return res.status(400).json({ error: 'progress_level must be 1–5.' })
    }

    // Fetch goal to get client_id if not provided
    let goalClientId = client_id
    if (!goalClientId) {
      const { data: goal } = await supabase
        .from('goals').select('client_id').eq('id', id).single()
      goalClientId = goal?.client_id
    }

    const { data, error } = await supabase
      .from('goal_updates')
      .insert({
        goal_id:        id,
        client_id:      goalClientId,
        progress_level: level,
        notes:          notes.trim(),
        logged_by:      req.user.id,
      })
      .select(`
        id, progress_level, notes, created_at,
        staff:users!goal_updates_logged_by_fkey(id, full_name)
      `)
      .single()

    if (error) throw error

    // Auto-mark as achieved if progress_level = 5
    if (level === 5) {
      await supabase
        .from('goals')
        .update({ status: 'achieved', achieved_at: new Date().toISOString() })
        .eq('id', id)
    }

    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

export default router
