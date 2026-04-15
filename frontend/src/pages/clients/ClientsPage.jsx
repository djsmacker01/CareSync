import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useClients } from '../../hooks/useClients'
import AddClientModal from '../../components/clients/AddClientModal'

function age(dob) {
  if (!dob) return null
  const years = Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000))
  return years
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { clients, loading, error, fetchClients, addClient } = useClients()

  const [search,      setSearch]      = useState('')
  const [showAdd,     setShowAdd]     = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [toast,       setToast]       = useState(null)

  const canManage = ['manager', 'supervisor'].includes(user?.role)

  useEffect(() => { fetchClients() }, [fetchClients])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAddClient(form) {
    setSubmitting(true)
    try {
      const client = await addClient(form)
      setShowAdd(false)
      showToast(`${client.full_name} added successfully`)
    } catch (err) {
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = (clients || []).filter(c => {
    const term = search.toLowerCase()
    return (
      c.full_name.toLowerCase().includes(term) ||
      (c.room_number || '').toLowerCase().includes(term)
    )
  })

  // Sort by flat number naturally (Flat 1, Flat 2, …)
  const sorted = [...filtered].sort((a, b) => {
    const aNum = parseInt(a.room_number?.replace(/\D/g, '') || '999', 10)
    const bNum = parseInt(b.room_number?.replace(/\D/g, '') || '999', 10)
    if (aNum !== bNum) return aNum - bNum
    return a.full_name.localeCompare(b.full_name)
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-y-2 gap-x-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">Service Users</h1>
          <p className="text-sm text-gray-400">
            {loading ? 'Loading…' : `${clients?.length || 0} resident${clients?.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdd(true)}
            className="min-h-[44px] px-4 rounded-xl bg-teal text-white text-sm font-bold hover:bg-teal/90 transition-colors flex-shrink-0"
          >
            + Add Resident
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
          toast.type === 'error'
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}{' '}
          <button onClick={fetchClients} className="underline font-semibold ml-1">Retry</button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="search"
          placeholder="Search by name or flat…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 pl-9 pr-4 text-gray-900 text-sm focus:border-teal focus:outline-none"
        />
      </div>

      {/* Loading skeleton */}
      {loading && !clients && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && sorted.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">👤</div>
          {search
            ? <p className="font-semibold">No residents match "{search}"</p>
            : <div>
                <p className="font-semibold text-gray-600">No service users yet</p>
                {canManage && (
                  <p className="text-sm mt-1">
                    Click <span className="font-bold text-teal">+ Add Resident</span> to get started
                  </p>
                )}
              </div>
          }
        </div>
      )}

      {/* Client list */}
      <div className="space-y-3">
        {sorted.map(client => {
          const activeMeds = (client.medications || []).filter(m => m.is_active).length
          const clientAge  = age(client.date_of_birth)

          return (
            <button
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="w-full text-left bg-white rounded-2xl border-2 border-gray-200 p-4 hover:border-teal hover:shadow-sm transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-3">
                {/* Avatar + info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 rounded-full bg-teal/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-black text-teal">
                      {client.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 truncate">{client.full_name}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      {client.room_number && (
                        <span className="flex items-center gap-1">
                          <span>🏠</span>
                          {client.room_number}
                        </span>
                      )}
                      {clientAge !== null && (
                        <span>{clientAge} yrs</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: med count + arrow */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {activeMeds > 0 ? (
                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                      💊 {activeMeds} med{activeMeds !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-bold px-2.5 py-1 rounded-full">
                      No meds
                    </span>
                  )}
                  <span className="text-gray-300 text-xl">›</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Add modal */}
      {showAdd && (
        <AddClientModal
          onSave={handleAddClient}
          onClose={() => setShowAdd(false)}
          submitting={submitting}
        />
      )}
    </div>
  )
}
