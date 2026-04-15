import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { enqueue } from '../lib/offlineQueue'

export function useMAR() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const fetchToday = useCallback(async (shift) => {
    setLoading(true)
    setError(null)
    try {
      const today = new Date().toISOString().slice(0, 10)

      // Fetch clients
      const { data: clients, error: cErr } = await supabase
        .from('clients')
        .select('id, full_name, room_number, photo_url')
        .eq('is_active', true)
        .order('room_number')
      if (cErr) throw cErr

      const clientIds = clients.map(c => c.id)

      // Fetch active medications
      const { data: medications, error: mErr } = await supabase
        .from('medications')
        .select('id, client_id, medication_name, dosage, frequency, route')
        .eq('is_active', true)
        .in('client_id', clientIds)
      if (mErr) throw mErr

      // Fetch today's MAR entries for this shift
      const { data: entries, error: eErr } = await supabase
        .from('mar_entries')
        .select('id, client_id, medication_id, status, refusal_reason, notes, administered_by, administered_at')
        .eq('shift', shift)
        .gte('administered_at', `${today}T00:00:00Z`)
        .lte('administered_at', `${today}T23:59:59Z`)
      if (eErr) throw eErr

      // Fetch stock levels
      const { data: stock } = await supabase
        .from('stock')
        .select('medication_id, client_id, current_quantity, reorder_threshold, unit')
        .in('client_id', clientIds)

      // Build lookup maps
      const entryMap = {}
      for (const e of (entries || [])) {
        entryMap[`${e.client_id}_${e.medication_id}`] = e
      }
      const stockMap = {}
      for (const s of (stock || [])) {
        stockMap[`${s.client_id}_${s.medication_id}`] = s
      }

      // Assemble
      const result = clients.map(client => {
        const meds = medications
          .filter(m => m.client_id === client.id)
          .map(m => {
            const entry = entryMap[`${client.id}_${m.id}`] || null
            return {
              ...m,
              entry,
              stock: stockMap[`${client.id}_${m.id}`] || null,
              status: entry?.status || 'pending',
            }
          })

        return {
          ...client,
          medications: meds,
          total:   meds.length,
          given:   meds.filter(m => m.status === 'given').length,
          refused: meds.filter(m => m.status === 'refused').length,
          pending: meds.filter(m => m.status === 'pending').length,
        }
      })

      const overallTotal = result.reduce((s, c) => s + c.total, 0)
      const overallGiven = result.reduce((s, c) => s + c.given, 0)

      setData({ clients: result, shift, date: today, overallTotal, overallGiven })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Optimistic local state update (shared by online + offline paths) ──
  function applyOptimisticEntry({ client_id, medication_id, status, refusal_reason, entry }) {
    setData(prev => {
      if (!prev) return prev
      const clients = prev.clients.map(c => {
        if (c.id !== client_id) return c
        const meds = c.medications.map(m => {
          if (m.id !== medication_id) return m
          return { ...m, status, entry: entry || null, refusal_reason }
        })
        return {
          ...c,
          medications: meds,
          given:   meds.filter(m => m.status === 'given').length,
          refused: meds.filter(m => m.status === 'refused').length,
          pending: meds.filter(m => m.status === 'pending').length,
        }
      })
      const overallGiven = clients.reduce((s, c) => s + c.given, 0)
      return { ...prev, clients, overallGiven }
    })
  }

  // Record a MAR entry — writes directly when online, queues when offline.
  const recordEntry = useCallback(async ({ client_id, medication_id, shift, status, refusal_reason, notes, administered_by, clientName, medicationName }) => {
    // ── Offline path ─────────────────────────────────────────────
    if (!navigator.onLine) {
      await enqueue({
        label:    `MAR · ${clientName || 'Resident'} · ${medicationName || 'Medication'} · ${status}`,
        endpoint: '/api/mar/entry',
        method:   'POST',
        body:     { client_id, medication_id, shift, status, refusal_reason: refusal_reason || null, notes: notes || null },
      })
      // Apply optimistic update with a synthetic 'pending_sync' marker
      applyOptimisticEntry({ client_id, medication_id, status, refusal_reason, entry: { _pending: true } })
      return { _pending: true }
    }

    // ── Online path ───────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10)

    // Prevent duplicate
    const { data: existing } = await supabase
      .from('mar_entries')
      .select('id')
      .eq('client_id', client_id)
      .eq('medication_id', medication_id)
      .eq('shift', shift)
      .gte('administered_at', `${today}T00:00:00Z`)
      .lte('administered_at', `${today}T23:59:59Z`)
      .maybeSingle()

    if (existing) throw new Error('Already recorded for this shift.')

    const { data: entry, error } = await supabase
      .from('mar_entries')
      .insert({ client_id, medication_id, administered_by, shift, status, refusal_reason: refusal_reason || null, notes: notes || null })
      .select()
      .single()

    if (error) throw error

    applyOptimisticEntry({ client_id, medication_id, status, refusal_reason, entry })
    return entry
  }, [])

  return { data, loading, error, fetchToday, recordEntry }
}
