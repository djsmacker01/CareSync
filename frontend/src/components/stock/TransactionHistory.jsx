import { useEffect, useState } from 'react'
import { Pill, Package, Trash2, Pencil, X } from 'lucide-react'

const TYPE_STYLE = {
  administered: { label: 'Administered', color: 'text-teal',    Icon: Pill    },
  received:     { label: 'Received',     color: 'text-given',   Icon: Package },
  disposed:     { label: 'Disposed',     color: 'text-refused', Icon: Trash2  },
  adjustment:   { label: 'Adjustment',   color: 'text-info',    Icon: Pencil  },
}

export default function TransactionHistory({ stockId, fetchTransactions, onClose }) {
  const [txs, setTxs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    fetchTransactions(stockId)
      .then(setTxs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [stockId, fetchTransactions])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Transaction Log</div>
            <h2 className="text-lg font-bold text-gray-900">Stock History</h2>
          </div>
          <button onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl border-2 border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          )}
          {error && <p className="text-refused text-sm">{error}</p>}
          {!loading && txs.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">No transactions recorded yet.</p>
          )}
          {!loading && txs.map(tx => {
            const t = TYPE_STYLE[tx.transaction_type] || TYPE_STYLE.adjustment
            const positive = tx.quantity_change > 0
            return (
              <div key={tx.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mt-0.5 shrink-0">
                  <t.Icon className={`w-4 h-4 ${t.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-bold ${t.color}`}>{t.label}</span>
                    <span className={`text-sm font-black ${positive ? 'text-given' : 'text-refused'}`}>
                      {positive ? '+' : ''}{tx.quantity_change}
                    </span>
                  </div>
                  {tx.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{tx.notes}</p>}
                  <div className="text-xs text-gray-400 mt-0.5 flex gap-2">
                    <span>{tx.users?.full_name || 'System'}</span>
                    <span>·</span>
                    <span>{new Date(tx.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
