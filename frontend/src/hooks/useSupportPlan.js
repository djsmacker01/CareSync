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

export function useSupportPlan(clientId, token) {
  const [sections, setSections] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const refresh = useCallback(async () => {
    if (!clientId || !token) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/support-plans/${clientId}`, token)
      setSections(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId, token])

  useEffect(() => { refresh() }, [refresh])

  async function saveSection(sectionKey, content) {
    const data = await apiFetch(`/api/support-plans/${clientId}/${sectionKey}`, token, {
      method: 'PUT',
      body:   JSON.stringify({ content }),
    })
    setSections(prev => prev.map(s => s.section_key === sectionKey ? { ...data } : s))
    return data
  }

  async function fetchHistory(sectionKey) {
    return apiFetch(`/api/support-plans/${clientId}/${sectionKey}/history`, token)
  }

  return { sections, loading, error, refresh, saveSection, fetchHistory }
}
