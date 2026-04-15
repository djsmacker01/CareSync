import { Router } from 'express'
import { supabase } from '../utils/supabase.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// ── GET /api/stock — all clients with stock levels
router.get('/', async (req, res, next) => {
  try {
    const { data: clients, error: cErr } = await supabase
      .from('clients')
      .select('id, full_name, room_number')
      .eq('is_active', true)
      .order('room_number')
    if (cErr) throw cErr

    const clientIds = clients.map(c => c.id)

    const { data: stock, error: sErr } = await supabase
      .from('stock')
      .select(`
        id, current_quantity, unit, reorder_threshold,
        last_checked_at,
        medication_id, client_id,
        medications(id, medication_name, dosage, frequency, route),
        last_checked_by_user:users!stock_last_checked_by_fkey(full_name)
      `)
      .in('client_id', clientIds)
    if (sErr) throw sErr

    // Group stock by client
    const stockByClient = {}
    for (const s of (stock || [])) {
      if (!stockByClient[s.client_id]) stockByClient[s.client_id] = []
      stockByClient[s.client_id].push(s)
    }

    const result = clients.map(c => ({
      ...c,
      stock: (stockByClient[c.id] || []).sort((a, b) =>
        a.medications?.medication_name.localeCompare(b.medications?.medication_name)
      ),
    }))

    const alertCount = (stock || []).filter(s => s.current_quantity <= s.reorder_threshold).length

    res.json({ clients: result, alertCount })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/stock/:stockId/transactions — transaction history for one stock record
router.get('/:stockId/transactions', async (req, res, next) => {
  try {
    const { stockId } = req.params
    const { data, error } = await supabase
      .from('stock_transactions')
      .select('id, transaction_type, quantity_change, notes, created_at, users!stock_transactions_performed_by_fkey(full_name)')
      .eq('stock_id', stockId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    res.json({ transactions: data })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/stock/:stockId/transaction — record received / disposed / adjustment
router.post('/:stockId/transaction', requireRole('manager', 'supervisor'), async (req, res, next) => {
  try {
    const { stockId } = req.params
    const { transaction_type, quantity, notes } = req.body

    if (!transaction_type || quantity === undefined) {
      return res.status(400).json({ error: 'transaction_type and quantity are required.' })
    }
    if (!['received', 'disposed', 'adjustment'].includes(transaction_type)) {
      return res.status(400).json({ error: 'Invalid transaction_type.' })
    }
    if (typeof quantity !== 'number' || quantity === 0) {
      return res.status(400).json({ error: 'quantity must be a non-zero number.' })
    }

    // Fetch current stock
    const { data: stockRow, error: fetchErr } = await supabase
      .from('stock')
      .select('id, current_quantity, unit')
      .eq('id', stockId)
      .single()
    if (fetchErr || !stockRow) return res.status(404).json({ error: 'Stock record not found.' })

    // For disposed/adjustment, quantity is negative; for received, positive
    const delta =
      transaction_type === 'received'   ?  Math.abs(quantity) :
      transaction_type === 'disposed'   ? -Math.abs(quantity) :
      quantity  // adjustment can be positive or negative

    const newQty = stockRow.current_quantity + delta
    if (newQty < 0) {
      return res.status(400).json({ error: `Cannot reduce stock below 0. Current: ${stockRow.current_quantity} ${stockRow.unit}.` })
    }

    // Update stock
    const { error: updateErr } = await supabase
      .from('stock')
      .update({
        current_quantity: newQty,
        last_checked_by: req.user.id,
        last_checked_at: new Date().toISOString(),
      })
      .eq('id', stockId)
    if (updateErr) throw updateErr

    // Log transaction
    const { data: tx, error: txErr } = await supabase
      .from('stock_transactions')
      .insert({
        stock_id:         stockId,
        transaction_type,
        quantity_change:  delta,
        performed_by:     req.user.id,
        notes:            notes || null,
      })
      .select()
      .single()
    if (txErr) throw txErr

    res.status(201).json({ transaction: tx, new_quantity: newQty })
  } catch (err) {
    next(err)
  }
})

export default router
