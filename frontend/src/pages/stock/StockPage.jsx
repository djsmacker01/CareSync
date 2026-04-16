import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useStock } from '../../hooks/useStock'
import { useRealtime } from '../../hooks/useRealtime'
import LiveBadge from '../../components/LiveBadge'
import StockLevelBadge, { stockStatus } from '../../components/stock/StockLevelBadge'
import TransactionModal from '../../components/stock/TransactionModal'
import TransactionHistory from '../../components/stock/TransactionHistory'

const STOCK_SUBS = [
  { table: 'stock',              event: 'UPDATE' },
  { table: 'stock_transactions', event: 'INSERT' },
]

export default function StockPage() {
  const { user } = useAuth()
  const { data, loading, error, fetchAll, fetchTransactions, recordTransaction } = useStock()

  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')   // all | critical | low
  const [txModal, setTxModal]       = useState(null)    // { stockItem, clientName }
  const [historyItem, setHistory]   = useState(null)    // stockId
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast]           = useState(null)

  const canEdit = ['manager', 'supervisor'].includes(user?.role)

  useEffect(() => { fetchAll() }, [fetchAll])

  // Live stock level updates from other devices
  const liveStatus = useRealtime(STOCK_SUBS, fetchAll)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  async function handleTransaction({ transaction_type, quantity, notes }) {
    setSubmitting(true)
    try {
      const newQty = await recordTransaction({
        stockId:          txModal.stockItem.id,
        transaction_type,
        quantity,
        notes,
        performedBy:      user.id,
      })
      showToast(`Stock updated — new level: ${newQty} ${txModal.stockItem.unit}`)
      setTxModal(null)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Flatten all stock items for filtering
  const allItems = (data?.clients || []).flatMap(c =>
    c.stock.map(s => ({ ...s, clientName: c.full_name, roomNumber: c.room_number, client: c }))
  )

  const filteredClients = (data?.clients || [])
    .map(c => ({
      ...c,
      stock: c.stock.filter(s => {
        const status = stockStatus(s.current_quantity, s.reorder_threshold)
        if (filter === 'critical' && status !== 'critical') return false
        if (filter === 'low'      && !['critical', 'low'].includes(status)) return false
        const term = search.toLowerCase()
        if (term && !s.medications?.medication_name.toLowerCase().includes(term) &&
                    !c.full_name.toLowerCase().includes(term) &&
                    !c.room_number?.toLowerCase().includes(term)) return false
        return true
      }),
    }))
    .filter(c => c.stock.length > 0)

  const criticalCount = allItems.filter(s => stockStatus(s.current_quantity, s.reorder_threshold) === 'critical').length
  const lowCount      = allItems.filter(s => stockStatus(s.current_quantity, s.reorder_threshold) === 'low').length

  // Print-friendly monthly summary
  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-y-2 gap-x-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">Stock Manager</h1>
            <LiveBadge status={liveStatus} />
          </div>
          <p className="text-sm text-gray-400">
            {allItems.length} medications · {data?.clients?.length || 0} clients
          </p>
        </div>
        {canEdit && (
          <button onClick={handlePrint}
            className="min-h-[44px] px-4 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors print:hidden flex-shrink-0">
            ⬇ Export
          </button>
        )}
      </div>

      {/* Alert banner */}
      {criticalCount > 0 && (
        <div className="bg-refused/10 border-2 border-refused/30 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="font-bold text-refused text-sm">
              {criticalCount} medication{criticalCount > 1 ? 's' : ''} at or below reorder threshold
            </div>
            <div className="text-xs text-refused/70 mt-0.5">Order required immediately</div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
          toast.type === 'error' ? 'bg-refused/10 text-refused border-refused/20' : 'bg-given/10 text-given border-given/20'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search medication or client…"
          className="flex-1 min-h-[44px] rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-teal transition-colors"
        />
        <div className="flex bg-gray-100 rounded-xl p-1">
          {[
            { value: 'all',      label: 'All' },
            { value: 'critical', label: `🔴 Critical${criticalCount ? ` (${criticalCount})` : ''}` },
            { value: 'low',      label: `🟡 Low${lowCount ? ` (${lowCount})` : ''}` },
          ].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filter === f.value ? 'bg-white text-navy shadow' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      )}

      {error && (
        <div className="bg-refused/10 border border-refused/20 text-refused text-sm rounded-xl px-4 py-3">
          {error} <button onClick={fetchAll} className="ml-2 underline font-semibold">Retry</button>
        </div>
      )}

      {/* Client stock cards */}
      {!loading && filteredClients.map(client => (
        <div key={client.id} className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
          {/* Client header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-gray-900">{client.full_name}</span>
              <span className="text-xs text-gray-400 ml-2">Flat {client.room_number}</span>
            </div>
            <span className="text-xs text-gray-400">{client.stock.length} meds</span>
          </div>

          {/* Medication rows */}
          <div className="divide-y divide-gray-100">
            {client.stock.map(s => {
              const status = stockStatus(s.current_quantity, s.reorder_threshold)
              return (
                <div key={s.id}
                  className={`px-4 py-3 ${
                    status === 'critical' ? 'bg-refused/5' :
                    status === 'low'      ? 'bg-pending/5' : ''
                  }`}>
                  {/* Top row: name (clickable → history) + level badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <button
                      onClick={() => setHistory(s.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="font-semibold text-gray-900 text-sm leading-snug hover:text-teal transition-colors">
                        {s.medications?.medication_name}
                        <span className="font-normal text-gray-400 ml-1">{s.medications?.dosage}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {s.medications?.frequency} · Reorder at: {s.reorder_threshold} {s.unit}
                      </div>
                    </button>
                    <div className="shrink-0">
                      <StockLevelBadge qty={s.current_quantity} threshold={s.reorder_threshold} unit={s.unit} />
                    </div>
                  </div>
                  {/* Bottom row: action buttons */}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setHistory(s.id)}
                      className="min-h-[36px] px-3 rounded-lg border border-gray-200 text-gray-400 text-xs font-medium hover:bg-gray-50 transition-colors"
                      title="View transaction history"
                    >
                      📋 History
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => setTxModal({ stockItem: s, clientName: client.full_name })}
                        className="min-h-[36px] px-3 rounded-lg bg-teal text-white text-xs font-bold hover:bg-teal/90 transition-colors"
                      >
                        Update
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {!loading && filteredClients.length === 0 && !error && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📦</div>
          <p className="font-medium">No stock records found</p>
          {(search || filter !== 'all') && <p className="text-sm mt-1">Try clearing filters</p>}
        </div>
      )}

      {/* Transaction modal */}
      {txModal && (
        <TransactionModal
          stockItem={txModal.stockItem}
          clientName={txModal.clientName}
          onConfirm={handleTransaction}
          onCancel={() => setTxModal(null)}
          loading={submitting}
        />
      )}

      {/* Transaction history modal */}
      {historyItem && (
        <TransactionHistory
          stockId={historyItem}
          fetchTransactions={fetchTransactions}
          onClose={() => setHistory(null)}
        />
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          nav, header, button, input { display: none !important; }
          body { background: white; }
          .rounded-2xl { border: 1px solid #ccc; border-radius: 0; }
        }
      `}</style>
    </div>
  )
}
