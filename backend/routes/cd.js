import { Router } from 'express'
import { supabase } from '../utils/supabase.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// ── GET /api/cd/clients/:clientId/drugs
// List all CD drugs for a client (active by default)
router.get('/clients/:clientId/drugs', async (req, res, next) => {
  try {
    const { clientId } = req.params
    const { include_inactive } = req.query

    let query = supabase
      .from('controlled_drugs')
      .select('id, name, strength, form, cd_schedule, unit, current_stock, is_active, created_at')
      .eq('client_id', clientId)
      .order('name')

    if (!include_inactive) query = query.eq('is_active', true)

    const { data, error } = await query
    if (error) throw error

    res.json({ drugs: data })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/cd/clients/:clientId/register?drug_id=&limit=50&offset=0
// Paginated register ledger for a client, optionally filtered by drug
router.get('/clients/:clientId/register', async (req, res, next) => {
  try {
    const { clientId }  = req.params
    const { drug_id, limit = 50, offset = 0 } = req.query

    let query = supabase
      .from('cd_register')
      .select(`
        id, entry_type, quantity_in, quantity_out, balance_after,
        administered_at, notes, witness_name,
        administered_by:users!cd_register_administered_by_fkey(id, full_name),
        witnessed_by:users!cd_register_witnessed_by_fkey(id, full_name),
        drug:controlled_drugs(id, name, strength, unit)
      `)
      .eq('client_id', clientId)
      .order('administered_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1)

    if (drug_id) query = query.eq('drug_id', drug_id)

    const { data, error, count } = await query
    if (error) throw error

    res.json({ entries: data, total: count })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/cd/clients/:clientId/drugs
// Add a new CD drug to a client's register (supervisor+ only)
router.post(
  '/clients/:clientId/drugs',
  requireRole('supervisor', 'manager'),
  async (req, res, next) => {
    try {
      const { clientId } = req.params
      const { name, strength, form, cd_schedule, unit, initial_stock = 0 } = req.body

      if (!name?.trim())     return res.status(400).json({ error: 'Drug name is required.' })
      if (!strength?.trim()) return res.status(400).json({ error: 'Strength is required.' })
      if (!form?.trim())     return res.status(400).json({ error: 'Form is required.' })
      if (![2, 3].includes(Number(cd_schedule))) {
        return res.status(400).json({ error: 'cd_schedule must be 2 or 3.' })
      }

      const { data: drug, error } = await supabase
        .from('controlled_drugs')
        .insert({
          client_id:     clientId,
          name:          name.trim(),
          strength:      strength.trim(),
          form:          form.trim(),
          cd_schedule:   Number(cd_schedule),
          unit:          unit || 'ml',
          current_stock: Number(initial_stock),
          created_by:    req.user.id,
        })
        .select()
        .single()

      if (error) throw error
      res.status(201).json({ drug })
    } catch (err) {
      next(err)
    }
  }
)

// ── POST /api/cd/entry
// Add a register entry with running balance (optimistic-locked)
router.post('/entry', async (req, res, next) => {
  try {
    const {
      drug_id, client_id,
      entry_type,
      quantity_in, quantity_out,
      witnessed_by, witness_name,
      administered_at,
      notes,
    } = req.body

    // ── Validation ────────────────────────────────────────────
    if (!drug_id)    return res.status(400).json({ error: 'drug_id is required.' })
    if (!client_id)  return res.status(400).json({ error: 'client_id is required.' })
    if (!['received', 'administered', 'wasted', 'returned'].includes(entry_type)) {
      return res.status(400).json({ error: 'Invalid entry_type.' })
    }

    if (entry_type === 'received' && !quantity_in) {
      return res.status(400).json({ error: 'quantity_in is required for received entries.' })
    }
    if (['administered', 'wasted', 'returned'].includes(entry_type) && !quantity_out) {
      return res.status(400).json({ error: 'quantity_out is required for this entry type.' })
    }
    if (['administered', 'wasted'].includes(entry_type) && !witnessed_by && !witness_name) {
      return res.status(400).json({ error: 'A witness is required for administered and wasted entries.' })
    }

    // ── Fetch current drug (with current_stock for optimistic lock) ──
    const { data: drug, error: drugErr } = await supabase
      .from('controlled_drugs')
      .select('id, current_stock, unit, name')
      .eq('id', drug_id)
      .single()

    if (drugErr || !drug) return res.status(404).json({ error: 'CD drug not found.' })

    const oldStock = Number(drug.current_stock)

    // ── Calculate new balance ─────────────────────────────────
    let newBalance
    if (entry_type === 'received') {
      newBalance = oldStock + Number(quantity_in)
    } else {
      const qty = Number(quantity_out)
      if (qty > oldStock) {
        return res.status(400).json({
          error: `Cannot record ${qty} ${drug.unit} — only ${oldStock} ${drug.unit} in stock.`,
        })
      }
      newBalance = oldStock - qty
    }

    newBalance = Math.round(newBalance * 100) / 100  // 2dp precision

    // ── Insert register entry ─────────────────────────────────
    const { data: entry, error: insertErr } = await supabase
      .from('cd_register')
      .insert({
        drug_id,
        client_id,
        entry_type,
        quantity_in:     entry_type === 'received' ? Number(quantity_in) : null,
        quantity_out:    entry_type !== 'received' ? Number(quantity_out) : null,
        balance_after:   newBalance,
        administered_by: req.user.id,
        witnessed_by:    witnessed_by || null,
        witness_name:    witness_name || null,
        administered_at: administered_at || new Date().toISOString(),
        notes:           notes || null,
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    // ── Optimistic-lock UPDATE on current_stock ───────────────
    // If another request updated stock concurrently, this update
    // matches 0 rows — we surface a 409 so the client can refresh.
    const { error: updateErr, count: updated } = await supabase
      .from('controlled_drugs')
      .update({ current_stock: newBalance })
      .eq('id', drug_id)
      .eq('current_stock', oldStock)   // optimistic lock predicate

    if (updateErr) throw updateErr

    if (updated === 0) {
      // Concurrent write — the register entry is already saved (audit trail
      // preserved). Tell the client to reload to get the correct balance.
      return res.status(409).json({
        error: 'Stock balance was updated concurrently. Please reload and re-enter.',
        entry,
      })
    }

    res.status(201).json({ entry, new_balance: newBalance })
  } catch (err) {
    next(err)
  }
})

export default router
