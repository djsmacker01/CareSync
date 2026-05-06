import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useStaffVisits } from '../../hooks/useStaffVisits'
import { supabase } from '../../lib/supabase'
import {
  MapPin, LogIn, LogOut, Clock, AlertTriangle,
  CheckCircle2, Calendar, ChevronDown, ChevronUp,
  Plus, X, RefreshCw,
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function elapsed(from, to = new Date()) {
  const ms  = new Date(to) - new Date(from)
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${min}m`
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

function VisitStatusBadge({ status, checkedIn, scheduledEnd }) {
  const isOverdue =
    status === 'active' &&
    scheduledEnd &&
    new Date() > new Date(scheduledEnd)

  if (isOverdue || status === 'overdue') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-refused/10 text-refused border border-refused/20">
        <AlertTriangle className="w-3 h-3" /> Overdue
      </span>
    )
  }
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-given/10 text-given border border-given/20">
        <Clock className="w-3 h-3" /> Active · {elapsed(checkedIn)}
      </span>
    )
  }
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
        <CheckCircle2 className="w-3 h-3" /> Completed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-pending/10 text-pending border border-pending/20">
      <Clock className="w-3 h-3" /> Scheduled
    </span>
  )
}

// ── Check-In Modal ─────────────────────────────────────────────────────────

function CheckInModal({ clients, onConfirm, onCancel, loading }) {
  const [clientId, setClientId]       = useState('')
  const [address, setAddress]         = useState('')
  const [notes, setNotes]             = useState('')
  const [duration, setDuration]       = useState('60')
  const [error, setError]             = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    if (!clientId) { setError('Please select a resident'); return }
    const scheduledEnd = duration
      ? new Date(Date.now() + parseInt(duration) * 60000).toISOString()
      : null
    onConfirm({ client_id: clientId, address, check_in_notes: notes, scheduled_end: scheduledEnd })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-given" /> Start Visit
          </h2>
          <button type="button" onClick={onCancel} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-refused/10 border border-refused/20 px-4 py-2 text-sm text-refused font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Resident *</label>
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-teal"
          >
            <option value="">— Select resident —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.full_name} · Flat {String(c.room_number || '').replace(/\D/g, '')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Visit address</label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="e.g. 14 Green Lane, Manchester"
            className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-teal"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Expected duration (minutes)</label>
          <select
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-teal"
          >
            <option value="">No time limit</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="90">1.5 hours</option>
            <option value="120">2 hours</option>
            <option value="180">3 hours</option>
            <option value="240">4 hours</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Check-in notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional — purpose of visit, condition on arrival…"
            className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-teal resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[52px] rounded-xl bg-given text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <LogIn className="w-5 h-5" />
          {loading ? 'Checking in…' : 'Check In Now'}
        </button>
      </form>
    </div>
  )
}

// ── Check-Out Modal ────────────────────────────────────────────────────────

function CheckOutModal({ visit, onConfirm, onCancel, loading }) {
  const [notes, setNotes] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <LogOut className="w-5 h-5 text-navy" /> End Visit
          </h2>
          <button onClick={onCancel} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 space-y-1">
          <div className="font-bold text-gray-900">{visit.client?.full_name}</div>
          <div className="text-xs text-gray-500">
            Checked in {formatTime(visit.checked_in_at)} · Duration {elapsed(visit.checked_in_at)}
          </div>
          {visit.address && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {visit.address}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Check-out notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="How did the visit go? Any concerns or follow-up needed?"
            className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-teal resize-none"
          />
        </div>

        <button
          onClick={() => onConfirm(visit.id, notes)}
          disabled={loading}
          className="w-full min-h-[52px] rounded-xl bg-navy text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <LogOut className="w-5 h-5" />
          {loading ? 'Checking out…' : 'Check Out'}
        </button>
      </div>
    </div>
  )
}

// ── Visit Card ─────────────────────────────────────────────────────────────

function VisitCard({ visit, canCheckOut, onCheckOut }) {
  const [expanded, setExpanded] = useState(false)
  const isOverdue =
    visit.status === 'active' &&
    visit.scheduled_end &&
    new Date() > new Date(visit.scheduled_end)

  return (
    <div className={`rounded-2xl border-2 p-4 transition-all ${
      isOverdue || visit.status === 'overdue'
        ? 'border-refused/40 bg-refused/5'
        : visit.status === 'active'
        ? 'border-given/30 bg-given/5'
        : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900">{visit.client?.full_name}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Staff: {visit.staff?.full_name}
          </div>
          {visit.address && (
            <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{visit.address}</span>
            </div>
          )}
          <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
            <span>In: {formatTime(visit.checked_in_at)}</span>
            {visit.checked_out_at && <span>· Out: {formatTime(visit.checked_out_at)}</span>}
            {visit.scheduled_end && !visit.checked_out_at && (
              <span>· Due back: {formatTime(visit.scheduled_end)}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <VisitStatusBadge
            status={visit.status}
            checkedIn={visit.checked_in_at}
            scheduledEnd={visit.scheduled_end}
          />
          {(visit.check_in_notes || visit.check_out_notes) && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600"
            >
              Notes {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
          {visit.check_in_notes && (
            <div className="text-xs text-gray-600">
              <span className="font-semibold text-gray-700">In: </span>{visit.check_in_notes}
            </div>
          )}
          {visit.check_out_notes && (
            <div className="text-xs text-gray-600">
              <span className="font-semibold text-gray-700">Out: </span>{visit.check_out_notes}
            </div>
          )}
        </div>
      )}

      {canCheckOut && visit.status === 'active' && (
        <button
          onClick={() => onCheckOut(visit)}
          className="mt-3 w-full min-h-[44px] rounded-xl bg-navy text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <LogOut className="w-4 h-4" /> Check Out
        </button>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function StaffVisitsPage() {
  const { user, session } = useAuth()
  const token = session?.access_token
  const { visits, loading, error, refresh, checkIn, checkOut } = useStaffVisits(token)

  const [clients, setClients]           = useState([])
  const [showCheckIn, setShowCheckIn]   = useState(false)
  const [checkOutTarget, setCheckOutTarget] = useState(null)
  const [actionLoading, setActionLoading]   = useState(false)
  const [toast, setToast]               = useState(null)
  const [tab, setTab]                   = useState('today')
  const [historyDate, setHistoryDate]   = useState(new Date().toISOString().slice(0, 10))
  const [history, setHistory]           = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const { fetchHistory } = useStaffVisits(token)

  // Load clients for the check-in dropdown
  useEffect(() => {
    supabase
      .from('clients')
      .select('id, full_name, room_number')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => setClients(data || []))
  }, [])

  // Auto-refresh active visits every minute
  useEffect(() => {
    const id = setInterval(refresh, 60000)
    return () => clearInterval(id)
  }, [refresh])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCheckIn(payload) {
    setActionLoading(true)
    try {
      await checkIn(payload)
      setShowCheckIn(false)
      showToast('Visit started — stay safe!')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCheckOut(visitId, notes) {
    setActionLoading(true)
    try {
      await checkOut(visitId, notes)
      setCheckOutTarget(null)
      showToast('Visit completed — well done!')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function loadHistory() {
    setHistoryLoading(true)
    try {
      const data = await fetchHistory(historyDate)
      setHistory(data)
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab, historyDate])

  const active    = visits.filter(v => v.status === 'active' || v.status === 'overdue')
  const completed = visits.filter(v => v.status === 'completed')
  const overdue   = active.filter(v =>
    v.status === 'overdue' || (v.scheduled_end && new Date() > new Date(v.scheduled_end))
  )

  const isManager = ['manager', 'supervisor'].includes(user?.role)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Staff Visits</h1>
          <p className="text-sm text-gray-500 mt-0.5">Lone worker check-in · Supported living</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="min-h-[44px] min-w-[44px] rounded-xl border-2 border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCheckIn(true)}
            className="min-h-[44px] px-4 rounded-xl bg-given text-white font-bold text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Start Visit
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          toast.type === 'error' ? 'bg-refused/10 text-refused border border-refused/20' :
          'bg-given/10 text-given border border-given/20'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Overdue alert banner */}
      {overdue.length > 0 && (
        <div className="rounded-2xl bg-refused/10 border-2 border-refused/30 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-refused shrink-0" />
          <div>
            <div className="font-bold text-refused text-sm">
              {overdue.length} overdue {overdue.length === 1 ? 'visit' : 'visits'}
            </div>
            <div className="text-xs text-refused/70">
              Staff members have not checked out within the expected time
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1">
        {[
          { id: 'today',   label: `Today (${visits.length})` },
          { id: 'history', label: 'History' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-h-[40px] rounded-lg text-sm font-bold transition-all ${
              tab === t.id ? 'bg-white text-navy shadow' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Today tab ── */}
      {tab === 'today' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading visits…</div>
          ) : error ? (
            <div className="rounded-xl bg-refused/10 border border-refused/20 px-4 py-3 text-sm text-refused">{error}</div>
          ) : visits.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 flex flex-col items-center gap-3 text-gray-400">
              <MapPin className="w-10 h-10" />
              <div className="font-semibold">No visits today</div>
              <div className="text-sm">Tap "Start Visit" to check in when you arrive</div>
            </div>
          ) : (
            <>
              {active.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Active ({active.length})
                  </h2>
                  <div className="space-y-3">
                    {active.map(v => (
                      <VisitCard
                        key={v.id}
                        visit={v}
                        canCheckOut={isManager || v.staff_id === user?.id}
                        onCheckOut={setCheckOutTarget}
                      />
                    ))}
                  </div>
                </section>
              )}
              {completed.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Completed ({completed.length})
                  </h2>
                  <div className="space-y-3">
                    {completed.map(v => (
                      <VisitCard key={v.id} visit={v} canCheckOut={false} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}

      {/* ── History tab ── */}
      {tab === 'history' && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={historyDate}
                onChange={e => setHistoryDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 pl-9 pr-3 text-sm focus:outline-none focus:border-teal"
              />
            </div>
          </div>

          {historyLoading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No visits on this date</div>
          ) : (
            <div className="space-y-3">
              {history.map(v => (
                <VisitCard key={v.id} visit={v} canCheckOut={false} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showCheckIn && (
        <CheckInModal
          clients={clients}
          onConfirm={handleCheckIn}
          onCancel={() => setShowCheckIn(false)}
          loading={actionLoading}
        />
      )}
      {checkOutTarget && (
        <CheckOutModal
          visit={checkOutTarget}
          onConfirm={handleCheckOut}
          onCancel={() => setCheckOutTarget(null)}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
