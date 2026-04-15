import { useEffect, useState } from 'react'

const TYPE_STYLE = {
  administered: { label: 'Administered', color: 'text-teal',    icon: '💊' },
  received:     { label: 'Received',     color: 'text-given',   icon: '📦' },
  disposed:     { label: 'Disposed',     color: 'text-refused', icon: '🗑' },
  adjustment:   { label: 'Adjustment',   color: 'text-info',    icon: '✏️' },
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
            className="min-h-[44px] min-w-[44px] rounded-xl border-2 border-gray-200 text-gray-400 font-bold hover:bg-gray-50 transition-colors">
            ✕
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
                <span className="text-xl mt-0.5">{t.icon}</span>
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
