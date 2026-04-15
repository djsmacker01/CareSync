import { Router } from 'express'
import { supabase } from '../utils/supabase.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// ── GET /api/tasks?shift=AM&date=2025-04-15
// Returns tasks + completions for a shift/date
router.get('/', async (req, res, next) => {
  try {
    const { shift, date } = req.query
    const today = date || new Date().toISOString().slice(0, 10)

    const shiftFilter = shift && ['AM', 'PM'].includes(shift)

    // Fetch active tasks for this shift (or BOTH)
    let taskQuery = supabase
      .from('tasks')
      .select('id, title, description, shift, is_recurring')
      .eq('is_active', true)
      .order('shift')

    if (shiftFilter) {
      taskQuery = taskQuery.in('shift', [shift, 'BOTH'])
    }

    const { data: tasks, error: tErr } = await taskQuery
    if (tErr) throw tErr

    // Fetch completions for this date (and shift if specified)
    let compQuery = supabase
      .from('task_completions')
      .select('id, task_id, shift, completed_at, notes, users!task_completions_completed_by_fkey(full_name)')
      .eq('completion_date', today)

    if (shiftFilter) compQuery = compQuery.eq('shift', shift)

    const { data: completions, error: cErr } = await compQuery
    if (cErr) throw cErr

    const completionMap = {}
    for (const c of (completions || [])) {
      completionMap[`${c.task_id}_${c.shift}`] = c
    }

    const result = tasks.map(t => {
      const taskShift = shiftFilter ? shift : t.shift === 'BOTH' ? 'AM' : t.shift
      const completion = completionMap[`${t.id}_${taskShift}`] || null
      return { ...t, completion, completed: !!completion }
    })

    const total     = result.length
    const completed = result.filter(t => t.completed).length

    res.json({ tasks: result, date: today, shift: shift || null, total, completed })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/tasks/:taskId/complete — mark a task complete
router.post('/:taskId/complete', requireRole('staff', 'supervisor', 'manager'), async (req, res, next) => {
  try {
    const { taskId } = req.params
    const { shift, notes, date } = req.body
    if (!shift || !['AM', 'PM'].includes(shift)) {
      return res.status(400).json({ error: 'shift is required (AM | PM).' })
    }

    const today = date || new Date().toISOString().slice(0, 10)

    // Prevent duplicate completions
    const { data: existing } = await supabase
      .from('task_completions')
      .select('id')
      .eq('task_id', taskId)
      .eq('shift', shift)
      .eq('completion_date', today)
      .maybeSingle()

    if (existing) return res.status(409).json({ error: 'Task already completed for this shift.' })

    const { data: completion, error } = await supabase
      .from('task_completions')
      .insert({ task_id: taskId, completed_by: req.user.id, shift, completion_date: today, notes: notes || null })
      .select('id, task_id, shift, completed_at, notes')
      .single()

    if (error) throw error
    res.status(201).json({ completion: { ...completion, users: { full_name: req.user.full_name } } })
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/tasks/:taskId/complete — un-tick a task (same shift/date only)
router.delete('/:taskId/complete', requireRole('staff', 'supervisor', 'manager'), async (req, res, next) => {
  try {
    const { taskId } = req.params
    const { shift, date } = req.body
    const today = date || new Date().toISOString().slice(0, 10)

    const { error } = await supabase
      .from('task_completions')
      .delete()
      .eq('task_id', taskId)
      .eq('shift', shift)
      .eq('completion_date', today)
      .eq('completed_by', req.user.id)   // can only un-tick own completions

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/tasks — create new task (manager/supervisor)
router.post('/', requireRole('manager', 'supervisor'), async (req, res, next) => {
  try {
    const { title, description, shift, is_recurring } = req.body
    if (!title || !shift) return res.status(400).json({ error: 'title and shift are required.' })
    if (!['AM', 'PM', 'BOTH'].includes(shift)) return res.status(400).json({ error: 'shift must be AM, PM, or BOTH.' })

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ title, description: description || null, shift, is_recurring: is_recurring ?? true, created_by: req.user.id })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ task })
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/tasks/:taskId — deactivate / reactivate (manager)
router.patch('/:taskId', requireRole('manager'), async (req, res, next) => {
  try {
    const { is_active } = req.body
    const { data: task, error } = await supabase
      .from('tasks')
      .update({ is_active })
      .eq('id', req.params.taskId)
      .select()
      .single()
    if (error) throw error
    res.json({ task })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/tasks/handover?date=2025-04-15&shift=AM — data for handover note
router.get('/handover', async (req, res, next) => {
  try {
    const { date, shift } = req.query
    const today = date || new Date().toISOString().slice(0, 10)
    const fromShift = shift || 'AM'

    // Incomplete tasks for this shift
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, shift')
      .eq('is_active', true)
      .in('shift', [fromShift, 'BOTH'])

    const { data: completions } = await supabase
      .from('task_completions')
      .select('task_id')
      .eq('completion_date', today)
      .eq('shift', fromShift)

    const completedIds = new Set((completions || []).map(c => c.task_id))
    const incompleteTasks = (tasks || []).filter(t => !completedIds.has(t.id))

    // Medication refusals from this shift
    const { data: refusals } = await supabase
      .from('mar_entries')
      .select('id, refusal_reason, notes, clients(full_name), medications(medication_name, dosage)')
      .eq('shift', fromShift)
      .eq('status', 'refused')
      .gte('administered_at', `${today}T00:00:00Z`)
      .lte('administered_at', `${today}T23:59:59Z`)

    // Low stock alerts
    const { data: lowStock } = await supabase
      .from('stock')
      .select('current_quantity, unit, reorder_threshold, medications(medication_name, dosage), clients(full_name)')
      .lte('current_quantity', supabase.raw ? 'reorder_threshold' : 999)  // fetch all, filter below

    const alerts = (lowStock || []).filter(s => s.current_quantity <= s.reorder_threshold)

    // Existing handover note for this shift/date
    const { data: existing } = await supabase
      .from('handover_notes')
      .select('id, content, flags, created_at, users!handover_notes_written_by_fkey(full_name)')
      .eq('shift', fromShift)
      .eq('shift_date', today)
      .maybeSingle()

    res.json({ incompleteTasks, refusals: refusals || [], stockAlerts: alerts, existing, date: today, shift: fromShift })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/tasks/handover — save handover note
router.post('/handover', requireRole('staff', 'supervisor', 'manager'), async (req, res, next) => {
  try {
    const { shift, date, content, flags } = req.body
    if (!content) return res.status(400).json({ error: 'content is required.' })
    const today = date || new Date().toISOString().slice(0, 10)

    const { data: note, error } = await supabase
      .from('handover_notes')
      .upsert({ shift, shift_date: today, written_by: req.user.id, content, flags: flags || [] },
               { onConflict: 'shift,shift_date' })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ note })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/tasks/handover/latest?shift=PM — latest handover note for incoming shift
router.get('/handover/latest', async (req, res, next) => {
  try {
    const { shift } = req.query
    const prevShift = shift === 'PM' ? 'AM' : 'PM'
    const today = new Date().toISOString().slice(0, 10)

    const { data: note } = await supabase
      .from('handover_notes')
      .select('id, content, flags, shift, shift_date, created_at, users!handover_notes_written_by_fkey(full_name)')
      .eq('shift', prevShift)
      .eq('shift_date', today)
      .maybeSingle()

    res.json({ note })
  } catch (err) {
    next(err)
  }
})

export default router
