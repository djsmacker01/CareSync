import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const CHECK_TYPES = ['fire_door', 'extinguisher', 'alarm_test', 'evacuation_drill']

export function useDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const today        = new Date().toISOString().slice(0, 10)
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

      const [
        marRes,
        activeMedsRes,
        stockRes,
        fireRes,
        visitorsRes,
        tasksRes,
        taskCompRes,
        refusalsRes,
        handoverRes,
      ] = await Promise.all([
        supabase.from('mar_entries').select('id, status')
          .gte('administered_at', `${today}T00:00:00Z`)
          .lte('administered_at', `${today}T23:59:59Z`),

        supabase.from('medications').select('id').eq('is_active', true),

        supabase.from('stock').select(`
          id, current_quantity, reorder_threshold, unit,
          medications(medication_name, dosage),
          clients(full_name, room_number)
        `),

        supabase.from('fire_safety_checks')
          .select('check_type, next_due_date, status')
          .order('check_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(50),

        supabase.from('visitors').select('id, sign_out_time')
          .gte('sign_in_time', `${today}T00:00:00Z`)
          .lte('sign_in_time', `${today}T23:59:59Z`),

        supabase.from('tasks').select('id, shift').eq('is_active', true),

        supabase.from('task_completions').select('task_id, shift').eq('completion_date', today),

        supabase.from('mar_entries').select(`
          id, refusal_reason, administered_at, shift,
          clients!mar_entries_client_id_fkey(full_name),
          medications!mar_entries_medication_id_fkey(medication_name)
        `)
          .eq('status', 'refused')
          .gte('administered_at', `${sevenDaysAgo}T00:00:00Z`)
          .order('administered_at', { ascending: false })
          .limit(10),

        supabase.from('handover_notes')
          .select('shift, content, flags, created_at, users!handover_notes_written_by_fkey(full_name)')
          .eq('shift_date', today),
      ])

      // Fail fast if any query returned a Supabase error (RLS block, network, etc.)
      const queryErrors = [
        marRes, activeMedsRes, stockRes, fireRes, visitorsRes,
        tasksRes, taskCompRes, refusalsRes, handoverRes,
      ].map(r => r.error?.message).filter(Boolean)
      if (queryErrors.length) throw new Error(queryErrors[0])

      // MAR
      const marEntries  = marRes.data || []
      const marGiven    = marEntries.filter(e => e.status === 'given').length
      const marRefused  = marEntries.filter(e => e.status === 'refused').length
      const marMissed   = marEntries.filter(e => e.status === 'missed').length
      const marExpected = (activeMedsRes.data || []).length

      // Stock
      const lowStock = (stockRes.data || [])
        .filter(s => s.current_quantity <= s.reorder_threshold)
        .sort((a, b) => a.current_quantity - b.current_quantity)

      // Fire
      const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0)
      const fireByType = {}
      for (const c of (fireRes.data || [])) {
        if (!fireByType[c.check_type]) fireByType[c.check_type] = c
      }
      const fireOverdue = CHECK_TYPES.filter(type => {
        const latest = fireByType[type]
        return latest?.next_due_date ? new Date(latest.next_due_date) < todayDate : true
      }).length

      // Visitors
      const visitorsToday  = (visitorsRes.data || []).length
      const visitorsActive = (visitorsRes.data || []).filter(v => !v.sign_out_time).length

      // Tasks
      const tasks = tasksRes.data || []
      const comps = taskCompRes.data || []
      const amExpected = tasks.filter(t => ['AM', 'BOTH'].includes(t.shift)).length
      const pmExpected = tasks.filter(t => ['PM', 'BOTH'].includes(t.shift)).length
      const amDone     = comps.filter(c => c.shift === 'AM').length
      const pmDone     = comps.filter(c => c.shift === 'PM').length

      setData({
        mar: { given: marGiven, refused: marRefused, missed: marMissed, expected: marExpected },
        lowStock,
        fire:     { overdue: fireOverdue },
        visitors: { today: visitorsToday, active: visitorsActive },
        tasks: {
          am: { expected: amExpected, done: Math.min(amDone, amExpected) },
          pm: { expected: pmExpected, done: Math.min(pmDone, pmExpected) },
        },
        refusals:      refusalsRes.data || [],
        handoverNotes: handoverRes.data || [],
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetchSummary }
}
