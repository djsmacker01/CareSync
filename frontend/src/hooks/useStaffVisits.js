import { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function apiFetch(path, token, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export function useStaffVisits(token) {
  const [visits, setVisits]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const refresh = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/api/staff-visits/today', token)
      setVisits(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { refresh() }, [refresh])

  async function fetchHistory(date) {
    return apiFetch(`/api/staff-visits/history?date=${date}`, token)
  }

  async function checkIn({ client_id, address, scheduled_end, check_in_notes }) {
    const data = await apiFetch('/api/staff-visits', token, {
      method:  'POST',
      body:    JSON.stringify({ client_id, address, scheduled_end, check_in_notes }),
    })
    await refresh()
    return data
  }

  async function checkOut(visitId, check_out_notes = '') {
    const data = await apiFetch(`/api/staff-visits/${visitId}/checkout`, token, {
      method: 'PATCH',
      body:   JSON.stringify({ check_out_notes }),
    })
    await refresh()
    return data
  }

  return { visits, loading, error, refresh, checkIn, checkOut, fetchHistory }
}
