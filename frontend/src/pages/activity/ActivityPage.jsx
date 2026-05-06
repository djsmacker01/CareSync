import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useActivityLogs } from '../../hooks/useActivityLogs'
import { supabase } from '../../lib/supabase'
import {
  Plus, X, Calendar, RefreshCw, ChevronDown, ChevronUp,
  Globe, Utensils, Droplets, Heart, Activity,
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────────

const MOOD_OPTIONS = [
  { value: 'happy',     label: 'Happy',     emoji: '😊', colour: 'bg-given/10 text-given border-given/30' },
  { value: 'calm',      label: 'Calm',      emoji: '😌', colour: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'anxious',   label: 'Anxious',   emoji: '😟', colour: 'bg-pending/10 text-pending border-pending/30' },
  { value: 'low',       label: 'Low',       emoji: '😔', colour: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { value: 'distressed',label: 'Distressed',emoji: '😢', colour: 'bg-refused/10 text-refused border-refused/30' },
  { value: 'unwell',    label: 'Unwell',    emoji: '🤒', colour: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'other',     label: 'Other',     emoji: '🤔', colour: 'bg-gray-100 text-gray-600 border-gray-200' },
]

const ACTIVITY_TAGS = [
  'Personal care', 'Cooking', 'Shopping', 'Cleaning',
  'Exercise', 'Social activities', 'Community trip', 'Family contact',
  'Appointment', 'Education / Skills', 'Employment support',
  'Finance support', 'Emotional support', 'Leisure / Hobbies',
  'Medication support', 'Garden / Outdoors',
]

const INTAKE_OPTIONS = {
  food:  [
    { value: 'good',    label: 'Good',    colour: 'text-given' },
    { value: 'fair',    label: 'Fair',    colour: 'text-pending' },
    { value: 'poor',    label: 'Poor',    colour: 'text-refused' },
    { value: 'refused', label: 'Refused', colour: 'text-refused' },
  ],
  fluid: [
    { value: 'good',  label: 'Good',  colour: 'text-given' },
    { value: 'fair',  label: 'Fair',  colour: 'text-pending' },
    { value: 'poor',  label: 'Poor',  colour: 'text-refused' },
  ],
}

function getMoodStyle(value) {
  return MOOD_OPTIONS.find(m => m.value === value) || MOOD_OPTIONS.at(-1)
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Log Entry Form ─────────────────────────────────────────────────────────

function LogForm({ clients, currentShift, onSave, onClose, loading }) {
  const [form, setForm] = useState({
    client_id:              '',
    shift:                  currentShift,
    mood:                   '',
    mood_notes:             '',
    activities:             [],
    narrative:              '',
    food_intake:            '',
    fluid_intake:           '',
    physical_observations:  '',
    community_participation: false,
  })
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function toggleActivity(tag) {
    setForm(f => ({
      ...f,
      activities: f.activities.includes(tag)
        ? f.activities.filter(a => a !== tag)
        : [...f.activities, tag],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.client_id)  { setError('Please select a resident'); return }
    if (!form.mood)       { setError('Please select a mood'); return }
    if (!form.narrative.trim()) { setError('A narrative summary is required'); return }
    setError(null)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-5 space-y-5 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900">Log Activity</h2>
          <button type="button" onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-refused/10 border border-refused/20 px-4 py-2 text-sm text-refused font-medium">{error}</div>
        )}

        {/* Resident */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Resident *</label>
          <select value={form.client_id} onChange={e => set('client_id', e.target.value)}
            className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-teal">
            <option value="">— Select resident —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.full_name} · Flat {String(c.room_number || '').replace(/\D/g, '')}
              </option>
            ))}
          </select>
        </div>

        {/* Shift */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Shift *</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'AM',    l: '☀️ Morning' },
              { v: 'PM',    l: '🌙 Afternoon' },
              { v: 'NIGHT', l: '🌑 Night' },
            ].map(s => (
              <button key={s.v} type="button" onClick={() => set('shift', s.v)}
                className={`min-h-[44px] rounded-xl border-2 text-sm font-bold transition-all ${
                  form.shift === s.v
                    ? 'border-teal bg-teal/10 text-teal'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}>
                {s.l}
              </button>
            ))}
          </div>
        </div>

        {/* Mood */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">How was their mood? *</label>
          <div className="grid grid-cols-4 gap-2">
            {MOOD_OPTIONS.map(m => (
              <button key={m.value} type="button" onClick={() => set('mood', m.value)}
                className={`min-h-[56px] rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 text-xs font-bold transition-all ${
                  form.mood === m.value ? m.colour : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}>
                <span className="text-xl">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
          {form.mood && (
            <input
              value={form.mood_notes}
              onChange={e => set('mood_notes', e.target.value)}
              placeholder="Optional mood notes…"
              className="mt-2 w-full min-h-[40px] rounded-xl border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-teal"
            />
          )}
        </div>

        {/* Activities */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Activities undertaken</label>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleActivity(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                  form.activities.includes(tag)
                    ? 'border-teal bg-teal/10 text-teal'
                    : 'border-gray-200 text-gray-500 hover:border-teal/40'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Community participation toggle */}
        <div>
          <button
            type="button"
            onClick={() => set('community_participation', !form.community_participation)}
            className={`flex items-center gap-2 min-h-[44px] px-4 rounded-xl border-2 text-sm font-bold transition-all ${
              form.community_participation
                ? 'border-given bg-given/10 text-given'
                : 'border-gray-200 text-gray-400 hover:border-gray-300'
            }`}
          >
            <Globe className="w-4 h-4" />
            {form.community_participation ? '✓ Went out into the community' : 'Community participation?'}
          </button>
        </div>

        {/* Food & fluid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
              <Utensils className="w-3.5 h-3.5" /> Food intake
            </label>
            <div className="space-y-1.5">
              {INTAKE_OPTIONS.food.map(o => (
                <button key={o.value} type="button" onClick={() => set('food_intake', o.value)}
                  className={`w-full min-h-[36px] rounded-lg border-2 text-xs font-bold transition-all ${
                    form.food_intake === o.value
                      ? `border-current bg-gray-50 ${o.colour}`
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5" /> Fluid intake
            </label>
            <div className="space-y-1.5">
              {INTAKE_OPTIONS.fluid.map(o => (
                <button key={o.value} type="button" onClick={() => set('fluid_intake', o.value)}
                  className={`w-full min-h-[36px] rounded-lg border-2 text-xs font-bold transition-all ${
                    form.fluid_intake === o.value
                      ? `border-current bg-gray-50 ${o.colour}`
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Narrative */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Narrative summary *
          </label>
          <textarea
            value={form.narrative}
            onChange={e => set('narrative', e.target.value)}
            rows={4}
            placeholder="Describe how the visit / shift went. What did the person do? How did they appear? Anything notable?"
            className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-teal resize-none leading-relaxed"
          />
        </div>

        {/* Physical observations */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Physical observations</label>
          <input
            value={form.physical_observations}
            onChange={e => set('physical_observations', e.target.value)}
            placeholder="e.g. Skin in good condition, slight limp on left side, seemed tired…"
            className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-teal"
          />
        </div>

        <button type="submit" disabled={loading}
          className="w-full min-h-[52px] rounded-xl bg-teal text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? 'Saving…' : 'Save Log Entry'}
        </button>
      </form>
    </div>
  )
}

// ── Log Card ───────────────────────────────────────────────────────────────

function LogCard({ log, showClient = true }) {
  const [expanded, setExpanded] = useState(false)
  const mood = getMoodStyle(log.mood)

  const SHIFT_LABELS = { AM: 'Morning', PM: 'Afternoon', NIGHT: 'Night' }

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Mood badge */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border-2 ${mood.colour}`}>
            {mood.emoji}
          </div>
          <div className="flex-1 min-w-0">
            {showClient && (
              <div className="font-bold text-gray-900 text-sm">{log.client?.full_name}</div>
            )}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
              <span className="font-semibold text-gray-600">{mood.label}</span>
              <span>·</span>
              <span>{SHIFT_LABELS[log.shift] || log.shift} shift</span>
              <span>·</span>
              <span>{formatTime(log.created_at)}</span>
              {log.staff?.full_name && <span>· {log.staff.full_name}</span>}
            </div>
            {/* Activity tags */}
            {log.activities?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {log.activities.map(a => (
                  <span key={a} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/20">
                    {a}
                  </span>
                ))}
                {log.community_participation && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-given/10 text-given border border-given/20 flex items-center gap-0.5">
                    <Globe className="w-2.5 h-2.5" /> Community
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Preview of narrative */}
      {!expanded && (
        <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-2">{log.narrative}</p>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Narrative</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{log.narrative}</p>
          </div>
          {log.mood_notes && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Mood notes</p>
              <p className="text-sm text-gray-600">{log.mood_notes}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {log.food_intake && (
              <div className="flex items-center gap-1.5 text-xs">
                <Utensils className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-500">Food:</span>
                <span className={`font-bold capitalize ${
                  log.food_intake === 'good' ? 'text-given' :
                  log.food_intake === 'refused' || log.food_intake === 'poor' ? 'text-refused' : 'text-pending'
                }`}>{log.food_intake}</span>
              </div>
            )}
            {log.fluid_intake && (
              <div className="flex items-center gap-1.5 text-xs">
                <Droplets className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-500">Fluids:</span>
                <span className={`font-bold capitalize ${
                  log.fluid_intake === 'good' ? 'text-given' : log.fluid_intake === 'poor' ? 'text-refused' : 'text-pending'
                }`}>{log.fluid_intake}</span>
              </div>
            )}
          </div>
          {log.physical_observations && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Physical observations</p>
              <p className="text-sm text-gray-600">{log.physical_observations}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const { session } = useAuth()
  const token = session?.access_token
  const { logs, loading, error, refresh, addLog, fetchHistory } = useActivityLogs(token)

  const [clients, setClients]             = useState([])
  const [showForm, setShowForm]           = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast]                 = useState(null)
  const [tab, setTab]                     = useState('today')
  const [historyDate, setHistoryDate]     = useState(new Date().toISOString().slice(0, 10))
  const [history, setHistory]             = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [shiftFilter, setShiftFilter]     = useState('')

  // Determine current shift for defaulting the form
  const currentHour = new Date().getHours()
  const currentShift = currentHour >= 22 || currentHour < 8 ? 'NIGHT' : currentHour < 14 ? 'AM' : 'PM'

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, full_name, room_number')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => setClients(data || []))
  }, [])

  useEffect(() => {
    refresh(shiftFilter || undefined)
  }, [shiftFilter])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave(payload) {
    setActionLoading(true)
    try {
      await addLog(payload)
      showToast('Activity log saved')
    } catch (err) {
      showToast(err.message, 'error')
      throw err
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

  // Compute mood summary for today
  const moodCounts = logs.reduce((acc, l) => {
    acc[l.mood] = (acc[l.mood] || 0) + 1
    return acc
  }, {})

  const SHIFT_LABELS = { '': 'All shifts', AM: '☀️ Morning', PM: '🌙 Afternoon', NIGHT: '🌑 Night' }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Activity Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Person-centred daily records</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refresh(shiftFilter || undefined)}
            className="min-h-[44px] min-w-[44px] rounded-xl border-2 border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowForm(true)}
            className="min-h-[44px] px-4 rounded-xl bg-teal text-white font-bold text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Log
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          toast.type === 'error'
            ? 'bg-refused/10 text-refused border border-refused/20'
            : 'bg-given/10 text-given border border-given/20'
        }`}>{toast.msg}</div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1">
        {[
          { id: 'today',   label: `Today (${logs.length})` },
          { id: 'history', label: 'History' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 min-h-[40px] rounded-lg text-sm font-bold transition-all ${
              tab === t.id ? 'bg-white text-navy shadow' : 'text-gray-400 hover:text-gray-600'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Today tab ── */}
      {tab === 'today' && (
        <>
          {/* Shift filter + mood summary */}
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(SHIFT_LABELS).map(([v, l]) => (
              <button key={v} onClick={() => setShiftFilter(v)}
                className={`min-h-[36px] px-3 rounded-xl text-xs font-bold border-2 transition-all ${
                  shiftFilter === v
                    ? 'border-teal bg-teal/10 text-teal'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}>
                {l}
              </button>
            ))}
          </div>

          {/* Mood summary bar */}
          {logs.length > 0 && (
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" /> Today's mood overview
              </p>
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTIONS.filter(m => moodCounts[m.value]).map(m => (
                  <span key={m.value}
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${m.colour}`}>
                    {m.emoji} {m.label} <span className="opacity-70">×{moodCounts[m.value]}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading logs…</div>
          ) : error ? (
            <div className="rounded-xl bg-refused/10 border border-refused/20 px-4 py-3 text-sm text-refused">{error}</div>
          ) : logs.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 flex flex-col items-center gap-3 text-gray-400">
              <Activity className="w-10 h-10" />
              <div className="font-semibold">No activity logs today</div>
              <div className="text-sm">Tap "+ Add Log" to record a resident's activity</div>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map(log => <LogCard key={log.id} log={log} showClient />)}
            </div>
          )}
        </>
      )}

      {/* ── History tab ── */}
      {tab === 'history' && (
        <>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 pl-9 pr-3 text-sm focus:outline-none focus:border-teal" />
          </div>
          {historyLoading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No logs on {formatDate(historyDate)}</div>
          ) : (
            <div className="space-y-3">
              {history.map(log => <LogCard key={log.id} log={log} showClient />)}
            </div>
          )}
        </>
      )}

      {/* Form modal */}
      {showForm && (
        <LogForm
          clients={clients}
          currentShift={currentShift}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
