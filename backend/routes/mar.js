import { Router } from 'express'
import { supabase } from '../utils/supabase.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// ── GET /api/mar/today?shift=AM
// Returns all active clients with their medications and today's MAR status
router.get('/today', async (req, res, next) => {
  try {
    const { shift } = req.query
    if (!shift || !['AM', 'PM', 'NIGHT'].includes(shift)) {
      return res.status(400).json({ error: 'shift query param required (AM | PM | NIGHT)' })
    }

    const today = new Date().toISOString().slice(0, 10)

    // Fetch all active clients
    const { data: clients, error: clientsErr } = await supabase
      .from('clients')
      .select('id, full_name, room_number, photo_url')
      .eq('is_active', true)
      .order('room_number')

    if (clientsErr) throw clientsErr

    // Fetch all active medications for those clients
    const clientIds = clients.map(c => c.id)
    const { data: medications, error: medErr } = await supabase
      .from('medications')
      .select('id, client_id, medication_name, dosage, frequency, route')
      .eq('is_active', true)
      .in('client_id', clientIds)

    if (medErr) throw medErr

    // Fetch today's MAR entries for this shift
    const { data: entries, error: entryErr } = await supabase
      .from('mar_entries')
      .select('id, client_id, medication_id, status, refusal_reason, notes, administered_by, administered_at')
      .eq('shift', shift)
      .gte('administered_at', `${today}T00:00:00Z`)
      .lte('administered_at', `${today}T23:59:59Z`)

    if (entryErr) throw entryErr

    // Fetch stock levels for alert indicators
    const { data: stock } = await supabase
      .from('stock')
      .select('medication_id, client_id, current_quantity, reorder_threshold, unit')
      .in('client_id', clientIds)

    // Build a lookup: entryKey = `${clientId}_${medicationId}`
    const entryMap = {}
    for (const e of entries) {
      entryMap[`${e.client_id}_${e.medication_id}`] = e
    }

    const stockMap = {}
    for (const s of (stock || [])) {
      stockMap[`${s.client_id}_${s.medication_id}`] = s
    }

    // Assemble response: clients with their meds + statuses
    const result = clients.map(client => {
      const meds = medications
        .filter(m => m.client_id === client.id)
        .map(m => {
          const key = `${client.id}_${m.id}`
          const entry = entryMap[key] || null
          const stockInfo = stockMap[key] || null
          return {
            ...m,
            entry,
            stock: stockInfo,
            status: entry?.status || 'pending',
          }
        })

      const total    = meds.length
      const given    = meds.filter(m => m.status === 'given').length
      const refused  = meds.filter(m => m.status === 'refused').length
      const pending  = meds.filter(m => m.status === 'pending').length

      return { ...client, medications: meds, total, given, refused, pending }
    })

    const overallTotal  = result.reduce((s, c) => s + c.total, 0)
    const overallGiven  = result.reduce((s, c) => s + c.given, 0)

    res.json({ clients: result, shift, date: today, overallTotal, overallGiven })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/mar/entry — record a medication administration
router.post('/entry', requireRole('staff', 'supervisor', 'manager'), async (req, res, next) => {
  try {
    const { client_id, medication_id, shift, status, refusal_reason, notes } = req.body

    if (!client_id || !medication_id || !shift || !status) {
      return res.status(400).json({ error: 'client_id, medication_id, shift, and status are required.' })
    }

    if (!['given', 'refused', 'missed', 'not_required'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' })
    }

    if (status === 'refused' && !refusal_reason) {
      return res.status(400).json({ error: 'refusal_reason is required when status is refused.' })
    }

    // Check for duplicate entry for this shift today (MAR is append-only but prevent double-tapping)
    const today = new Date().toISOString().slice(0, 10)
    const { data: existing } = await supabase
      .from('mar_entries')
      .select('id')
      .eq('client_id', client_id)
      .eq('medication_id', medication_id)
      .eq('shift', shift)
      .gte('administered_at', `${today}T00:00:00Z`)
      .lte('administered_at', `${today}T23:59:59Z`)
      .single()

    if (existing) {
      return res.status(409).json({ error: 'A MAR entry already exists for this medication this shift.' })
    }

    const { data: entry, error } = await supabase
      .from('mar_entries')
      .insert({
        client_id,
        medication_id,
        administered_by: req.user.id,
        shift,
        status,
        refusal_reason: refusal_reason || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) throw error

    // Fetch updated stock level (deducted by trigger if status=given)
    const { data: stockData } = await supabase
      .from('stock')
      .select('current_quantity, reorder_threshold, unit')
      .eq('client_id', client_id)
      .eq('medication_id', medication_id)
      .single()

    const stockAlert = stockData && stockData.current_quantity <= stockData.reorder_threshold

    res.status(201).json({ entry, stockAlert, stock: stockData })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/mar/client/:clientId?shift=AM — single client's MAR detail
router.get('/client/:clientId', async (req, res, next) => {
  try {
    const { clientId } = req.params
    const { shift } = req.query
    const today = new Date().toISOString().slice(0, 10)

    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('id, full_name, room_number, date_of_birth, notes')
      .eq('id', clientId)
      .single()

    if (clientErr || !client) return res.status(404).json({ error: 'Client not found.' })

    const { data: medications } = await supabase
      .from('medications')
      .select('id, medication_name, dosage, frequency, route, prescriber')
      .eq('client_id', clientId)
      .eq('is_active', true)

    const query = supabase
      .from('mar_entries')
      .select('id, medication_id, status, refusal_reason, notes, administered_by, administered_at, users(full_name)')
      .eq('client_id', clientId)
      .gte('administered_at', `${today}T00:00:00Z`)
      .lte('administered_at', `${today}T23:59:59Z`)

    if (shift) query.eq('shift', shift)

    const { data: entries } = await query

    res.json({ client, medications, entries: entries || [] })
  } catch (err) {
    next(err)
  }
})

export default router
