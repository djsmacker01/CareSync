import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const ENTRY_TYPES = [
  { value: 'administered', label: 'Administered',  color: 'bg-green-500',  desc: 'Given to resident'          },
  { value: 'received',     label: 'Received',       color: 'bg-blue-500',   desc: 'New stock delivered'        },
  { value: 'wasted',       label: 'Wasted',         color: 'bg-red-500',    desc: 'Destroyed / expired'        },
  { value: 'returned',     label: 'Returned',       color: 'bg-gray-500',   desc: 'Sent back to pharmacy'      },
]

export default function AddEntryModal({ drug, clientName, onSave, onClose }) {
  const { user } = useAuth()

  const [entryType,    setEntryType]    = useState('administered')
  const [quantity,     setQuantity]     = useState('')
  const [witnessId,    setWitnessId]    = useState('')
  const [witnessName,  setWitnessName]  = useState('')
  const [useExternal,  setUseExternal]  = useState(false)
  const [notes,        setNotes]        = useState('')
  const [adminAt,      setAdminAt]      = useState(() => {
    const now = new Date()
    now.setSeconds(0, 0)
    return now.toISOString().slice(0, 16)  // "YYYY-MM-DDTHH:MM"
  })
  const [staffList,    setStaffList]    = useState([])
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState(null)

  const needsWitness = ['administered', 'wasted'].includes(entryType)
  const isReceived   = entryType === 'received'

  // Load staff list for witness selector
  useEffect(() => {
    supabase
      .from('users')
      .select('id, full_name, role')
      .eq('is_active', true)
      .neq('id', user.id)   // can't witness your own entry
      .order('full_name')
      .then(({ data }) => setStaffList(data || []))
  }, [user.id])

  // Calculate preview balance
  const qty = parseFloat(quantity) || 0
  const preview = isReceived
    ? drug.current_stock + qty
    : drug.current_stock - qty

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!quantity || qty <= 0) return setError('Enter a valid quantity.')
    if (!isReceived && qty > drug.current_stock) {
      return setError(`Only ${drug.current_stock} ${drug.unit} in stock.`)
    }
    if (needsWitness && !useExternal && !witnessId) {
      return setError('Select a witness from staff, or use an external witness.')
    }
    if (needsWitness && useExternal && !witnessName.trim()) {
      return setError('Enter the external witness name.')
    }

    setSaving(true)
    try {
      await onSave({
        drug_id:        drug.id,
        client_id:      drug.client_id,
        entry_type:     entryType,
        quantity_in:    isReceived ? qty : undefined,
        quantity_out:   !isReceived ? qty : undefined,
        witnessed_by:   needsWitness && !useExternal ? witnessId : undefined,
        witness_name:   needsWitness && useExternal  ? witnessName.trim() : undefined,
        administered_at: new Date(adminAt).toISOString(),
        notes:           notes.trim() || undefined,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="add-entry-title"
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white rounded-t-3xl z-10">
          <div>
            <h2 id="add-entry-title" className="text-lg font-black text-gray-900">CD Register Entry</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              <span className="font-semibold text-amber-600">{drug.name}</span>
              {' '}· {drug.strength} · {clientName}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Entry type */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Entry Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ENTRY_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setEntryType(t.value)}
                  className={`min-h-[56px] rounded-2xl border-2 px-3 py-2 text-left transition-all ${
                    entryType === t.value
                      ? `${t.color} border-transparent text-white`
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-sm">{t.label}</div>
                  <div className={`text-[11px] ${entryType === t.value ? 'text-white/80' : 'text-gray-400'}`}>
                    {t.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Quantity ({drug.unit})
            </label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder={`e.g. 5`}
              required
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:border-teal focus:outline-none"
            />
            {/* Balance preview */}
            {qty > 0 && (
              <div className={`mt-2 text-xs font-semibold flex items-center gap-2 ${
                preview < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                <span>Balance after:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold ${
                  preview < 0
                    ? 'bg-red-100 text-red-700'
                    : preview === 0
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {preview < 0 ? '⚠ Negative' : `${preview} ${drug.unit}`}
                </span>
                <span className="text-gray-400">(was {drug.current_stock} {drug.unit})</span>
              </div>
            )}
          </div>

          {/* Date / time */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Date &amp; Time
            </label>
            <input
              type="datetime-local"
              value={adminAt}
              onChange={e => setAdminAt(e.target.value)}
              max={new Date().toISOString().slice(0, 16)}
              required
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:border-teal focus:outline-none"
            />
          </div>

          {/* Witness — only for administered / wasted */}
          {needsWitness && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Witness (required)
                </label>
                <button
                  type="button"
                  onClick={() => setUseExternal(v => !v)}
                  className="text-xs text-teal font-semibold hover:underline"
                >
                  {useExternal ? 'Use staff member' : 'External witness'}
                </button>
              </div>

              {useExternal ? (
                <input
                  type="text"
                  value={witnessName}
                  onChange={e => setWitnessName(e.target.value)}
                  placeholder="Full name of external witness"
                  className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:border-teal focus:outline-none"
                />
              ) : (
                <select
                  value={witnessId}
                  onChange={e => setWitnessId(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-3 text-sm text-gray-900 focus:border-teal focus:outline-none"
                >
                  <option value="">Select a witness…</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional observations…"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-teal focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 min-h-[48px] rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving || preview < 0}
              className="flex-1 min-h-[48px] rounded-xl bg-teal text-white font-bold text-sm hover:bg-teal/90 disabled:opacity-50">
              {saving ? 'Saving…' : 'Record Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
