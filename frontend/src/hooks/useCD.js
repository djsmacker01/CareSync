import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export function useCD() {
  const { session } = useAuth()
  const [drugs,   setDrugs]   = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  function headers() {
    return {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    }
  }

  const fetchDrugs = useCallback(async (clientId) => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`${BACKEND}/api/cd/clients/${clientId}/drugs`, { headers: headers() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load CD drugs')
      setDrugs(json.drugs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  const fetchRegister = useCallback(async (clientId, drugId = null) => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: 100 })
      if (drugId) params.set('drug_id', drugId)
      const res  = await fetch(`${BACKEND}/api/cd/clients/${clientId}/register?${params}`, { headers: headers() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load CD register')
      setEntries(json.entries)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  const addDrug = useCallback(async (clientId, form) => {
    const res  = await fetch(`${BACKEND}/api/cd/clients/${clientId}/drugs`, {
      method:  'POST',
      headers: headers(),
      body:    JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to add CD drug')
    setDrugs(prev => [...prev, json.drug])
    return json.drug
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  const addEntry = useCallback(async (payload) => {
    const res  = await fetch(`${BACKEND}/api/cd/entry`, {
      method:  'POST',
      headers: headers(),
      body:    JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to add register entry')

    // Update the drug's current_stock in local state
    setDrugs(prev => prev.map(d =>
      d.id === payload.drug_id ? { ...d, current_stock: json.new_balance } : d
    ))
    // Prepend entry to register (most recent first)
    setEntries(prev => [json.entry, ...prev])
    return json
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  return {
    drugs, entries, loading, error,
    fetchDrugs, fetchRegister, addDrug, addEntry,
  }
}
