import { useState, useEffect } from 'react'
import { CHECK_TYPES, CHECK_META } from '../../hooks/useFire'

const STATUS_OPTIONS = [
  { value: 'pass',            label: '✓  Pass',            style: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' },
  { value: 'fail',            label: '✗  Fail',            style: 'bg-red-100   text-red-800   border-red-300   hover:bg-red-200'   },
  { value: 'action_required', label: '⚠  Action Required', style: 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200' },
]

export default function LogCheckModal({ initialType, onConfirm, onCancel, loading }) {
  const [checkType, setCheckType] = useState(initialType || CHECK_TYPES[0])
  const [status, setStatus]       = useState(null)
  const [notes, setNotes]         = useState('')
  const [error, setError]         = useState('')

  useEffect(() => {
    if (initialType) setCheckType(initialType)
  }, [initialType])

  const needsNotes = ['fail', 'action_required'].includes(status)

  function validate() {
    if (!status) return 'Please select a status.'
    if (needsNotes && !notes.trim()) return 'Notes are required when status is Fail or Action Required.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    await onConfirm({ check_type: checkType, status, notes })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900">Log Fire Safety Check</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center text-xl font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Check type selector */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Check Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CHECK_TYPES.map(type => {
                const meta = CHECK_META[type]
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCheckType(type)}
                    className={`min-h-[52px] rounded-xl border-2 text-sm font-bold transition-all flex items-center gap-2 px-3 ${
                      checkType === type
                        ? 'border-teal bg-teal/10 text-teal'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span>{meta.icon}</span>
                    <span className="text-left leading-tight">{meta.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Outcome
            </label>
            <div className="flex flex-col gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`min-h-[52px] rounded-xl border-2 text-sm font-bold transition-all px-4 flex items-center ${
                    status === opt.value
                      ? `${opt.style} border-current scale-[1.02]`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Notes {needsNotes ? <span className="text-red-500">*</span> : '(optional)'}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder={needsNotes ? 'Describe the issue and any action taken…' : 'Any observations or actions taken…'}
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal transition-colors resize-none"
            />
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
              disabled={loading || !status}
              className="flex-1 min-h-[52px] rounded-xl bg-teal text-white font-bold text-sm hover:bg-teal/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving…' : 'Save Check'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
