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

export function useCapacityConsent(clientId, token) {
  const [assessments, setAssessments] = useState([])
  const [consents, setConsents]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  const refresh = useCallback(async () => {
    if (!clientId || !token) return
    setLoading(true)
    setError(null)
    try {
      const [a, c] = await Promise.all([
        apiFetch(`/api/capacity/${clientId}/assessments`, token),
        apiFetch(`/api/capacity/${clientId}/consent`, token),
      ])
      setAssessments(a)
      setConsents(c)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId, token])

  useEffect(() => { refresh() }, [refresh])

  async function addAssessment(payload) {
    const data = await apiFetch(`/api/capacity/${clientId}/assessments`, token, {
      method: 'POST',
      body:   JSON.stringify(payload),
    })
    setAssessments(prev => {
      const filtered = prev.filter(a => a.decision_topic !== data.decision_topic)
      return [data, ...filtered]
    })
    return data
  }

  async function addConsent(payload) {
    const data = await apiFetch(`/api/capacity/${clientId}/consent`, token, {
      method: 'POST',
      body:   JSON.stringify(payload),
    })
    setConsents(prev => [data, ...prev])
    return data
  }

  async function fetchAssessmentHistory() {
    return apiFetch(`/api/capacity/${clientId}/assessments/history`, token)
  }

  return { assessments, consents, loading, error, refresh, addAssessment, addConsent, fetchAssessmentHistory }
}
