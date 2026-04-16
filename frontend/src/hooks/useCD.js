import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useCD() {
  const { user } = useAuth()
  const [drugs,   setDrugs]   = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // ── Fetch CD drugs for a client ───────────────────────────────
  const fetchDrugs = useCallback(async (clientId) => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('controlled_drugs')
        .select('id, name, strength, form, cd_schedule, unit, current_stock, is_active')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('name')

      if (err) throw err
      setDrugs(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Fetch register ledger for a client (optionally by drug) ───
  const fetchRegister = useCallback(async (clientId, drugId = null) => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('cd_register')
        .select(`
          id, entry_type, quantity_in, quantity_out, balance_after,
          administered_at, notes, witness_name,
          administered_by:users!cd_register_administered_by_fkey(id, full_name),
          witnessed_by:users!cd_register_witnessed_by_fkey(id, full_name),
          drug:controlled_drugs!cd_register_drug_id_fkey(id, name, strength, unit)
        `)
        .eq('client_id', clientId)
        .order('administered_at', { ascending: false })
        .limit(100)

      if (drugId) query = query.eq('drug_id', drugId)

      const { data, error: err } = await query
      if (err) throw err
      setEntries(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Add a new CD drug to a client (supervisor / manager only) ─
  const addDrug = useCallback(async (clientId, form) => {
    const { data: drug, error: err } = await supabase
      .from('controlled_drugs')
      .insert({
        client_id:     clientId,
        name:          form.name.trim(),
        strength:      form.strength.trim(),
        form:          form.form,
        cd_schedule:   Number(form.cd_schedule),
        unit:          form.unit || 'ml',
        current_stock: Number(form.initial_stock) || 0,
        is_active:     true,
      })
      .select()
      .single()

    if (err) throw err
    setDrugs(prev => [...prev, drug].sort((a, b) => a.name.localeCompare(b.name)))
    return drug
  }, [])

  // ── Add a register entry with running balance ─────────────────
  // Uses optimistic locking: the UPDATE only matches if current_stock
  // hasn't changed since we read it, preventing concurrent balance errors.
  const addEntry = useCallback(async (payload) => {
    const {
      drug_id, client_id, entry_type,
      quantity_in, quantity_out,
      witnessed_by, witness_name,
      administered_at, notes,
    } = payload

    // 1. Read current stock (for balance calculation + optimistic lock)
    const { data: drug, error: drugErr } = await supabase
      .from('controlled_drugs')
      .select('current_stock, unit, name')
      .eq('id', drug_id)
      .single()

    if (drugErr) throw drugErr

    const oldStock = Number(drug.current_stock)
    const isReceived = entry_type === 'received'
    const qty = isReceived ? Number(quantity_in) : Number(quantity_out)

    if (!isReceived && qty > oldStock) {
      throw new Error(`Cannot record ${qty} ${drug.unit} — only ${oldStock} ${drug.unit} in stock.`)
    }

    const newBalance = Math.round((isReceived ? oldStock + qty : oldStock - qty) * 100) / 100

    // 2. Insert the register entry
    const { data: entry, error: insertErr } = await supabase
      .from('cd_register')
      .insert({
        drug_id,
        client_id,
        entry_type,
        quantity_in:     isReceived ? qty : null,
        quantity_out:    !isReceived ? qty : null,
        balance_after:   newBalance,
        administered_by: user?.id,
        witnessed_by:    witnessed_by || null,
        witness_name:    witness_name || null,
        administered_at: administered_at || new Date().toISOString(),
        notes:           notes || null,
      })
      .select(`
        id, entry_type, quantity_in, quantity_out, balance_after,
        administered_at, notes, witness_name,
        administered_by:users!cd_register_administered_by_fkey(id, full_name),
        witnessed_by:users!cd_register_witnessed_by_fkey(id, full_name),
        drug:controlled_drugs!cd_register_drug_id_fkey(id, name, strength, unit)
      `)
      .single()

    if (insertErr) throw insertErr

    // 3. Optimistic-lock UPDATE on current_stock
    const { error: updateErr, count: updated } = await supabase
      .from('controlled_drugs')
      .update({ current_stock: newBalance })
      .eq('id', drug_id)
      .eq('current_stock', oldStock)  // lock predicate

    if (updateErr) throw updateErr

    if (updated === 0) {
      throw new Error('Stock was updated concurrently. Please reload and try again.')
    }

    // 4. Update local state
    setDrugs(prev => prev.map(d =>
      d.id === drug_id ? { ...d, current_stock: newBalance } : d
    ))
    setEntries(prev => [entry, ...prev])

    return entry
  }, [])

  return {
    drugs, entries, loading, error,
    fetchDrugs, fetchRegister, addDrug, addEntry,
  }
}
