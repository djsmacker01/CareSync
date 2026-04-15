import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export function useStaff() {
  const { session } = useAuth()
  const [staff, setStaff]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  function headers() {
    return {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    }
  }

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`${BACKEND}/api/staff`, { headers: headers() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load staff')
      setStaff(json.staff)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  const createStaff = useCallback(async (form) => {
    const res  = await fetch(`${BACKEND}/api/staff`, {
      method:  'POST',
      headers: headers(),
      body:    JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to create staff member')
    // Append to local list
    setStaff(prev => (prev ? [...prev, json.staff] : [json.staff]))
    return json   // includes tempPassword for the modal to show
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  const updateStaff = useCallback(async (id, updates) => {
    const res  = await fetch(`${BACKEND}/api/staff/${id}`, {
      method:  'PATCH',
      headers: headers(),
      body:    JSON.stringify(updates),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to update staff member')
    setStaff(prev => prev ? prev.map(s => s.id === id ? json.staff : s) : prev)
    return json.staff
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  const deactivateStaff = useCallback(async (id) => {
    const res  = await fetch(`${BACKEND}/api/staff/${id}/deactivate`, {
      method:  'PATCH',
      headers: headers(),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to deactivate staff member')
    setStaff(prev => prev ? prev.map(s => s.id === id ? json.staff : s) : prev)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  const reactivateStaff = useCallback(async (id) => {
    const res  = await fetch(`${BACKEND}/api/staff/${id}/reactivate`, {
      method:  'PATCH',
      headers: headers(),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to reactivate staff member')
    setStaff(prev => prev ? prev.map(s => s.id === id ? json.staff : s) : prev)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  const setPin = useCallback(async (id, pin) => {
    const res  = await fetch(`${BACKEND}/api/staff/${id}/pin`, {
      method:  'PATCH',
      headers: headers(),
      body:    JSON.stringify({ pin: pin ?? null }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to set PIN')
    setStaff(prev => prev ? prev.map(s => s.id === id ? { ...s, has_pin: json.has_pin } : s) : prev)
    return json.has_pin
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  return {
    staff, loading, error,
    fetchStaff, createStaff, updateStaff,
    deactivateStaff, reactivateStaff, setPin,
  }
}
