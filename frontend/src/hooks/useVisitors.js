import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const VISITOR_SELECT = `
  id, visitor_name, purpose, sign_in_time, sign_out_time,
  clients!visitors_visiting_client_id_fkey(id, full_name, room_number),
  users!visitors_signed_in_by_fkey(full_name)
`

export function useVisitors() {
  const [active, setActive]   = useState(null)   // currently signed-in visitors
  const [history, setHistory] = useState(null)   // signed-out visitors
  const [clients, setClients] = useState([])     // for the sign-in dropdown
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const fetchClients = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('clients')
      .select('id, full_name, room_number')
      .eq('is_active', true)
      .order('room_number')
    if (err) throw err
    setClients(data || [])
    return data || []
  }, [])

  const fetchActive = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('visitors')
      .select(VISITOR_SELECT)
      .is('sign_out_time', null)
      .order('sign_in_time', { ascending: false })
    if (err) throw err
    setActive(data || [])
  }, [])

  const fetchHistory = useCallback(async (date = null) => {
    let query = supabase
      .from('visitors')
      .select(VISITOR_SELECT)
      .not('sign_out_time', 'is', null)
      .order('sign_in_time', { ascending: false })
      .limit(100)

    if (date) {
      query = query
        .gte('sign_in_time', `${date}T00:00:00Z`)
        .lte('sign_in_time', `${date}T23:59:59Z`)
    }

    const { data, error: err } = await query
    if (err) throw err
    setHistory(data || [])
  }, [])

  const fetchAll = useCallback(async (date = null) => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([fetchActive(), fetchHistory(date), fetchClients()])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fetchActive, fetchHistory, fetchClients])

  const signIn = useCallback(async ({ visitor_name, visiting_client_id, purpose, userId }) => {
    const { data, error: err } = await supabase
      .from('visitors')
      .insert({
        visitor_name:       visitor_name.trim(),
        visiting_client_id,
        purpose:            purpose.trim(),
        signed_in_by:       userId,
      })
      .select(VISITOR_SELECT)
      .single()

    if (err) throw err

    setActive(prev => (prev ? [data, ...prev] : [data]))
    return data
  }, [])

  const signOut = useCallback(async (visitorId) => {
    const now = new Date().toISOString()

    const { data, error: err } = await supabase
      .from('visitors')
      .update({ sign_out_time: now })
      .eq('id', visitorId)
      .select(VISITOR_SELECT)
      .single()

    if (err) throw err

    // Move from active → history
    setActive(prev  => (prev  ? prev.filter(v => v.id !== visitorId) : prev))
    setHistory(prev => (prev  ? [data, ...prev] : [data]))
    return data
  }, [])

  const exportCsv = useCallback(async (from, to, token) => {
    const res = await fetch(`${API}/api/visitors/export?from=${from}&to=${to}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `HTTP ${res.status}`)
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `visitor-log-${from}-to-${to}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [])

  return {
    active, history, clients,
    loading, error,
    fetchAll, fetchActive, fetchHistory, fetchClients,
    signIn, signOut, exportCsv,
  }
}
