import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useStock() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
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
          id, current_quantity, unit, reorder_threshold, last_checked_at,
          medication_id, client_id,
          medications(id, medication_name, dosage, frequency, route)
        `)
        .in('client_id', clientIds)
      if (sErr) throw sErr

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
      setData({ clients: result, alertCount })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTransactions = useCallback(async (stockId) => {
    const { data, error } = await supabase
      .from('stock_transactions')
      .select(`
        id, transaction_type, quantity_change, notes, created_at,
        users!stock_transactions_performed_by_fkey(full_name)
      `)
      .eq('stock_id', stockId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data
  }, [])

  const recordTransaction = useCallback(async ({ stockId, transaction_type, quantity, notes, performedBy }) => {
    // Fetch current stock
    const { data: stockRow, error: fetchErr } = await supabase
      .from('stock')
      .select('id, current_quantity, unit, reorder_threshold')
      .eq('id', stockId)
      .single()
    if (fetchErr) throw fetchErr

    const delta =
      transaction_type === 'received'  ?  Math.abs(quantity) :
      transaction_type === 'disposed'  ? -Math.abs(quantity) :
      quantity  // adjustment

    const newQty = stockRow.current_quantity + delta
    if (newQty < 0) throw new Error(`Cannot go below 0. Current stock: ${stockRow.current_quantity} ${stockRow.unit}.`)

    // Update stock
    const { error: updateErr } = await supabase
      .from('stock')
      .update({ current_quantity: newQty, last_checked_by: performedBy, last_checked_at: new Date().toISOString() })
      .eq('id', stockId)
    if (updateErr) throw updateErr

    // Log transaction
    const { error: txErr } = await supabase
      .from('stock_transactions')
      .insert({ stock_id: stockId, transaction_type, quantity_change: delta, performed_by: performedBy, notes: notes || null })
    if (txErr) throw txErr

    // Update local state
    setData(prev => {
      if (!prev) return prev
      const clients = prev.clients.map(c => ({
        ...c,
        stock: c.stock.map(s => s.id === stockId ? { ...s, current_quantity: newQty } : s),
      }))
      const alertCount = clients.flatMap(c => c.stock).filter(s => s.current_quantity <= s.reorder_threshold).length
      return { ...prev, clients, alertCount }
    })

    return newQty
  }, [])

  return { data, loading, error, fetchAll, fetchTransactions, recordTransaction }
}
