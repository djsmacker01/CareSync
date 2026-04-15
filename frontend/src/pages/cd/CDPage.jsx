import { useEffect, useState } from 'react'
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
  const { user }    = useAuth()
  const { clients, loading: clientsLoading } = useClients()

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

  // Load drugs when client changes
  useEffect(() => {
    if (clientId) {
      fetchDrugs(clientId).then(() => setActiveDrug(null))
    }
  }, [clientId, fetchDrugs])

  // Load register when drug tab changes
  useEffect(() => {
    if (clientId && activeDrug) {
      fetchRegister(clientId, activeDrug.id)
    }
  }, [clientId, activeDrug, fetchRegister])

  // Auto-select first drug when drugs load
  useEffect(() => {
    if (drugs.length > 0 && !activeDrug) {
      setActiveDrug(drugs[0])
    }
  }, [drugs, activeDrug])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleAddEntry(payload) {
    await addEntry(payload)
    setShowEntry(false)
    showToast('Register entry saved')
  }

  async function handleAddDrug(form) {
    const drug = await addDrug(clientId, form)
    setShowAddDrug(false)
    setActiveDrug(drug)
    showToast(`${drug.name} added to register`)
  }

  const selectedClient = clients?.find(c => c.id === clientId)

  // Entries for the active drug only
  const drugEntries = activeDrug
    ? entries.filter(e => e.drug?.id === activeDrug.id)
    : entries

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            CD Register
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Controlled Drugs — Schedule 2 &amp; 3 · Misuse of Drugs Regulations 2001
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full">
            ⚠️ Legal record — append only
          </span>
        </div>
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
        {clientsLoading ? (
          <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <select
            value={clientId}
            onChange={e => { setClientId(e.target.value); setActiveDrug(null) }}
            className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:border-teal focus:outline-none"
          >
            <option value="">— Choose a resident —</option>
            {(clients || []).map(c => (
              <option key={c.id} value={c.id}>
                {c.full_name}{c.room_number ? ` (Room ${c.room_number})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── No client selected ── */}
      {!clientId && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">💊</div>
          <p className="text-sm">Select a resident to view their CD register</p>
        </div>
      )}

      {/* ── Drug tabs ── */}
      {clientId && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {/* Drug tabs */}
            {loading && drugs.length === 0 && (
              <div className="flex gap-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 w-28 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {drugs.map(drug => (
              <button
                key={drug.id}
                onClick={() => setActiveDrug(drug)}
                className={`min-h-[44px] px-4 rounded-xl text-sm font-bold border-2 transition-colors ${
                  activeDrug?.id === drug.id
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300'
                }`}
              >
                {drug.name}
                <span className={`ml-2 text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeDrug?.id === drug.id
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  Sch {drug.cd_schedule}
                </span>
              </button>
            ))}

            {drugs.length === 0 && !loading && (
              <p className="text-sm text-gray-400 py-2">No CD drugs registered for this resident.</p>
            )}

            {/* Add drug button */}
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
                  {/* Current balance */}
                  <div className="text-right">
                    <div className="text-xs text-gray-500 font-semibold">Current balance</div>
                    <div className={`text-2xl font-black ${
                      activeDrug.current_stock === 0
                        ? 'text-red-600'
                        : activeDrug.current_stock <= 5
                        ? 'text-amber-600'
                        : 'text-green-700'
                    }`}>
                      {activeDrug.current_stock}
                      <span className="text-base font-semibold ml-1">{activeDrug.unit}</span>
                    </div>
                  </div>

                  {/* Add entry button */}
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
                    Register Ledger
                    <span className="text-gray-400 font-normal ml-2">
                      ({drugEntries.length} {drugEntries.length === 1 ? 'entry' : 'entries'})
                    </span>
                  </h3>
                  <button
                    onClick={() => window.print()}
                    className="text-xs text-gray-400 font-semibold hover:text-gray-600 flex items-center gap-1"
                  >
                    🖨️ Print
                  </button>
                </div>

                {loading && drugEntries.length === 0 ? (
                  <div className="space-y-2 p-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : drugEntries.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-sm">No entries yet — add the first one above</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {/* Table header */}
                    <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide bg-gray-50">
                      <span>Date / Type</span>
                      <span className="text-right">In</span>
                      <span className="text-right">Out</span>
                      <span className="text-right">Balance</span>
                      <span>Administered by</span>
                    </div>

                    {drugEntries.map(entry => {
                      const meta = ENTRY_META[entry.entry_type] || ENTRY_META.administered
                      return (
                        <div key={entry.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          {/* Mobile layout */}
                          <div className="sm:hidden space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{meta.icon}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
                                  {meta.label}
                                </span>
                              </div>
                              <span className={`text-sm font-black ${
                                entry.entry_type === 'received' ? 'text-blue-700' : 'text-gray-700'
                              }`}>
                                Bal: {entry.balance_after} {activeDrug.unit}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">{fmt(entry.administered_at)}</div>
                            <div className="text-xs text-gray-600">
                              By: <span className="font-semibold">{entry.administered_by?.full_name || '—'}</span>
                              {entry.witnessed_by && (
                                <span className="ml-2">· Witness: <span className="font-semibold">{entry.witnessed_by.full_name}</span></span>
                              )}
                              {entry.witness_name && (
                                <span className="ml-2">· Witness: <span className="font-semibold">{entry.witness_name}</span></span>
                              )}
                            </div>
                            {entry.notes && (
                              <div className="text-xs text-gray-400 italic">{entry.notes}</div>
                            )}
                          </div>

                          {/* Desktop layout */}
                          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
                                  {meta.icon} {meta.label}
                                </span>
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">{fmt(entry.administered_at)}</div>
                              {entry.notes && (
                                <div className="text-xs text-gray-400 italic mt-0.5">{entry.notes}</div>
                              )}
                            </div>
                            <span className="text-sm font-bold text-blue-700 text-right">
                              {entry.quantity_in != null ? `+${entry.quantity_in}` : '—'}
                            </span>
                            <span className="text-sm font-bold text-red-600 text-right">
                              {entry.quantity_out != null ? `-${entry.quantity_out}` : '—'}
                            </span>
                            <span className="text-sm font-black text-gray-900 text-right whitespace-nowrap">
                              {entry.balance_after} {activeDrug.unit}
                            </span>
                            <div className="text-xs text-gray-600 min-w-[120px]">
                              <div className="font-semibold">{entry.administered_by?.full_name || '—'}</div>
                              {(entry.witnessed_by || entry.witness_name) && (
                                <div className="text-gray-400">
                                  Witness: {entry.witnessed_by?.full_name || entry.witness_name}
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
        </>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
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

      {showAddDrug && (
        <AddDrugModal
          clientName={selectedClient?.full_name || ''}
          onSave={handleAddDrug}
          onClose={() => setShowAddDrug(false)}
        />
      )}
    </div>
  )
}
