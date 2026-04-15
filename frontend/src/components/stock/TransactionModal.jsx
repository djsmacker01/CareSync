import { useState } from 'react'

const TYPES = [
  { value: 'received',   label: '+ Received',   desc: 'New stock delivered',        color: 'given'   },
  { value: 'disposed',   label: '− Disposed',   desc: 'Expired or damaged stock',   color: 'refused' },
  { value: 'adjustment', label: '± Adjustment', desc: 'Manual correction',          color: 'info'    },
]

export default function TransactionModal({ stockItem, clientName, onConfirm, onCancel, loading }) {
  const { medications: med, current_quantity, unit, reorder_threshold } = stockItem

  const [type, setType]     = useState('received')
  const [qty, setQty]       = useState('')
  const [notes, setNotes]   = useState('')
  const [sign, setSign]     = useState(1)   // for adjustment: +1 or -1

  const numQty   = parseInt(qty, 10) || 0
  const isAdj    = type === 'adjustment'
  const finalQty = isAdj ? numQty * sign : numQty
  const newLevel =
    type === 'received'   ? current_quantity + Math.abs(finalQty) :
    type === 'disposed'   ? current_quantity - Math.abs(finalQty) :
    current_quantity + finalQty

  const invalid = newLevel < 0 || numQty <= 0

  function handleSubmit(e) {
    e.preventDefault()
    if (invalid) return
    onConfirm({ transaction_type: type, quantity: finalQty, notes: notes.trim() || null })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Stock Update</div>
          <h2 className="text-lg font-bold text-gray-900">{med?.medication_name} {med?.dosage}</h2>
          <p className="text-sm text-gray-400">{clientName} · Current: <span className="font-bold text-gray-700">{current_quantity} {unit}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Transaction type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`min-h-[56px] rounded-xl border-2 text-xs font-bold transition-all p-2 ${
                    type === t.value
                      ? `border-${t.color} bg-${t.color}/5 text-${t.color}`
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="text-base">{t.label.split(' ')[0]}</div>
                  <div>{t.label.split(' ').slice(1).join(' ')}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{TYPES.find(t => t.value === type)?.desc}</p>
          </div>

          {/* Quantity input */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Quantity ({unit})
            </label>
            <div className="flex gap-2">
              {isAdj && (
                <div className="flex rounded-xl border-2 border-gray-200 overflow-hidden">
                  <button type="button" onClick={() => setSign(1)}
                    className={`min-h-[48px] px-3 font-bold text-sm transition-colors ${sign === 1 ? 'bg-given text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                    +
                  </button>
                  <button type="button" onClick={() => setSign(-1)}
                    className={`min-h-[48px] px-3 font-bold text-sm transition-colors ${sign === -1 ? 'bg-refused text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                    −
                  </button>
                </div>
              )}
              <input
                type="number"
                min="1"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="0"
                required
                className="flex-1 min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-gray-900 text-lg font-bold focus:outline-none focus:border-teal transition-colors"
              />
            </div>
          </div>

          {/* New level preview */}
          {numQty > 0 && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
              newLevel < 0              ? 'bg-refused/10 border-refused/20 text-refused' :
              newLevel <= reorder_threshold ? 'bg-pending/10 border-pending/20 text-pending' :
              'bg-given/10 border-given/20 text-given'
            }`}>
              New stock level: <span className="font-black">{newLevel < 0 ? 'Invalid' : `${newLevel} ${unit}`}</span>
              {newLevel <= reorder_threshold && newLevel >= 0 && ' ⚠ Below reorder threshold'}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Notes {type !== 'received' ? '*' : '(optional)'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              required={type !== 'received'}
              placeholder={
                type === 'received'   ? 'e.g. Monthly delivery from pharmacy' :
                type === 'disposed'   ? 'e.g. Expired 01/2025' :
                'e.g. Correction after stock count'
              }
              className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:outline-none focus:border-teal transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} disabled={loading}
              className="flex-1 min-h-[52px] rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={loading || invalid}
              className="flex-1 min-h-[52px] rounded-xl bg-teal text-white font-bold text-sm hover:bg-teal/90 transition-colors disabled:opacity-40">
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
