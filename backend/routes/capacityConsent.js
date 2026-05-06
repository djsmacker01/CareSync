import { Router } from 'express'
import { supabase } from '../utils/supabase.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// ──────────────────────────────────────────────────────────────────────────
// CAPACITY ASSESSMENTS
// ──────────────────────────────────────────────────────────────────────────

// GET /api/capacity/:clientId/assessments — all current assessments
router.get('/:clientId/assessments', async (req, res, next) => {
  try {
    const { clientId } = req.params

    const { data, error } = await supabase
      .from('capacity_assessments')
      .select(`
        id, decision_topic, assessment_date, has_capacity, evidence,
        review_date, is_current, created_at,
        assessor:users!capacity_assessments_assessed_by_fkey(id, full_name)
      `)
      .eq('client_id', clientId)
      .eq('is_current', true)
      .order('assessment_date', { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    next(err)
  }
})

// GET /api/capacity/:clientId/assessments/history — all versions
router.get('/:clientId/assessments/history', async (req, res, next) => {
  try {
    const { clientId } = req.params

    const { data, error } = await supabase
      .from('capacity_assessments')
      .select(`
        id, decision_topic, assessment_date, has_capacity, evidence,
        review_date, is_current, created_at,
        assessor:users!capacity_assessments_assessed_by_fkey(id, full_name)
      `)
      .eq('client_id', clientId)
      .order('assessment_date', { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    next(err)
  }
})

// POST /api/capacity/:clientId/assessments — add or update a capacity assessment
router.post('/:clientId/assessments', requireRole('manager', 'supervisor'), async (req, res, next) => {
  try {
    const { clientId } = req.params
    const { decision_topic, has_capacity, evidence, review_date, assessment_date } = req.body

    if (!decision_topic || has_capacity === undefined || !evidence) {
      return res.status(400).json({ error: 'decision_topic, has_capacity, and evidence are required.' })
    }

    // Mark any existing current assessment for this topic as not current
    await supabase
      .from('capacity_assessments')
      .update({ is_current: false })
      .eq('client_id', clientId)
      .eq('decision_topic', decision_topic)
      .eq('is_current', true)

    // Insert new assessment
    const { data, error } = await supabase
      .from('capacity_assessments')
      .insert({
        client_id:       clientId,
        decision_topic:  decision_topic.trim(),
        assessment_date: assessment_date || new Date().toISOString().slice(0, 10),
        assessed_by:     req.user.id,
        has_capacity:    Boolean(has_capacity),
        evidence:        evidence.trim(),
        review_date:     review_date || null,
        is_current:      true,
      })
      .select(`
        id, decision_topic, assessment_date, has_capacity, evidence,
        review_date, is_current, created_at,
        assessor:users!capacity_assessments_assessed_by_fkey(id, full_name)
      `)
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

// ──────────────────────────────────────────────────────────────────────────
// CONSENT RECORDS
// ──────────────────────────────────────────────────────────────────────────

// GET /api/capacity/:clientId/consent — all consent records
router.get('/:clientId/consent', async (req, res, next) => {
  try {
    const { clientId } = req.params

    const { data, error } = await supabase
      .from('consent_records')
      .select(`
        id, intervention, consent_type, consent_given, decision_maker,
        rationale, witnessed_by, valid_from, valid_until, created_at,
        recorder:users!consent_records_recorded_by_fkey(id, full_name)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    next(err)
  }
})

// POST /api/capacity/:clientId/consent — add a consent record (append-only)
router.post('/:clientId/consent', requireRole('manager', 'supervisor'), async (req, res, next) => {
  try {
    const { clientId } = req.params
    const { intervention, consent_type, consent_given, decision_maker, rationale, witnessed_by, valid_from, valid_until } = req.body

    if (!intervention || !consent_type || consent_given === undefined || !rationale) {
      return res.status(400).json({ error: 'intervention, consent_type, consent_given, and rationale are required.' })
    }

    const VALID_TYPES = ['informed_consent', 'informed_refusal', 'best_interest', 'advance_directive']
    if (!VALID_TYPES.includes(consent_type)) {
      return res.status(400).json({ error: 'Invalid consent_type.' })
    }

    if (consent_type === 'best_interest' && !decision_maker) {
      return res.status(400).json({ error: 'decision_maker is required for best interest decisions.' })
    }

    const { data, error } = await supabase
      .from('consent_records')
      .insert({
        client_id:      clientId,
        intervention:   intervention.trim(),
        consent_type,
        consent_given:  Boolean(consent_given),
        decision_maker: decision_maker?.trim() || null,
        rationale:      rationale.trim(),
        witnessed_by:   witnessed_by?.trim() || null,
        valid_from:     valid_from || new Date().toISOString().slice(0, 10),
        valid_until:    valid_until || null,
        recorded_by:    req.user.id,
      })
      .select(`
        id, intervention, consent_type, consent_given, decision_maker,
        rationale, witnessed_by, valid_from, valid_until, created_at,
        recorder:users!consent_records_recorded_by_fkey(id, full_name)
      `)
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

export default router
