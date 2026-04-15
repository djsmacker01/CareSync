import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useTasks() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const fetchTasks = useCallback(async (shift, date) => {
    setLoading(true)
    setError(null)
    try {
      const today = date || new Date().toISOString().slice(0, 10)

      const { data: tasks, error: tErr } = await supabase
        .from('tasks')
        .select('id, title, description, shift, is_recurring, is_active')
        .eq('is_active', true)
        .in('shift', [shift, 'BOTH'])
        .order('shift')
      if (tErr) throw tErr

      const { data: completions, error: cErr } = await supabase
        .from('task_completions')
        .select('id, task_id, shift, completed_at, notes, users!task_completions_completed_by_fkey(full_name)')
        .eq('completion_date', today)
        .eq('shift', shift)
      if (cErr) throw cErr

      const completionMap = {}
      for (const c of (completions || [])) completionMap[c.task_id] = c

      const result = tasks.map(t => ({ ...t, completion: completionMap[t.id] || null, completed: !!completionMap[t.id] }))

      setData({ tasks: result, date: today, shift, total: result.length, completed: result.filter(t => t.completed).length })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const completeTask = useCallback(async ({ taskId, shift, notes, userId, date }) => {
    const today = date || new Date().toISOString().slice(0, 10)

    const { data: completion, error } = await supabase
      .from('task_completions')
      .insert({ task_id: taskId, completed_by: userId, shift, completion_date: today, notes: notes || null })
      .select('id, task_id, shift, completed_at, notes')
      .single()

    if (error) throw error

    // Optimistic update
    setData(prev => {
      if (!prev) return prev
      const tasks = prev.tasks.map(t =>
        t.id === taskId ? { ...t, completed: true, completion: { ...completion, users: { full_name: '' } } } : t
      )
      return { ...prev, tasks, completed: tasks.filter(t => t.completed).length }
    })
    return completion
  }, [])

  const uncompleteTask = useCallback(async ({ taskId, shift, userId, date }) => {
    const today = date || new Date().toISOString().slice(0, 10)

    const { error } = await supabase
      .from('task_completions')
      .delete()
      .eq('task_id', taskId)
      .eq('shift', shift)
      .eq('completion_date', today)
      .eq('completed_by', userId)

    if (error) throw error

    setData(prev => {
      if (!prev) return prev
      const tasks = prev.tasks.map(t => t.id === taskId ? { ...t, completed: false, completion: null } : t)
      return { ...prev, tasks, completed: tasks.filter(t => t.completed).length }
    })
  }, [])

  const createTask = useCallback(async ({ title, description, shift, is_recurring, userId }) => {
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ title, description: description || null, shift, is_recurring: is_recurring ?? true, created_by: userId })
      .select()
      .single()
    if (error) throw error
    return task
  }, [])

  const deactivateTask = useCallback(async (taskId) => {
    const { error } = await supabase.from('tasks').update({ is_active: false }).eq('id', taskId)
    if (error) throw error
    setData(prev => {
      if (!prev) return prev
      const tasks = prev.tasks.filter(t => t.id !== taskId)
      return { ...prev, tasks, total: tasks.length, completed: tasks.filter(t => t.completed).length }
    })
  }, [])

  const fetchHandoverData = useCallback(async (shift, date) => {
    const today = date || new Date().toISOString().slice(0, 10)

    const { data: tasks } = await supabase
      .from('tasks').select('id, title').eq('is_active', true).in('shift', [shift, 'BOTH'])

    const { data: completions } = await supabase
      .from('task_completions').select('task_id').eq('completion_date', today).eq('shift', shift)

    const completedIds = new Set((completions || []).map(c => c.task_id))
    const incompleteTasks = (tasks || []).filter(t => !completedIds.has(t.id))

    const { data: refusals } = await supabase
      .from('mar_entries')
      .select('refusal_reason, notes, clients(full_name), medications(medication_name, dosage)')
      .eq('shift', shift).eq('status', 'refused')
      .gte('administered_at', `${today}T00:00:00Z`).lte('administered_at', `${today}T23:59:59Z`)

    const { data: stock } = await supabase
      .from('stock')
      .select('current_quantity, unit, reorder_threshold, medications(medication_name, dosage), clients(full_name)')

    const stockAlerts = (stock || []).filter(s => s.current_quantity <= s.reorder_threshold)

    const { data: existing } = await supabase
      .from('handover_notes')
      .select('id, content, flags, created_at, users!handover_notes_written_by_fkey(full_name)')
      .eq('shift', shift).eq('shift_date', today).maybeSingle()

    return { incompleteTasks, refusals: refusals || [], stockAlerts, existing, date: today, shift }
  }, [])

  const saveHandover = useCallback(async ({ shift, date, content, flags, userId }) => {
    const today = date || new Date().toISOString().slice(0, 10)
    const { data: note, error } = await supabase
      .from('handover_notes')
      .upsert({ shift, shift_date: today, written_by: userId, content, flags: flags || [] }, { onConflict: 'shift,shift_date' })
      .select().single()
    if (error) throw error
    return note
  }, [])

  const fetchLatestHandover = useCallback(async (incomingShift) => {
    const prevShift = incomingShift === 'PM' ? 'AM' : 'PM'
    const today = new Date().toISOString().slice(0, 10)
    const { data: note } = await supabase
      .from('handover_notes')
      .select('id, content, flags, shift, shift_date, created_at, users!handover_notes_written_by_fkey(full_name)')
      .eq('shift', prevShift).eq('shift_date', today).maybeSingle()
    return note
  }, [])

  return { data, loading, error, fetchTasks, completeTask, uncompleteTask, createTask, deactivateTask, fetchHandoverData, saveHandover, fetchLatestHandover }
}
