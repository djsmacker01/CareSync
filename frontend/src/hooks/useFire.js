import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { DoorOpen, ShieldCheck, Bell, PersonStanding } from 'lucide-react'

export const CHECK_TYPES = ['fire_door', 'extinguisher', 'alarm_test', 'evacuation_drill']

export const CHECK_META = {
  fire_door:        { label: 'Fire Door Check',    Icon: DoorOpen,        intervalDays: 7  },
  extinguisher:     { label: 'Extinguisher Check', Icon: ShieldCheck,     intervalDays: 30 },
  alarm_test:       { label: 'Alarm Test',         Icon: Bell,            intervalDays: 7  },
  evacuation_drill: { label: 'Evacuation Drill',   Icon: PersonStanding,  intervalDays: 90 },
}

export function useFire() {
  const [status, setStatus]   = useState(null)   // [ { check_type, latest, overdue } ]
  const [history, setHistory] = useState(null)   // [ check, ... ]
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('fire_safety_checks')
        .select('*, users!fire_safety_checks_checked_by_fkey(full_name)')
        .order('check_date', { ascending: false })
        .order('created_at',  { ascending: false })
        .limit(200)

      if (fetchErr) throw fetchErr

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const checks = CHECK_TYPES.map(type => {
        const latest = (data || []).find(c => c.check_type === type) || null
        const overdue = latest?.next_due_date
          ? new Date(latest.next_due_date) < today
          : true
        return { check_type: type, latest, overdue }
      })

      setStatus(checks)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async (type = null, limit = 30) => {
    try {
      let query = supabase
        .from('fire_safety_checks')
        .select('*, users!fire_safety_checks_checked_by_fkey(full_name)')
        .order('check_date', { ascending: false })
        .order('created_at',  { ascending: false })
        .limit(limit)

      if (type) query = query.eq('check_type', type)

      const { data, error: fetchErr } = await query
      if (fetchErr) throw fetchErr

      setHistory(data || [])
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const logCheck = useCallback(async ({ check_type, status: checkStatus, notes, userId }) => {
    const { data, error: insertErr } = await supabase
      .from('fire_safety_checks')
      .insert({ check_type, checked_by: userId, status: checkStatus, notes: notes?.trim() || null })
      .select('*, users!fire_safety_checks_checked_by_fkey(full_name)')
      .single()

    if (insertErr) throw insertErr

    // Update status state optimistically
    setStatus(prev => {
      if (!prev) return prev
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return prev.map(c => {
        if (c.check_type !== check_type) return c
        const overdue = data.next_due_date ? new Date(data.next_due_date) < today : true
        return { ...c, latest: data, overdue }
      })
    })

    // Prepend to history if loaded
    setHistory(prev => (prev ? [data, ...prev] : null))

    return data
  }, [])

  return { status, history, loading, error, fetchStatus, fetchHistory, logCheck }
}
