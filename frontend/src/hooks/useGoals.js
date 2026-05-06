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

export function useGoals(clientId, token) {
  const [goals, setGoals]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const refresh = useCallback(async () => {
    if (!clientId || !token) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/goals/client/${clientId}`, token)
      setGoals(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId, token])

  useEffect(() => { refresh() }, [refresh])

  async function addGoal(payload) {
    const data = await apiFetch('/api/goals', token, {
      method: 'POST',
      body:   JSON.stringify({ ...payload, client_id: clientId }),
    })
    setGoals(prev => [data, ...prev])
    return data
  }

  async function logProgress(goalId, progress_level, notes) {
    const data = await apiFetch(`/api/goals/${goalId}/update`, token, {
      method: 'POST',
      body:   JSON.stringify({ progress_level, notes }),
    })
    // Update the goal's updates list locally
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g
      const updated = { ...g, goal_updates: [data, ...(g.goal_updates || [])] }
      if (progress_level === 5) { updated.status = 'achieved'; updated.achieved_at = new Date().toISOString() }
      return updated
    }))
    return data
  }

  async function updateStatus(goalId, status) {
    const data = await apiFetch(`/api/goals/${goalId}/status`, token, {
      method: 'PATCH',
      body:   JSON.stringify({ status }),
    })
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, ...data } : g))
    return data
  }

  return { goals, loading, error, refresh, addGoal, logProgress, updateStatus }
}
