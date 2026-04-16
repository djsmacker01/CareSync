import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useMAR } from '../../hooks/useMAR'
import { useRealtime } from '../../hooks/useRealtime'
import LiveBadge from '../../components/LiveBadge'
import ClientCard from '../../components/mar/ClientCard'
import ClientDetail from './ClientDetail'
import ShiftBadge from '../../components/mar/ShiftBadge'

const MAR_SUBS = [{ table: 'mar_entries', event: 'INSERT' }]

// Determine the current shift based on time
function getCurrentShift() {
  const h = new Date().getHours()
  if (h >= 8 && h < 14)  return 'AM'
  if (h >= 14 && h < 22) return 'PM'
  return 'NIGHT'
}

export default function MARPage() {
  const { user } = useAuth()
  const { data, loading, error, fetchToday, recordEntry } = useMAR()

  const [shift, setShift]             = useState(getCurrentShift)
  const [selectedClient, setSelected] = useState(null)
  const [search, setSearch]           = useState('')

  const readonly = user?.role === 'readonly'

  const load = useCallback(() => fetchToday(shift), [fetchToday, shift])

  useEffect(() => { load() }, [load])

  // Live updates: re-fetch when another device records a MAR entry
  const liveStatus = useRealtime(MAR_SUBS, load)

  // If viewing a client detail, find the latest version in data
  const activeClient = selectedClient
    ? data?.clients.find(c => c.id === selectedClient.id) || selectedClient
    : null

  function handleEntry(params) {
    return recordEntry(params)
  }

  // Filtered client list
  const clients = (data?.clients || []).filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.room_number?.toLowerCase().includes(search.toLowerCase())
  )

  const pct = data
    ? data.overallTotal > 0 ? Math.round((data.overallGiven / data.overallTotal) * 100) : 0
    : 0

  // ── Client detail view ────────────────────────────────────
  if (activeClient) {
    return (
      <ClientDetail
        client={activeClient}
        shift={shift}
        onBack={() => setSelected(null)}
        onEntry={handleEntry}
        readonly={readonly}
      />
    )
  }

  // ── Client list view ──────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-y-1 gap-x-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">Medication Administration Record</h1>
            <LiveBadge status={liveStatus} />
          </div>
          <p className="text-sm text-gray-400">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <ShiftBadge shift={shift} />
      </div>

      {/* Shift selector */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {['AM', 'PM', 'NIGHT'].map(s => (
          <button
            key={s}
            onClick={() => { setShift(s); setSelected(null) }}
            className={`flex-1 min-h-[44px] rounded-lg text-sm font-bold transition-all ${
              shift === s ? 'bg-white text-navy shadow' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {s === 'AM' ? 'Morning' : s === 'PM' ? 'Afternoon' : 'Night'}
          </button>
        ))}
      </div>

      {/* Overall progress */}
      {data && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-700">Overall progress</span>
            <span className="text-sm font-bold text-teal">{data.overallGiven}/{data.overallTotal} medications</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-3 bg-gray-100 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-teal rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>{pct}% complete</span>
            <span>{data.clients.filter(c => c.pending === 0).length} of {data.clients.length} clients done</span>
          </div>
        </div>
      )}

      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or room…"
        className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal transition-colors"
      />

      {/* Error */}
      {error && (
        <div className="bg-refused/10 border border-refused/20 text-refused text-sm rounded-xl px-4 py-3">
          {error}
          <button onClick={load} className="ml-2 underline font-semibold">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Client grid */}
      {!loading && clients.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clients.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => setSelected(client)}
            />
          ))}
        </div>
      )}

      {!loading && clients.length === 0 && !error && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium">No clients found</p>
          {search && <p className="text-sm mt-1">Try a different search</p>}
        </div>
      )}

      {/* Refresh button */}
      {!loading && (
        <button
          onClick={load}
          className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          ↻ Refresh
        </button>
      )}
    </div>
  )
}
