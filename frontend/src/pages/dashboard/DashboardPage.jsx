import { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../../hooks/useDashboard'
import { useRealtime } from '../../hooks/useRealtime'
import LiveBadge from '../../components/LiveBadge'

// Stable subscription list — defined outside the component so the reference
// never changes between renders and the WebSocket is only opened once.
const DASHBOARD_SUBS = [
  { table: 'mar_entries',        event: 'INSERT' },
  { table: 'task_completions',   event: '*'      },
  { table: 'stock',              event: 'UPDATE' },
  { table: 'visitors',           event: '*'      },
  { table: 'fire_safety_checks', event: 'INSERT' },
  { table: 'handover_notes',     event: '*'      },
]

// ── Helpers ─────────────────────────────────────────────────────
function pct(done, total) {
  if (!total) return 0
  return Math.round((done / total) * 100)
}

function formatTime(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ── Stat card ────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, status, onClick }) {
  const colors = {
    ok:   'border-green-200  bg-green-50',
    warn: 'border-amber-200  bg-amber-50',
    alert:'border-red-200    bg-red-50',
    info: 'border-gray-200   bg-white',
  }
  const textColors = {
    ok:   'text-green-700',
    warn: 'text-amber-700',
    alert:'text-red-700',
    info: 'text-gray-900',
  }
  return (
    <button
      onClick={onClick}
      className={`text-left w-full rounded-2xl border-2 p-4 space-y-2 transition-all hover:scale-[1.01] active:scale-[0.99] ${colors[status] || colors.info}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-3xl font-black tabular-nums ${textColors[status] || textColors.info}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-500 leading-relaxed">{sub}</div>}
    </button>
  )
}

// ── Progress bar row ─────────────────────────────────────────────
function ShiftBar({ label, done, total }) {
  const p = pct(done, total)
  const color = p === 100 ? 'bg-green-500' : p >= 60 ? 'bg-teal' : 'bg-amber-400'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-gray-700">{label}</span>
        <span className={`font-bold tabular-nums ${p === 100 ? 'text-green-600' : 'text-gray-600'}`}>
          {done}/{total} <span className="text-gray-400 font-normal">({p}%)</span>
        </span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────
function Section({ title, children, action }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data, loading, error, fetchSummary } = useDashboard()

  const now = new Date()
  const [reportMonth, setReportMonth] = useState(now.getMonth())
  const [reportYear,  setReportYear]  = useState(now.getFullYear())

  useEffect(() => { fetchSummary() }, [fetchSummary])

  // Re-fetch whenever any staff member changes data on their device
  const liveStatus = useRealtime(DASHBOARD_SUBS, useCallback(() => {
    fetchSummary()
  }, [fetchSummary]))

  const d = data

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-y-2 gap-x-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">Manager Dashboard</h1>
            <LiveBadge status={liveStatus} />
          </div>
          <p className="text-sm text-gray-400">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="min-h-[44px] px-4 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-40 flex-shrink-0"
        >
          {loading ? '↻ Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}{' '}
          <button onClick={fetchSummary} className="ml-2 underline font-semibold">Retry</button>
        </div>
      )}

      {/* Skeleton */}
      {loading && !d && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
          <div className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
            <div className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
          </div>
        </div>
      )}

      {d && (
        <>
          {/* ── 4 KPI cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* MAR */}
            <StatCard
              icon="💊"
              label="Today's MAR"
              value={d.mar.expected > 0 ? `${pct(d.mar.given, d.mar.expected)}%` : '—'}
              sub={`${d.mar.given} given · ${d.mar.refused} refused · ${d.mar.missed} missed`}
              status={
                d.mar.missed > 0   ? 'alert' :
                d.mar.refused > 0  ? 'warn'  : 'ok'
              }
              onClick={() => navigate('/mar')}
            />

            {/* Stock */}
            <StatCard
              icon="📦"
              label="Stock Alerts"
              value={d.lowStock.length}
              sub={d.lowStock.length === 0 ? 'All items above threshold' : `${d.lowStock.length} item${d.lowStock.length > 1 ? 's' : ''} at or below reorder level`}
              status={d.lowStock.length === 0 ? 'ok' : d.lowStock.length <= 2 ? 'warn' : 'alert'}
              onClick={() => navigate('/stock')}
            />

            {/* Fire */}
            <StatCard
              icon="🔥"
              label="Fire Safety"
              value={d.fire.overdue === 0 ? '✓ Clear' : `${d.fire.overdue} overdue`}
              sub={d.fire.overdue === 0 ? 'All checks up to date' : 'Log outstanding checks now'}
              status={d.fire.overdue === 0 ? 'ok' : d.fire.overdue === 1 ? 'warn' : 'alert'}
              onClick={() => navigate('/fire')}
            />

            {/* Visitors */}
            <StatCard
              icon="👤"
              label="Visitors"
              value={d.visitors.today}
              sub={
                d.visitors.active > 0
                  ? `${d.visitors.active} currently in building`
                  : d.visitors.today === 0
                    ? 'No visitors today'
                    : 'Building clear'
              }
              status={d.visitors.active > 0 ? 'warn' : 'info'}
              onClick={() => navigate('/visitors')}
            />
          </div>

          {/* ── Task Completion ── */}
          <Section
            title="Task Completion — Today"
            action={
              <button onClick={() => navigate('/tasks')} className="text-xs font-bold text-teal hover:underline min-h-[44px] px-2">
                View →
              </button>
            }
          >
            {d.tasks.am.expected === 0 && d.tasks.pm.expected === 0 ? (
              <p className="text-sm text-gray-400">No tasks configured.</p>
            ) : (
              <div className="space-y-4">
                {d.tasks.am.expected > 0 && (
                  <ShiftBar label="☀️ Morning shift" done={d.tasks.am.done} total={d.tasks.am.expected} />
                )}
                {d.tasks.pm.expected > 0 && (
                  <ShiftBar label="🌙 Afternoon shift" done={d.tasks.pm.done} total={d.tasks.pm.expected} />
                )}
              </div>
            )}
          </Section>

          {/* ── Bottom two-column row ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Recent refusals */}
            <Section
              title="Medication Refusals"
              action={<span className="text-xs text-gray-400">Last 7 days</span>}
            >
              {d.refusals.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-2xl mb-1">✅</div>
                  <p className="text-sm text-gray-400">No refusals in the last 7 days</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {d.refusals.map(r => (
                    <div key={r.id} className="bg-red-50 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-red-700">
                          {r.clients?.full_name}
                        </span>
                        <span className="text-xs text-red-500">
                          {r.medications?.medication_name}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {formatDate(r.administered_at)} {formatTime(r.administered_at)} · {r.shift === 'AM' ? 'Morning' : r.shift === 'PM' ? 'Afternoon' : r.shift}
                        </span>
                      </div>
                      {r.refusal_reason && (
                        <p className="text-xs text-red-600 mt-0.5 italic">"{r.refusal_reason}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Handover notes */}
            <Section
              title="Today's Handover Notes"
              action={
                <button onClick={() => navigate('/tasks')} className="text-xs font-bold text-teal hover:underline min-h-[44px] px-2">
                  Tasks →
                </button>
              }
            >
              {d.handoverNotes.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-2xl mb-1">📋</div>
                  <p className="text-sm text-gray-400">No handover notes yet today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {['AM', 'PM'].map(shift => {
                    const note = d.handoverNotes.find(n => n.shift === shift)
                    if (!note) return null
                    return (
                      <div key={shift} className="bg-blue-50 rounded-xl px-3 py-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-700">
                            {shift === 'AM' ? '☀️ Morning' : '🌙 Afternoon'} shift
                          </span>
                          <span className="text-xs text-gray-400">
                            {note.users?.full_name || 'Staff'}
                          </span>
                        </div>
                        <p className="text-xs text-blue-800 leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </p>
                        {note.flags?.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1">
                            {note.flags.includes('incomplete_tasks') && (
                              <span className="badge-pending">Incomplete tasks</span>
                            )}
                            {note.flags.includes('med_refused') && (
                              <span className="badge-refused">Med refusal</span>
                            )}
                            {note.flags.includes('low_stock') && (
                              <span className="badge-pending">Low stock</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>
          </div>

          {/* ── Low stock detail ── */}
          {d.lowStock.length > 0 && (
            <Section
              title={`⚠ Low Stock — ${d.lowStock.length} item${d.lowStock.length > 1 ? 's' : ''}`}
              action={
                <button onClick={() => navigate('/stock')} className="text-xs font-bold text-teal hover:underline min-h-[44px] px-2">
                  Manage →
                </button>
              }
            >
              <div className="space-y-2">
                {d.lowStock.map(s => (
                  <div
                    key={s.id}
                    className={`rounded-xl px-3 py-2 flex items-center justify-between gap-2 ${
                      s.current_quantity === 0 ? 'bg-red-50' : 'bg-amber-50'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-gray-900">
                        {s.medications?.medication_name}
                        <span className="font-normal text-gray-500 ml-1">{s.medications?.dosage}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {s.clients?.full_name} · Flat {String(s.clients?.room_number || '').replace(/\D/g, '')}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-lg font-black tabular-nums ${s.current_quantity === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {s.current_quantity}
                      </div>
                      <div className="text-xs text-gray-400">{s.unit}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {/* ── Monthly Report Generator — always visible ── */}
      <Section title="Monthly Report">
        <p className="text-sm text-gray-500">
          Generate a PDF summary of MAR records, stock transactions, task completion, fire checks, and visitor logs for any month.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={reportMonth}
            onChange={e => setReportMonth(Number(e.target.value))}
            className="min-h-[40px] rounded-xl border-2 border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:border-teal"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={reportYear}
            onChange={e => setReportYear(Number(e.target.value))}
            className="min-h-[40px] rounded-xl border-2 border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:border-teal"
          >
            {[now.getFullYear() - 1, now.getFullYear()].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => window.print()}
            className="min-h-[40px] px-4 rounded-xl bg-teal text-white text-sm font-bold hover:bg-teal/90 transition-colors"
          >
            Generate Report
          </button>
        </div>
      </Section>
    </div>
  )
}
