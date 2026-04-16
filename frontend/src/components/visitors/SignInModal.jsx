import { useState } from 'react'

const PURPOSE_OPTIONS = [
  'Family visit',
  'Friend visit',
  'Medical professional',
  'Contractor / Maintenance',
  'Delivery',
  'Inspection',
  'Other',
]

export default function SignInModal({ clients, onConfirm, onCancel, loading }) {
  const [visitorName, setVisitorName]   = useState('')
  const [clientId, setClientId]         = useState('')
  const [purposeSelect, setPurpose]     = useState('')
  const [purposeOther, setPurposeOther] = useState('')
  const [error, setError]               = useState('')

  const isOther  = purposeSelect === 'Other'
  const purpose  = isOther ? purposeOther.trim() : purposeSelect

  function validate() {
    if (!visitorName.trim()) return 'Visitor name is required.'
    if (!clientId)           return 'Please select who they are visiting.'
    if (!purposeSelect)      return 'Please select a purpose.'
    if (isOther && !purposeOther.trim()) return 'Please describe the purpose.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    await onConfirm({ visitor_name: visitorName, visiting_client_id: clientId, purpose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900">Sign In Visitor</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center text-xl font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Visitor name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Visitor name
            </label>
            <input
              type="text"
              value={visitorName}
              onChange={e => setVisitorName(e.target.value)}
              placeholder="Full name"
              autoComplete="off"
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal transition-colors"
            />
          </div>

          {/* Who are they visiting */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Visiting
            </label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-gray-900 focus:outline-none focus:border-teal transition-colors bg-white"
            >
              <option value="">Select resident…</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name} — Flat {String(c.room_number || '').replace(/\D/g, '')}
                </option>
              ))}
            </select>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Purpose of visit
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PURPOSE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { setPurpose(opt); setPurposeOther('') }}
                  className={`min-h-[44px] rounded-xl border-2 text-sm font-semibold px-3 text-left transition-all ${
                    purposeSelect === opt
                      ? 'border-teal bg-teal/10 text-teal'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Free-text if "Other" selected */}
            {isOther && (
              <input
                type="text"
                value={purposeOther}
                onChange={e => setPurposeOther(e.target.value)}
                placeholder="Describe the purpose…"
                autoFocus
                className="mt-2 w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal transition-colors"
              />
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 min-h-[52px] rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 min-h-[52px] rounded-xl bg-teal text-white font-bold text-sm hover:bg-teal/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
