import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useClients } from '../../hooks/useClients'
import { useCD } from '../../hooks/useCD'
import AddEntryModal from '../../components/cd/AddEntryModal'
import AddDrugModal  from '../../components/cd/AddDrugModal'

const ENTRY_META = {
  administered: { label: 'Administered', color: 'bg-green-100 text-green-800',  icon: '💊' },
  received:     { label: 'Received',     color: 'bg-blue-100 text-blue-800',    icon: '📦' },
  wasted:       { label: 'Wasted',       color: 'bg-red-100 text-red-800',      icon: '🗑️' },
  returned:     { label: 'Returned',     color: 'bg-gray-100 text-gray-700',    icon: '↩️' },
}

function fmt(ts) {
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function CDPage() {
  const { user } = useAuth()
  const { clients, loading: clientsLoading, error: clientsError, fetchClients } = useClients()

  const {
    drugs, entries, loading, error,
    fetchDrugs, fetchRegister, addDrug, addEntry,
  } = useCD()

  const [clientId,    setClientId]    = useState('')
  const [activeDrug,  setActiveDrug]  = useState(null)
  const [showEntry,   setShowEntry]   = useState(false)
  const [showAddDrug, setShowAddDrug] = useState(false)
  const [toast,       setToast]       = useState(null)

  const canManage = ['supervisor', 'manager'].includes(user?.role)

  // ── Load clients on mount ──────────────────────────────────────
  useEffect(() => { fetchClients() }, [fetchClients])

  // ── When client changes: fetch drugs and clear active drug ─────
  const handleClientChange = useCallback((id) => {
    setClientId(id)
    setActiveDrug(null)
    if (id) fetchDrugs(id)
  }, [fetchDrugs])

  // ── When drugs list updates: auto-select first drug ────────────
  // Only auto-select if there is no active drug yet (avoids overwriting
  // a deliberate selection when the drug list refreshes after addDrug).
  useEffect(() => {
    if (drugs.length > 0 && !activeDrug) {
      setActiveDrug(drugs[0])
    }
  }, [drugs]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load register when active drug changes ─────────────────────
  useEffect(() => {
    if (clientId && activeDrug?.id) {
      fetchRegister(clientId, activeDrug.id)
    }
  }, [clientId, activeDrug?.id, fetchRegister])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleAddEntry(payload) {
    try {
      await addEntry(payload)
      setShowEntry(false)
      showToast('Register entry saved')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function handleAddDrug(form) {
    try {
      const drug = await addDrug(clientId, form)
      setShowAddDrug(false)
      setActiveDrug(drug)
      showToast(`${drug.name} added to register`)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const selectedClient = clients?.find(c => c.id === clientId)

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">CD Register</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Controlled Drugs — Schedule 2 &amp; 3 · Misuse of Drugs Regulations 2001
          </p>
        </div>
        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full self-start">
          ⚠️ Legal record — append only
        </span>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
          toast.type === 'error'
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── Client selector ── */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          Select Resident
        </label>

        {clientsLoading && !clients ? (
          <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ) : clientsError ? (
          <div className="text-sm text-red-600 flex items-center gap-2">
            Failed to load residents.
            <button onClick={fetchClients} className="underline font-semibold">Retry</button>
          </div>
        ) : (
          <select
            value={clientId}
            onChange={e => handleClientChange(e.target.value)}
            className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:border-teal focus:outline-none"
          >
            <option value="">— Choose a resident —</option>
            {(clients || []).map(c => (
              <option key={c.id} value={c.id}>
                {c.full_name}{c.room_number ? ` (Flat ${c.room_number})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Empty state ── */}
      {!clientId && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">💊</div>
          <p className="text-sm">Select a resident to view their CD register</p>
        </div>
      )}

      {/* ── Drug tabs + register ── */}
      {clientId && (
        <>
          {/* Drug tab row */}
          <div className="flex flex-wrap items-center gap-2 min-h-[44px]">

            {loading && drugs.length === 0 ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 w-32 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </>
            ) : (
              <>
                {drugs.map(drug => (
                  <button
                    key={drug.id}
                    onClick={() => setActiveDrug(drug)}
                    className={`min-h-[44px] px-4 rounded-xl text-sm font-bold border-2 transition-colors flex items-center gap-2 ${
                      activeDrug?.id === drug.id
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300'
                    }`}
                  >
                    {drug.name}
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      activeDrug?.id === drug.id
                        ? 'bg-white/20 text-white'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      Sch {drug.cd_schedule}
                    </span>
                  </button>
                ))}

                {drugs.length === 0 && !loading && (
                  <p className="text-sm text-gray-400 py-2 mr-2">
                    No CD drugs registered for this resident.
                  </p>
                )}
              </>
            )}

            {/* Add drug — supervisor / manager only */}
            {canManage && (
              <button
                onClick={() => setShowAddDrug(true)}
                className="min-h-[44px] px-4 rounded-xl border-2 border-dashed border-amber-300 text-amber-600 text-sm font-bold hover:bg-amber-50 transition-colors"
              >
                + Add Drug
              </button>
            )}
          </div>

          {/* ── Active drug panel ── */}
          {activeDrug && (
            <div className="space-y-3">

              {/* Drug summary card */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-gray-900">{activeDrug.name}</h2>
                    <span className="text-xs font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">
                      Schedule {activeDrug.cd_schedule}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {activeDrug.strength} · {activeDrug.form}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Running balance */}
                  <div className="text-right">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Balance</div>
                    <div className={`text-2xl font-black tabular-nums ${
                      activeDrug.current_stock === 0   ? 'text-red-600'
                      : activeDrug.current_stock <= 5  ? 'text-amber-600'
                      : 'text-green-700'
                    }`}>
                      {activeDrug.current_stock}
                      <span className="text-sm font-semibold ml-1 text-gray-500">{activeDrug.unit}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowEntry(true)}
                    className="min-h-[48px] px-5 rounded-xl bg-teal text-white text-sm font-bold hover:bg-teal/90 transition-colors"
                  >
                    + Entry
                  </button>
                </div>
              </div>

              {/* ── Register ledger ── */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-700 text-sm">
                    Ledger
                    <span className="text-gray-400 font-normal ml-2 text-xs">
                      {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </h3>
                  <button
                    onClick={() => window.print()}
                    className="text-xs text-gray-400 font-semibold hover:text-gray-600"
                  >
                    🖨️ Print
                  </button>
                </div>

                {loading ? (
                  <div className="space-y-2 p-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : error ? (
                  <div className="p-4 text-sm text-red-600">
                    {error}{' '}
                    <button
                      onClick={() => fetchRegister(clientId, activeDrug.id)}
                      className="underline font-semibold"
                    >
                      Retry
                    </button>
                  </div>
                ) : entries.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-sm">No entries yet — tap <strong>+ Entry</strong> above to begin</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {/* Column headers — desktop */}
                    <div className="hidden sm:grid grid-cols-[1fr_72px_72px_96px_160px] gap-3 px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wide bg-gray-50">
                      <span>Date &amp; Type</span>
                      <span className="text-right">In</span>
                      <span className="text-right">Out</span>
                      <span className="text-right">Balance</span>
                      <span>Staff</span>
                    </div>

                    {entries.map(entry => {
                      const meta = ENTRY_META[entry.entry_type] || ENTRY_META.administered
                      return (
                        <div key={entry.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">

                          {/* Mobile */}
                          <div className="sm:hidden space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
                                {meta.icon} {meta.label}
                              </span>
                              <span className="text-sm font-black text-gray-800 tabular-nums">
                                {entry.balance_after} {activeDrug.unit}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-400">{fmt(entry.administered_at)}</div>
                            <div className="text-xs text-gray-600">
                              <span className="font-semibold">{entry.administered_by?.full_name || '—'}</span>
                              {(entry.witnessed_by || entry.witness_name) && (
                                <span className="text-gray-400 ml-2">
                                  · Witness: <span className="font-semibold text-gray-600">
                                    {entry.witnessed_by?.full_name || entry.witness_name}
                                  </span>
                                </span>
                              )}
                            </div>
                            {entry.notes && (
                              <div className="text-[11px] text-gray-400 italic">{entry.notes}</div>
                            )}
                          </div>

                          {/* Desktop */}
                          <div className="hidden sm:grid grid-cols-[1fr_72px_72px_96px_160px] gap-3 items-center">
                            <div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
                                {meta.icon} {meta.label}
                              </span>
                              <div className="text-[11px] text-gray-400 mt-0.5">{fmt(entry.administered_at)}</div>
                              {entry.notes && (
                                <div className="text-[11px] text-gray-400 italic mt-0.5">{entry.notes}</div>
                              )}
                            </div>
                            <span className="text-sm font-bold text-blue-600 text-right tabular-nums">
                              {entry.quantity_in  != null ? `+${entry.quantity_in}`  : '—'}
                            </span>
                            <span className="text-sm font-bold text-red-500 text-right tabular-nums">
                              {entry.quantity_out != null ? `−${entry.quantity_out}` : '—'}
                            </span>
                            <span className="text-sm font-black text-gray-900 text-right tabular-nums">
                              {entry.balance_after} <span className="text-xs font-normal text-gray-400">{activeDrug.unit}</span>
                            </span>
                            <div className="text-xs text-gray-700 truncate">
                              <div className="font-semibold truncate">{entry.administered_by?.full_name || '—'}</div>
                              {(entry.witnessed_by || entry.witness_name) && (
                                <div className="text-gray-400 truncate">
                                  W: {entry.witnessed_by?.full_name || entry.witness_name}
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No drug selected but drugs exist */}
          {!activeDrug && drugs.length > 0 && !loading && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Select a drug above to view its register
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      {showEntry && activeDrug && (
        <AddEntryModal
          drug={activeDrug}
          clientName={selectedClient?.full_name || ''}
          onSave={handleAddEntry}
          onClose={() => setShowEntry(false)}
        />
      )}

      {showAddDrug && clientId && (
        <AddDrugModal
          clientName={selectedClient?.full_name || ''}
          onSave={handleAddDrug}
          onClose={() => setShowAddDrug(false)}
        />
      )}

    </div>
  )
}
