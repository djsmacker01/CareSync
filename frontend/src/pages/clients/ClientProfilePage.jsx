import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useClients } from '../../hooks/useClients'
import AddMedicationModal from '../../components/clients/AddMedicationModal'
import EditClientModal from '../../components/clients/EditClientModal'
import SupportPlan from '../../components/clients/SupportPlan'
import CapacityConsent from '../../components/clients/CapacityConsent'
import GoalTracker from '../../components/clients/GoalTracker'

const ROUTE_ICONS = {
  oral:      '💊',
  topical:   '🩹',
  inhaled:   '💨',
  injection: '💉',
  drops:     '💧',
  patch:     '🔲',
  other:     '⚕️',
}

function formatDate(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function age(dob) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000))
}

function StockPill({ qty, threshold, unit }) {
  if (qty === undefined || qty === null) return null
  const status = qty === 0 ? 'empty' : qty <= threshold ? 'low' : 'ok'
  const styles = {
    ok:    'bg-green-100 text-green-700',
    low:   'bg-amber-100 text-amber-700',
    empty: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles[status]}`}>
      {qty} {unit}
    </span>
  )
}

export default function ClientProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const { fetchClient, addMedication, discontinueMedication, updateClient } = useClients()

  const [client,     setClient]    = useState(null)
  const [loading,    setLoading]   = useState(true)
  const [error,      setError]     = useState(null)
  const [showAddMed, setShowAddMed] = useState(false)
  const [showEdit,   setShowEdit]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast,      setToast]     = useState(null)
  const [confirmDisc, setConfirmDisc] = useState(null)
  const [tab, setTab]              = useState('medications')

  const canManage = ['manager', 'supervisor'].includes(user?.role)
  const token = session?.access_token || null

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchClient(id)
      setClient(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fetchClient, id])

  useEffect(() => { load() }, [load])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleAddMedication(form) {
    setSubmitting(true)
    try {
      await addMedication({ ...form, client_id: id, performedBy: user.id })
      setShowAddMed(false)
      showToast(`${form.medication_name} added to ${client.full_name}'s MAR`)
      await load() // re-fetch to show new medication
    } catch (err) {
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDiscontinue(medId) {
    try {
      await discontinueMedication(medId)
      setConfirmDisc(null)
      showToast('Medication discontinued')
      await load()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function handleUpdateClient(form) {
    setSubmitting(true)
    try {
      await updateClient(id, form)
      setShowEdit(false)
      showToast('Details updated')
      await load()
    } catch (err) {
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  // ── Separate active from discontinued meds ──────────────────────
  const activeMeds = (client?.medications || []).filter(m => m.is_active)
  const pastMeds   = (client?.medications || []).filter(m => !m.is_active)

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-40 bg-gray-200 rounded-xl" />
        <div className="h-32 bg-gray-100 rounded-2xl" />
        <div className="h-24 bg-gray-100 rounded-2xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 font-semibold">{error}</p>
        <button onClick={load} className="mt-3 text-sm text-teal underline">Retry</button>
      </div>
    )
  }

  if (!client) return null

  const clientAge = age(client.date_of_birth)

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={() => navigate('/clients')}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
      >
        ← Service Users
      </button>

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

      {/* Profile card */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="h-16 w-16 rounded-full bg-teal/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-black text-teal">
                {client.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-gray-900 leading-tight">{client.full_name}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                {client.room_number && (
                  <span className="flex items-center gap-1 font-semibold text-gray-700">
                    🏠 Flat {String(client.room_number).replace(/\D/g, '')}
                  </span>
                )}
                {clientAge !== null && <span>{clientAge} years old</span>}
                {client.date_of_birth && <span>Born {formatDate(client.date_of_birth)}</span>}
              </div>
              {client.key_worker && (
                <p className="text-xs text-gray-400 mt-1">
                  Key worker: <span className="font-semibold text-gray-600">{client.key_worker.full_name}</span>
                </p>
              )}
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setShowEdit(true)}
              className="min-h-[44px] px-4 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors self-start flex-shrink-0"
            >
              Edit
            </button>
          )}
        </div>

        {client.notes && (
          <div className="mt-4 bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Care Notes</p>
            <p className="text-sm text-gray-700 leading-relaxed">{client.notes}</p>
          </div>
        )}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="flex rounded-xl bg-gray-100 p-1 gap-0.5">
        {[
          { id: 'medications',  label: '💊 Meds' },
          { id: 'support_plan', label: '📋 Plan' },
          { id: 'capacity',     label: '⚖️ Capacity' },
          { id: 'goals',        label: '🎯 Goals' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-h-[40px] rounded-lg text-xs sm:text-sm font-bold transition-all ${
              tab === t.id ? 'bg-white text-navy shadow' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Support Plan tab ───────────────────────────────────────── */}
      {tab === 'support_plan' && (
        <SupportPlan clientId={id} token={token} canEdit={canManage} />
      )}

      {/* ── Capacity & Consent tab ─────────────────────────────────── */}
      {tab === 'capacity' && (
        <CapacityConsent clientId={id} token={token} canEdit={canManage} />
      )}

      {/* ── Goals tab ─────────────────────────────────────────────── */}
      {tab === 'goals' && (
        <GoalTracker clientId={id} token={token} canManage={canManage} />
      )}

      {/* ── Medications tab ──────────────────────────────────────── */}
      {tab === 'medications' && (<><div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
          <h2 className="text-lg font-black text-gray-900">
            Current Medications
            {activeMeds.length > 0 && (
              <span className="ml-2 text-sm font-bold text-gray-400">({activeMeds.length})</span>
            )}
          </h2>
          {canManage && (
            <button
              onClick={() => setShowAddMed(true)}
              className="min-h-[44px] px-4 rounded-xl bg-teal text-white text-sm font-bold hover:bg-teal/90 transition-colors flex-shrink-0"
            >
              + Add Medication
            </button>
          )}
        </div>

        {activeMeds.length === 0 && (
          <div className="text-center py-10 bg-white rounded-2xl border-2 border-gray-200 text-gray-400">
            <div className="text-4xl mb-2">💊</div>
            <p className="font-semibold text-gray-600">No active medications</p>
            {canManage && (
              <p className="text-sm mt-1">
                Click <span className="text-teal font-bold">+ Add Medication</span> to add a GP prescription
              </p>
            )}
          </div>
        )}

        {activeMeds.map(med => {
          const stock = med.stock?.[0]
          return (
            <div key={med.id} className="bg-white rounded-2xl border-2 border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0 mt-0.5">{ROUTE_ICONS[med.route] || '💊'}</span>
                  <div className="min-w-0">
                    <div className="font-black text-gray-900">{med.medication_name}</div>
                    <div className="text-sm font-bold text-teal mt-0.5">{med.dosage}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{med.frequency}</div>
                    {med.prescriber && (
                      <div className="text-xs text-gray-400 mt-1">Prescribed by {med.prescriber}</div>
                    )}
                    <div className="text-xs text-gray-400">
                      Started {formatDate(med.start_date)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {stock && (
                    <StockPill
                      qty={stock.current_quantity}
                      threshold={stock.reorder_threshold}
                      unit={stock.unit}
                    />
                  )}
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                    {med.route}
                  </span>
                </div>
              </div>

              {/* Discontinue button (manager only) */}
              {canManage && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {confirmDisc === med.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600 font-medium flex-1">Confirm discontinue?</span>
                      <button onClick={() => setConfirmDisc(null)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                        Cancel
                      </button>
                      <button onClick={() => handleDiscontinue(med.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 font-bold hover:bg-red-200">
                        Yes, discontinue
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDisc(med.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium">
                      Discontinue medication
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Past / discontinued medications ─────────────────────── */}
      {pastMeds.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-gray-500">Past Medications ({pastMeds.length})</h2>
          {pastMeds.map(med => (
            <div key={med.id} className="bg-gray-50 rounded-2xl border-2 border-gray-100 p-4 opacity-70">
              <div className="flex items-center gap-3">
                <span className="text-xl grayscale">{ROUTE_ICONS[med.route] || '💊'}</span>
                <div>
                  <div className="font-bold text-gray-600 line-through">{med.medication_name}</div>
                  <div className="text-sm text-gray-400">{med.dosage} · {med.frequency}</div>
                  {med.end_date && (
                    <div className="text-xs text-gray-400">Discontinued {formatDate(med.end_date)}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </>)}

      {/* Add medication modal */}
      {showAddMed && (
        <AddMedicationModal
          clientName={client.full_name}
          onSave={handleAddMedication}
          onClose={() => setShowAddMed(false)}
          submitting={submitting}
        />
      )}

      {/* Edit client modal */}
      {showEdit && (
        <EditClientModal
          client={client}
          onSave={handleUpdateClient}
          onClose={() => setShowEdit(false)}
          submitting={submitting}
        />
      )}
    </div>
  )
}
