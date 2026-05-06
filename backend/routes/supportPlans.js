import { Router } from 'express'
import { supabase } from '../utils/supabase.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Standard sections every client should have
const DEFAULT_SECTIONS = [
  { key: 'about_me',          title: 'About Me' },
  { key: 'daily_routine',     title: 'Daily Routine' },
  { key: 'how_to_support',    title: 'How to Support Me' },
  { key: 'health_overview',   title: 'Health Overview' },
  { key: 'goals',             title: 'My Goals' },
  { key: 'risks_alerts',      title: 'Risks & Things to Be Aware Of' },
  { key: 'emergency_contacts',title: 'Emergency Contacts & Key People' },
]

// ── GET /api/support-plans/:clientId
// Returns all current sections; fills in empty defaults for any missing ones
router.get('/:clientId', async (req, res, next) => {
  try {
    const { clientId } = req.params

    const { data, error } = await supabase
      .from('support_plan_sections')
      .select('id, section_key, title, content, updated_by, updated_at, version, users!support_plan_sections_updated_by_fkey(full_name)')
      .eq('client_id', clientId)
      .eq('is_current', true)
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Merge with defaults so every section is always present
    const existing = new Map((data || []).map(s => [s.section_key, s]))
    const sections = DEFAULT_SECTIONS.map(def => {
      const found = existing.get(def.key)
      return found || {
        id:          null,
        section_key: def.key,
        title:       def.title,
        content:     '',
        updated_by:  null,
        updated_at:  null,
        version:     0,
        users:       null,
      }
    })

    res.json(sections)
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/support-plans/:clientId/:sectionKey
// Save a new version of a section
router.put('/:clientId/:sectionKey', requireRole('manager', 'supervisor'), async (req, res, next) => {
  try {
    const { clientId, sectionKey } = req.params
    const { content } = req.body

    if (content === undefined || content === null) {
      return res.status(400).json({ error: 'content is required.' })
    }

    const sectionDef = DEFAULT_SECTIONS.find(s => s.key === sectionKey)
    if (!sectionDef) {
      return res.status(400).json({ error: 'Unknown section key.' })
    }

    // Fetch current version number
    const { data: current } = await supabase
      .from('support_plan_sections')
      .select('id, version')
      .eq('client_id', clientId)
      .eq('section_key', sectionKey)
      .eq('is_current', true)
      .maybeSingle()

    const nextVersion = (current?.version || 0) + 1

    // Mark old version as not current
    if (current?.id) {
      await supabase
        .from('support_plan_sections')
        .update({ is_current: false })
        .eq('id', current.id)
    }

    // Insert new current version
    const { data: newSection, error: insertErr } = await supabase
      .from('support_plan_sections')
      .insert({
        client_id:   clientId,
        section_key: sectionKey,
        title:       sectionDef.title,
        content:     content.trim(),
        updated_by:  req.user.id,
        version:     nextVersion,
        is_current:  true,
      })
      .select('id, section_key, title, content, updated_by, updated_at, version, users!support_plan_sections_updated_by_fkey(full_name)')
      .single()

    if (insertErr) throw insertErr

    res.json(newSection)
  } catch (err) {
    next(err)
  }
})

// ── GET /api/support-plans/:clientId/:sectionKey/history
// Returns all versions of a section, newest first
router.get('/:clientId/:sectionKey/history', async (req, res, next) => {
  try {
    const { clientId, sectionKey } = req.params

    const { data, error } = await supabase
      .from('support_plan_sections')
      .select('id, section_key, title, content, updated_by, updated_at, version, is_current, users!support_plan_sections_updated_by_fkey(full_name)')
      .eq('client_id', clientId)
      .eq('section_key', sectionKey)
      .order('version', { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    next(err)
  }
})

export default router
