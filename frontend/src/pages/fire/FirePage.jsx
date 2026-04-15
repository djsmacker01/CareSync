import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useFire, CHECK_META } from '../../hooks/useFire'
import { useRealtime } from '../../hooks/useRealtime'
import LiveBadge from '../../components/LiveBadge'
import CheckCard from '../../components/fire/CheckCard'
import LogCheckModal from '../../components/fire/LogCheckModal'

const FIRE_SUBS = [{ table: 'fire_safety_checks', event: 'INSERT' }]

const STATUS_STYLES = {
  pass:            { pill: 'badge-given',   label: 'Pass'            },
  fail:            { pill: 'badge-refused', label: 'Fail'            },
  action_required: { pill: 'badge-pending', label: 'Action Required' },
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function FirePage() {
  const { user } = useAuth()
  const { status, history, loading, error, fetchStatus, fetchHistory, logCheck } = useFire()

  const [showModal, setShowModal]     = useState(false)
  const [modalType, setModalType]     = useState(null)   // pre-select check type from card click
  const [submitting, setSubmitting]   = useState(false)
  const [toast, setToast]             = useState(null)
  const [historyFilter, setFilter]    = useState('all')

  const readonly = user?.role === 'readonly'

  const load = useCallback(() => {
    fetchStatus()
    fetchHistory()
  }, [fetchStatus, fetchHistory])

  useEffect(() => { load() }, [load])

  // Live updates from other devices
  const liveStatus = useRealtime(FIRE_SUBS, load)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function openModal(checkType = null) {
    setModalType(checkType)
    setShowModal(true)
  }

  async function handleLogCheck({ check_type, status: checkStatus, notes }) {
    setSubmitting(true)
    try {
      await logCheck({ check_type, status: checkStatus, notes, userId: user.id })
      setShowModal(false)
      const meta = CHECK_META[check_type]
      showToast(`${meta.label} logged as ${checkStatus.replace('_', ' ')}`)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const overdueCount = status?.filter(c => c.overdue).length || 0

  const filteredHistory = history?.filter(c =>
    historyFilter === 'all' || c.check_type === historyFilter
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-y-2 gap-x-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">Fire Safety</h1>
            <LiveBadge status={liveStatus} />
          </div>
          <p className="text-sm text-gray-400">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {!readonly && (
          <button
            onClick={() => openModal(null)}
            className="min-h-[44px] px-4 rounded-xl bg-teal text-white text-sm font-bold hover:bg-teal/90 transition-colors flex-shrink-0"
          >
            + Log Check
          </button>
        )}
      </div>

      {/* Overdue alert banner */}
      {overdueCount > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <div className="font-bold text-red-800 text-sm">
              {overdueCount} check{overdueCount > 1 ? 's' : ''} overdue
            </div>
            <div className="text-xs text-red-600">
              Complete outstanding checks as soon as possible
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
          toast.type === 'error'
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}{' '}
          <button onClick={load} className="ml-2 underline font-semibold">Retry</button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && !status && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Check type status cards */}
      {status && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {status.map(checkData => (
            <CheckCard
              key={checkData.check_type}
              checkData={checkData}
              onLogCheck={openModal}
              readonly={readonly}
            />
          ))}
        </div>
      )}

      {/* History section */}
      {history !== null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">Recent Checks</h2>
            <span className="text-xs text-gray-400">{history.length} record{history.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {[
              { value: 'all', label: 'All' },
              ...Object.entries(CHECK_META).map(([v, m]) => ({ value: v, label: m.icon + ' ' + m.label })),
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`shrink-0 min-h-[36px] px-3 rounded-lg text-xs font-bold transition-all ${
                  historyFilter === f.value
                    ? 'bg-navy text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredHistory?.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm font-medium">No records yet</p>
            </div>
          )}

          {filteredHistory && filteredHistory.length > 0 && (
            <div className="space-y-2">
              {filteredHistory.map(check => {
                const meta     = CHECK_META[check.check_type] || { icon: '🔥', label: check.check_type }
                const styleSt  = STATUS_STYLES[check.status] ?? STATUS_STYLES.pass
                const byName   = check.users?.full_name || 'Staff'
                return (
                  <div
                    key={check.id}
                    className={`bg-white rounded-2xl border-2 px-4 py-3 flex items-start gap-3 ${
                      check.status === 'fail' || check.status === 'action_required'
                        ? 'border-amber-200'
                        : 'border-gray-200'
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-gray-900">{meta.label}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styleSt.pill}`}>
                          {styleSt.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {formatDateTime(check.created_at)} · {byName}
                      </div>
                      {check.notes && (
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{check.notes}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <LogCheckModal
          initialType={modalType}
          onConfirm={handleLogCheck}
          onCancel={() => { setShowModal(false); setModalType(null) }}
          loading={submitting}
        />
      )}
    </div>
  )
}
