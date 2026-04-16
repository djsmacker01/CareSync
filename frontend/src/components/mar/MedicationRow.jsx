import { Check, X, AlertTriangle } from 'lucide-react'
import StatusPill from './StatusPill'

export default function MedicationRow({ medication, onGiven, onRefused, onMissed, readonly, submitting }) {
  const { medication_name, dosage, frequency, route, status, stock } = medication

  const isDone    = status !== 'pending'
  const lowStock  = stock && stock.current_quantity <= stock.reorder_threshold
  const zeroStock = stock && stock.current_quantity === 0

  return (
    <div className={`rounded-2xl border-2 p-4 transition-all ${
      status === 'given'   ? 'border-given/40 bg-given/5'   :
      status === 'refused' ? 'border-refused/40 bg-refused/5' :
      'border-gray-200 bg-white'
    }`}>
      {/* Med info */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 text-base leading-tight">{medication_name}</div>
          <div className="text-sm text-gray-500 mt-0.5">{dosage} · {frequency} · {route}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusPill status={status} />
          {lowStock && !isDone && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              zeroStock ? 'bg-refused/10 text-refused' : 'bg-pending/10 text-pending'
            }`}>
              <AlertTriangle className="w-3 h-3" />
              {zeroStock ? 'No stock' : `Low: ${stock.current_quantity} ${stock.unit}`}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons — only show if pending and not readonly */}
      {!isDone && !readonly && (
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => onGiven(medication)}
            disabled={submitting || zeroStock}
            className="flex-1 min-h-[56px] rounded-xl bg-given text-white font-bold text-base active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" /> Given
          </button>
          <button
            onClick={() => onRefused(medication)}
            disabled={submitting}
            className="flex-1 min-h-[56px] rounded-xl bg-refused text-white font-bold text-base active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" /> Refused
          </button>
          <button
            onClick={() => onMissed(medication)}
            disabled={submitting}
            className="min-h-[56px] px-4 rounded-xl border-2 border-gray-200 text-gray-500 font-bold text-sm active:scale-95 transition-all disabled:opacity-40"
          >
            Missed
          </button>
        </div>
      )}

      {/* Recorded entry detail */}
      {isDone && medication.entry && (
        <div className="mt-2 text-xs text-gray-400">
          {status === 'refused' && medication.entry.refusal_reason && (
            <span className="text-refused font-medium">Reason: {medication.entry.refusal_reason}</span>
          )}
          {medication.entry.notes && (
            <span className="ml-2">Note: {medication.entry.notes}</span>
          )}
        </div>
      )}
    </div>
  )
}
