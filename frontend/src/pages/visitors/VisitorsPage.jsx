import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useVisitors } from '../../hooks/useVisitors'
import { useRealtime } from '../../hooks/useRealtime'
import LiveBadge from '../../components/LiveBadge'
import ActiveVisitorCard from '../../components/visitors/ActiveVisitorCard'
import SignInModal from '../../components/visitors/SignInModal'

const VISITOR_SUBS = [{ table: 'visitors', event: '*' }]

function formatTime(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function duration(signIn, signOut) {
  if (!signIn || !signOut) return '—'
  const mins = Math.round((new Date(signOut) - new Date(signIn)) / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function VisitorsPage() {
  const { user } = useAuth()
  const {
    active, history, clients,
    loading, error,
    fetchAll, signIn, signOut,
  } = useVisitors()

  const [showModal, setShowModal]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast]           = useState(null)
  const [dateFilter, setDateFilter] = useState(todayStr())

  const readonly = user?.role === 'readonly'

  const load = useCallback(() => fetchAll(dateFilter), [fetchAll, dateFilter])

  useEffect(() => { load() }, [load])

  // Live updates: show sign-ins from reception/other tablets instantly
  const liveStatus = useRealtime(VISITOR_SUBS, load)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSignIn(params) {
    setSubmitting(true)
    try {
      await signIn({ ...params, userId: user.id })
      setShowModal(false)
      showToast(`${params.visitor_name} signed in`)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignOut(visitorId) {
    try {
      const v = active?.find(x => x.id === visitorId)
      await signOut(visitorId)
      showToast(`${v?.visitor_name || 'Visitor'} signed out`)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const activeCount = active?.length || 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-y-2 gap-x-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">Visitor Log</h1>
            <LiveBadge status={liveStatus} />
          </div>
          <p className="text-sm text-gray-400">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {!readonly && (
          <button
            onClick={() => setShowModal(true)}
            className="min-h-[44px] px-4 rounded-xl bg-teal text-white text-sm font-bold hover:bg-teal/90 transition-colors flex-shrink-0"
          >
            + Sign In
          </button>
        )}
      </div>

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

      {/* Loading skeleton */}
      {loading && !active && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      )}

      {/* ── Active Visitors ── */}
      {active !== null && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-800">Currently Signed In</h2>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              activeCount > 0
                ? 'bg-orange-100 text-orange-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {activeCount > 0 ? `${activeCount} visitor${activeCount > 1 ? 's' : ''}` : 'Clear'}
            </span>
          </div>

          {activeCount === 0 ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl px-4 py-5 text-center">
              <div className="text-2xl mb-1">✅</div>
              <div className="text-sm font-semibold text-green-700">No visitors currently in the building</div>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map(v => (
                <ActiveVisitorCard
                  key={v.id}
                  visitor={v}
                  onSignOut={handleSignOut}
                  readonly={readonly}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── History ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-bold text-gray-800">Visit history</h2>
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            max={todayStr()}
            className="min-h-[40px] rounded-xl border-2 border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:border-teal transition-colors"
          />
        </div>

        {history !== null && history.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm font-medium">No visits recorded for this date</p>
          </div>
        )}

        {history !== null && history.length > 0 && (
          <div className="space-y-2">
            {history.map(v => {
              const client = v.clients
              const staff  = v.users?.full_name || 'Staff'
              return (
                <div
                  key={v.id}
                  className="bg-white rounded-2xl border-2 border-gray-200 px-4 py-3 flex items-start gap-3"
                >
                  <div className="text-xl shrink-0 mt-0.5">👤</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900">{v.visitor_name}</span>
                      <span className="text-xs font-semibold text-gray-500">
                        → {client?.full_name}
                        {client?.room_number && ` · Rm ${client.room_number}`}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDate(v.sign_in_time)} · {formatTime(v.sign_in_time)}–{formatTime(v.sign_out_time)}
                      <span className="ml-1 font-medium text-gray-500">
                        ({duration(v.sign_in_time, v.sign_out_time)})
                      </span>
                      {' · '}Signed in by {staff}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{v.purpose}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Sign-in modal */}
      {showModal && (
        <SignInModal
          clients={clients}
          onConfirm={handleSignIn}
          onCancel={() => setShowModal(false)}
          loading={submitting}
        />
      )}
    </div>
  )
}
