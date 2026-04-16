import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useClients() {
  const [clients,  setClients]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  // ── Fetch all active service users ─────────────────────────────
  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('clients')
        .select(`
          id, full_name, room_number, date_of_birth, notes, is_active, created_at,
          key_worker:users!clients_key_worker_id_fkey(id, full_name),
          medications(id, medication_name, dosage, is_active)
        `)
        .eq('is_active', true)
        .order('room_number', { ascending: true, nullsFirst: false })
        .order('full_name')

      if (err) throw err
      setClients(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Fetch single client with full medication list ───────────────
  const fetchClient = useCallback(async (id) => {
    const { data, error: err } = await supabase
      .from('clients')
      .select(`
        id, full_name, room_number, date_of_birth, notes, is_active, created_at,
        key_worker:users!clients_key_worker_id_fkey(id, full_name),
        medications(
          id, medication_name, dosage, frequency, route, prescriber,
          start_date, end_date, is_active, created_at,
          stock(id, current_quantity, unit, reorder_threshold)
        )
      `)
      .eq('id', id)
      .single()

    if (err) throw err
    return data
  }, [])

  // ── Add a new service user ──────────────────────────────────────
  const addClient = useCallback(async ({ full_name, room_number, date_of_birth, notes }) => {
    const flat = room_number?.toString().replace(/\D/g, '').trim() || null
    const { data, error: err } = await supabase
      .from('clients')
      .insert({
        full_name:     full_name.trim(),
        room_number:   flat,
        date_of_birth: date_of_birth || null,
        notes:         notes?.trim() || null,
        is_active:     true,
      })
      .select()
      .single()

    if (err) throw err

    // Optimistic: prepend to list
    setClients(prev => prev ? [{ ...data, medications: [] }, ...prev] : [{ ...data, medications: [] }])
    return data
  }, [])

  // ── Update client details ───────────────────────────────────────
  const updateClient = useCallback(async (id, updates) => {
    const flat = updates.room_number?.toString().replace(/\D/g, '').trim() || null
    const { data, error: err } = await supabase
      .from('clients')
      .update({
        full_name:     updates.full_name?.trim(),
        room_number:   flat,
        date_of_birth: updates.date_of_birth || null,
        notes:         updates.notes?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (err) throw err

    setClients(prev =>
      prev ? prev.map(c => c.id === id ? { ...c, ...data } : c) : prev
    )
    return data
  }, [])

  // ── Add a new prescription + create the initial stock record ────
  const addMedication = useCallback(async ({
    client_id,
    medication_name,
    dosage,
    frequency,
    route,
    prescriber,
    start_date,
    initial_quantity,
    unit,
    reorder_threshold,
    performedBy,
  }) => {
    // 1. Insert medication
    const { data: med, error: medErr } = await supabase
      .from('medications')
      .insert({
        client_id,
        medication_name: medication_name.trim(),
        dosage:          dosage.trim(),
        frequency:       frequency.trim(),
        route:           route || 'oral',
        prescriber:      prescriber?.trim() || null,
        start_date:      start_date || new Date().toISOString().slice(0, 10),
        is_active:       true,
      })
      .select()
      .single()

    if (medErr) throw medErr

    // 2. Create initial stock record
    const qty = parseInt(initial_quantity, 10) || 0
    const threshold = parseInt(reorder_threshold, 10) || 7

    const { data: stockRow, error: stockErr } = await supabase
      .from('stock')
      .insert({
        medication_id:     med.id,
        client_id,
        current_quantity:  qty,
        unit:              unit || 'tablets',
        reorder_threshold: threshold,
        last_checked_by:   performedBy || null,
        last_checked_at:   new Date().toISOString(),
      })
      .select()
      .single()

    if (stockErr) throw stockErr

    // 3. Record initial stock receipt as a transaction
    if (qty > 0) {
      const { error: txErr } = await supabase
        .from('stock_transactions')
        .insert({
          stock_id:         stockRow.id,
          transaction_type: 'received',
          quantity_change:  qty,
          performed_by:     performedBy,
          notes:            `Initial stock on prescription start — ${med.medication_name}`,
        })
      if (txErr) throw txErr
    }

    return { ...med, stock: [stockRow] }
  }, [])

  // ── Discontinue a medication (soft-delete) ──────────────────────
  const discontinueMedication = useCallback(async (medicationId, endDate) => {
    const { error: err } = await supabase
      .from('medications')
      .update({
        is_active: false,
        end_date:  endDate || new Date().toISOString().slice(0, 10),
      })
      .eq('id', medicationId)

    if (err) throw err
  }, [])

  return {
    clients, loading, error,
    fetchClients, fetchClient,
    addClient, updateClient,
    addMedication, discontinueMedication,
  }
}
