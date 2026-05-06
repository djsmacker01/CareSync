import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import MedicationRow from '../../components/mar/MedicationRow'
import RefusalModal from '../../components/mar/RefusalModal'
import ShiftBadge from '../../components/mar/ShiftBadge'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function ClientDetail({ client, shift, onBack, onEntry, readonly }) {
  const { user } = useAuth()
  const [refusalTarget, setRefusalTarget] = useState(null)
  const [submitting, setSubmitting]        = useState(false)
  const [toast, setToast]                  = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  async function recordStatus(medication, status, extra = {}) {
    setSubmitting(true)
    try {
      await onEntry({ client_id: client.id, medication_id: medication.id, shift, status, administered_by: user.id, ...extra })
      const labels = {
        given: 'marked as given', prompted: 'recorded as prompted',
        self_administered: 'recorded as self-administered', assisted: 'recorded as assisted',
        missed: 'marked as missed',
      }
      const isWarn = ['missed'].includes(status)
      showToast(`${medication.medication_name} ${labels[status] || status}`, isWarn ? 'warn' : 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGiven     = med => recordStatus(med, 'given')
  const handlePrompted  = med => recordStatus(med, 'prompted')
  const handleSelfAdmin = med => recordStatus(med, 'self_administered')
  const handleAssisted  = med => recordStatus(med, 'assisted')
  const handleMissed    = med => recordStatus(med, 'missed')

  async function handleRefusalConfirm({ refusal_reason, notes }) {
    setSubmitting(true)
    try {
      await onEntry({
        client_id:       client.id,
        medication_id:   refusalTarget.id,
        shift,
        status:          'refused',
        refusal_reason,
        notes,
        administered_by: user.id,
      })
      showToast(`${refusalTarget.medication_name} refusal recorded`, 'warn')
      setRefusalTarget(null)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const pending = client.medications.filter(m => m.status === 'pending').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="min-h-[44px] min-w-[44px] rounded-xl border-2 border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black text-gray-900">{client.full_name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">Flat {String(client.room_number || '').replace(/\D/g, '')}</span>
            <ShiftBadge shift={shift} />
            {pending > 0 && (
              <span className="text-xs font-bold text-pending">{pending} remaining</span>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          toast.type === 'error' ? 'bg-refused/10 text-refused border border-refused/20' :
          toast.type === 'warn'  ? 'bg-pending/10 text-pending border border-pending/20' :
          'bg-given/10 text-given border border-given/20'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Medications */}
      {client.medications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No active medications</div>
      ) : (
        <div className="space-y-3">
          {client.medications.map(med => (
            <MedicationRow
              key={med.id}
              medication={med}
              onGiven={handleGiven}
              onPrompted={handlePrompted}
              onSelfAdmin={handleSelfAdmin}
              onAssisted={handleAssisted}
              onRefused={setRefusalTarget}
              onMissed={handleMissed}
              readonly={readonly}
              submitting={submitting}
            />
          ))}
        </div>
      )}

      {/* All done banner */}
      {pending === 0 && client.medications.length > 0 && (
        <div className="rounded-2xl bg-given/10 border-2 border-given/30 p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-given mx-auto mb-1" />
          <div className="font-bold text-given">All medications recorded</div>
          <div className="text-xs text-given/70 mt-0.5">
            {client.given} given · {client.refused} refused
          </div>
        </div>
      )}

      {/* Refusal modal */}
      {refusalTarget && (
        <RefusalModal
          medication={refusalTarget}
          clientName={client.full_name}
          onConfirm={handleRefusalConfirm}
          onCancel={() => setRefusalTarget(null)}
          loading={submitting}
        />
      )}
    </div>
  )
}
