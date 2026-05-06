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

export function useActivityLogs(token) {
  const [logs, setLogs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const refresh = useCallback(async (shift) => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const url = shift ? `/api/activity/today?shift=${shift}` : '/api/activity/today'
      const data = await apiFetch(url, token)
      setLogs(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { refresh() }, [refresh])

  async function addLog(payload) {
    const data = await apiFetch('/api/activity', token, {
      method: 'POST',
      body:   JSON.stringify(payload),
    })
    setLogs(prev => [data, ...prev])
    return data
  }

  async function fetchHistory(date) {
    return apiFetch(`/api/activity/history?date=${date}`, token)
  }

  async function fetchClientLogs(clientId, limit = 20) {
    return apiFetch(`/api/activity/client/${clientId}?limit=${limit}`, token)
  }

  return { logs, loading, error, refresh, addLog, fetchHistory, fetchClientLogs }
}
