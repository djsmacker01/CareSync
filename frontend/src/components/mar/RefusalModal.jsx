import { useState } from 'react'

const REFUSAL_REASONS = [
  'Client declined',
  'Client asleep',
  'Side effects concern',
  'Nausea / vomiting',
  'Unable to swallow',
  'Client agitated',
  'Other',
]

export default function RefusalModal({ medication, clientName, onConfirm, onCancel, loading }) {
  const [reason, setReason]   = useState('')
  const [notes, setNotes]     = useState('')
  const [otherText, setOther] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const finalReason = reason === 'Other' ? otherText.trim() : reason
    if (!finalReason) return
    onConfirm({ refusal_reason: finalReason, notes: notes.trim() || null })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="text-xs font-bold text-refused uppercase tracking-wider mb-1">Medication Refused</div>
          <h2 className="text-lg font-bold text-gray-900">{medication.medication_name} {medication.dosage}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{clientName}</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          {/* Reason dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Reason for refusal *
            </label>
            <div className="grid grid-cols-1 gap-2">
              {REFUSAL_REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`min-h-[44px] text-left px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                    reason === r
                      ? 'border-refused bg-refused/5 text-refused'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Free text if Other */}
          {reason === 'Other' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Please specify *
              </label>
              <input
                type="text"
                value={otherText}
                onChange={e => setOther(e.target.value)}
                placeholder="Describe the reason"
                className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:outline-none focus:border-refused transition-colors"
                autoFocus
              />
            </div>
          )}

          {/* Optional notes */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Additional notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional observations…"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-900 resize-none focus:outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 min-h-[52px] rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason || (reason === 'Other' && !otherText.trim())}
              className="flex-1 min-h-[52px] rounded-xl bg-refused text-white font-bold text-sm hover:bg-refused/90 transition-colors disabled:opacity-40"
            >
              {loading ? 'Saving…' : 'Confirm Refusal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
