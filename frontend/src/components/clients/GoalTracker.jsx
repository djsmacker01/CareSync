import { useState } from 'react'
import { useGoals } from '../../hooks/useGoals'
import {
  Plus, X, ChevronDown, ChevronUp, Trophy,
  Target, TrendingUp, Pause, XCircle, CheckCircle2,
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'life_skills',  label: 'Life Skills',       emoji: '🏠' },
  { value: 'employment',   label: 'Employment',         emoji: '💼' },
  { value: 'social',       label: 'Social',             emoji: '🤝' },
  { value: 'health',       label: 'Health',             emoji: '❤️' },
  { value: 'education',    label: 'Education',          emoji: '📚' },
  { value: 'housing',      label: 'Housing',            emoji: '🏡' },
  { value: 'finance',      label: 'Finance',            emoji: '💰' },
  { value: 'wellbeing',    label: 'Wellbeing',          emoji: '🌱' },
  { value: 'other',        label: 'Other',              emoji: '⭐' },
]

const PROGRESS_LEVELS = [
  { level: 1, label: 'Just started',    emoji: '🌱', colour: 'bg-gray-200',      text: 'text-gray-500' },
  { level: 2, label: 'Some progress',   emoji: '📈', colour: 'bg-pending',       text: 'text-pending' },
  { level: 3, label: 'Good progress',   emoji: '⭐', colour: 'bg-blue-400',      text: 'text-blue-600' },
  { level: 4, label: 'Nearly there',    emoji: '🚀', colour: 'bg-teal',          text: 'text-teal' },
  { level: 5, label: 'Achieved!',       emoji: '🎉', colour: 'bg-given',         text: 'text-given' },
]

const PRIORITY_STYLES = {
  high:   'bg-refused/10 text-refused border-refused/30',
  medium: 'bg-pending/10 text-pending border-pending/30',
  low:    'bg-gray-100 text-gray-500 border-gray-200',
}

function getCategoryInfo(value) {
  return CATEGORIES.find(c => c.value === value) || { label: value, emoji: '⭐' }
}

function getLatestProgress(goal) {
  if (!goal.goal_updates?.length) return null
  return goal.goal_updates[0]
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function isOverdue(target) {
  if (!target) return false
  return new Date(target) < new Date()
}

// ── Progress Bar ───────────────────────────────────────────────────────────

function ProgressBar({ level }) {
  const pct = level ? (level / 5) * 100 : 0
  const info = PROGRESS_LEVELS[Math.min(level, 5) - 1]
  return (
    <div className="space-y-1">
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${info?.colour || 'bg-gray-200'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {info && (
        <div className="flex items-center gap-1 text-xs">
          <span>{info.emoji}</span>
          <span className={`font-bold ${info.text}`}>{info.label}</span>
        </div>
      )}
    </div>
  )
}

// ── Add Goal Modal ─────────────────────────────────────────────────────────

function AddGoalModal({ onSave, onClose, loading }) {
  const [form, setForm] = useState({
    title: '', description: '', category: '', priority: 'medium', target_date: '',
  })
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Goal title is required'); return }
    if (!form.category)     { setError('Please select a category'); return }
    setError(null)
    try {
      await onSave({ ...form, target_date: form.target_date || null })
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-teal" /> New Goal
          </h2>
          <button type="button" onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-refused/10 border border-refused/20 px-4 py-2 text-sm text-refused font-medium">{error}</div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Goal title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="e.g. Cook a meal independently twice a week"
            className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-teal" />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            rows={3} placeholder="More detail about this goal and why it matters…"
            className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-teal resize-none" />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Category *</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(c => (
              <button key={c.value} type="button" onClick={() => set('category', c.value)}
                className={`min-h-[48px] rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 text-xs font-bold transition-all ${
                  form.category === c.value
                    ? 'border-teal bg-teal/10 text-teal'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}>
                <span className="text-lg">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Priority</label>
            <div className="space-y-1.5">
              {['high', 'medium', 'low'].map(p => (
                <button key={p} type="button" onClick={() => set('priority', p)}
                  className={`w-full min-h-[36px] rounded-xl border-2 text-xs font-bold capitalize transition-all ${
                    form.priority === p ? PRIORITY_STYLES[p] : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Target date</label>
            <input type="date" value={form.target_date} onChange={e => set('target_date', e.target.value)}
              className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-teal" />
            <p className="text-xs text-gray-400 mt-1">Leave blank if open-ended</p>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full min-h-[52px] rounded-xl bg-teal text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? 'Saving…' : 'Add Goal'}
        </button>
      </form>
    </div>
  )
}

// ── Log Progress Modal ─────────────────────────────────────────────────────

function LogProgressModal({ goal, onSave, onClose, loading }) {
  const latest = getLatestProgress(goal)
  const [level, setLevel] = useState(latest?.progress_level || 1)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!notes.trim()) { setError('Please add a progress note'); return }
    setError(null)
    try {
      await onSave(goal.id, level, notes)
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal" /> Log Progress
          </h2>
          <button type="button" onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5">
          <div className="font-bold text-gray-900 text-sm">{goal.title}</div>
        </div>

        {error && (
          <div className="rounded-xl bg-refused/10 border border-refused/20 px-4 py-2 text-sm text-refused font-medium">{error}</div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">How is progress going?</label>
          <div className="space-y-2">
            {PROGRESS_LEVELS.map(p => (
              <button key={p.level} type="button" onClick={() => setLevel(p.level)}
                className={`w-full min-h-[52px] rounded-xl border-2 flex items-center gap-3 px-4 font-bold text-sm transition-all ${
                  level === p.level
                    ? `border-current ${p.text} bg-gray-50`
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}>
                <span className="text-2xl">{p.emoji}</span>
                <div className="text-left">
                  <div>{p.label}</div>
                  <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden mt-1">
                    <div className={`h-full rounded-full ${p.colour}`}
                      style={{ width: `${(p.level / 5) * 100}%` }} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Progress notes *</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="What happened? What did they try? What went well or was challenging?"
            className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-teal resize-none" />
        </div>

        {level === 5 && (
          <div className="rounded-xl bg-given/10 border border-given/30 px-4 py-3 text-sm text-given font-bold flex items-center gap-2">
            <Trophy className="w-4 h-4" /> This will mark the goal as Achieved!
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full min-h-[52px] rounded-xl bg-teal text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? 'Saving…' : 'Save Progress'}
        </button>
      </form>
    </div>
  )
}

// ── Goal Card ──────────────────────────────────────────────────────────────

function GoalCard({ goal, canManage, onLogProgress, onStatusChange }) {
  const [expanded, setExpanded] = useState(false)
  const latest    = getLatestProgress(goal)
  const cat       = getCategoryInfo(goal.category)
  const overdue   = goal.status === 'active' && isOverdue(goal.target_date)
  const isAchieved = goal.status === 'achieved'
  const isPaused   = goal.status === 'paused'

  return (
    <div className={`rounded-2xl border-2 p-4 transition-all ${
      isAchieved  ? 'border-given/40 bg-given/5'   :
      overdue     ? 'border-refused/30 bg-refused/5' :
      isPaused    ? 'border-gray-200 bg-gray-50 opacity-75' :
                    'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
            isAchieved ? 'bg-given/20' : 'bg-gray-100'
          }`}>
            {isAchieved ? '🏆' : cat.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {cat.label}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border capitalize ${PRIORITY_STYLES[goal.priority]}`}>
                {goal.priority}
              </span>
              {isAchieved && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-given/10 text-given border border-given/30">
                  ✓ Achieved
                </span>
              )}
              {isPaused && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">
                  Paused
                </span>
              )}
              {overdue && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-refused/10 text-refused border border-refused/20">
                  Overdue
                </span>
              )}
            </div>
            <div className="font-bold text-gray-900 text-sm leading-tight">{goal.title}</div>
            {goal.target_date && (
              <div className={`text-xs mt-0.5 ${overdue ? 'text-refused font-semibold' : 'text-gray-400'}`}>
                Target: {formatDate(goal.target_date)}
              </div>
            )}
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Progress bar */}
      {!isAchieved && (
        <div className="mt-3">
          <ProgressBar level={latest?.progress_level || 0} />
        </div>
      )}
      {isAchieved && goal.achieved_at && (
        <div className="mt-2 text-xs text-given font-semibold flex items-center gap-1">
          <Trophy className="w-3.5 h-3.5" /> Achieved on {formatDate(goal.achieved_at)}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          {goal.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{goal.description}</p>
          )}

          {/* Progress history */}
          {goal.goal_updates?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Progress history</p>
              <div className="space-y-2">
                {goal.goal_updates.map(u => {
                  const p = PROGRESS_LEVELS[u.progress_level - 1]
                  return (
                    <div key={u.id} className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{p?.emoji}</span>
                        <span className={`text-xs font-bold ${p?.text}`}>{p?.label}</span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {formatDateTime(u.created_at)}
                          {u.staff?.full_name && ` · ${u.staff.full_name}`}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{u.notes}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {goal.goal_updates?.length === 0 && (
            <p className="text-sm text-gray-400 italic">No progress updates yet.</p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {goal.status === 'active' && (
              <button onClick={() => onLogProgress(goal)}
                className="flex-1 min-h-[44px] rounded-xl bg-teal text-white font-bold text-sm flex items-center justify-center gap-2">
                <TrendingUp className="w-4 h-4" /> Log Progress
              </button>
            )}
            {canManage && goal.status === 'active' && (
              <>
                <button onClick={() => onStatusChange(goal.id, 'achieved')}
                  className="min-h-[44px] px-3 rounded-xl border-2 border-given text-given font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Achieved
                </button>
                <button onClick={() => onStatusChange(goal.id, 'paused')}
                  className="min-h-[44px] px-3 rounded-xl border-2 border-gray-200 text-gray-500 font-bold text-xs flex items-center gap-1">
                  <Pause className="w-3.5 h-3.5" /> Pause
                </button>
              </>
            )}
            {canManage && goal.status === 'paused' && (
              <button onClick={() => onStatusChange(goal.id, 'active')}
                className="min-h-[44px] px-4 rounded-xl border-2 border-teal text-teal font-bold text-sm">
                Reactivate
              </button>
            )}
            {canManage && ['paused', 'active'].includes(goal.status) && (
              <button onClick={() => onStatusChange(goal.id, 'discontinued')}
                className="min-h-[44px] px-3 rounded-xl border-2 border-refused/30 text-refused font-bold text-xs flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Discontinue
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function GoalTracker({ clientId, token, canManage }) {
  const { goals, loading, error, addGoal, logProgress, updateStatus } = useGoals(clientId, token)

  const [showAdd, setShowAdd]         = useState(false)
  const [progressTarget, setProgressTarget] = useState(null)
  const [actionLoading, setActionLoading]   = useState(false)
  const [toast, setToast]             = useState(null)
  const [showArchived, setShowArchived]     = useState(false)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAddGoal(payload) {
    setActionLoading(true)
    try {
      await addGoal(payload)
      setShowAdd(false)
      showToast('Goal added')
    } catch (err) {
      showToast(err.message, 'error')
      throw err
    } finally {
      setActionLoading(false)
    }
  }

  async function handleLogProgress(goalId, level, notes) {
    setActionLoading(true)
    try {
      await logProgress(goalId, level, notes)
      setProgressTarget(null)
      showToast(level === 5 ? '🏆 Goal achieved! Well done!' : 'Progress recorded')
    } catch (err) {
      showToast(err.message, 'error')
      throw err
    } finally {
      setActionLoading(false)
    }
  }

  async function handleStatusChange(goalId, status) {
    try {
      await updateStatus(goalId, status)
      showToast(status === 'achieved' ? '🏆 Goal marked as achieved' : `Goal ${status}`)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const active   = goals.filter(g => g.status === 'active')
  const achieved = goals.filter(g => g.status === 'achieved')
  const archived = goals.filter(g => ['paused', 'discontinued'].includes(g.status))

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-refused/10 border border-refused/20 px-4 py-3 text-sm text-refused">
        Failed to load goals: {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          toast.type === 'error'
            ? 'bg-refused/10 text-refused border border-refused/20'
            : 'bg-given/10 text-given border border-given/20'
        }`}>{toast.msg}</div>
      )}

      {/* Summary stats */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active',   count: active.length,   colour: 'text-teal' },
            { label: 'Achieved', count: achieved.length,  colour: 'text-given' },
            { label: 'Total',    count: goals.length,    colour: 'text-gray-700' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl bg-white border-2 border-gray-200 p-3 text-center">
              <div className={`text-2xl font-black ${s.colour}`}>{s.count}</div>
              <div className="text-xs text-gray-500 font-semibold">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add goal button */}
      {canManage && (
        <button onClick={() => setShowAdd(true)}
          className="w-full min-h-[48px] rounded-xl border-2 border-dashed border-teal/40 text-teal font-bold text-sm flex items-center justify-center gap-2 hover:bg-teal/5 transition-colors">
          <Plus className="w-4 h-4" /> Add Goal
        </button>
      )}

      {/* Active goals */}
      {active.length === 0 && achieved.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-14 flex flex-col items-center gap-3 text-gray-400">
          <Target className="w-10 h-10 opacity-40" />
          <div className="font-semibold">No goals set yet</div>
          {canManage && <div className="text-sm">Add a goal to start tracking independence progress</div>}
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Active goals ({active.length})
              </h3>
              {active.map(g => (
                <GoalCard key={g.id} goal={g} canManage={canManage}
                  onLogProgress={setProgressTarget}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </section>
          )}

          {achieved.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-given uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" /> Achieved ({achieved.length})
              </h3>
              {achieved.map(g => (
                <GoalCard key={g.id} goal={g} canManage={canManage}
                  onLogProgress={setProgressTarget}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </section>
          )}

          {archived.length > 0 && (
            <section>
              <button onClick={() => setShowArchived(v => !v)}
                className="text-xs font-bold text-gray-400 flex items-center gap-1 hover:text-gray-600 mb-2">
                {showArchived ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {archived.length} paused / discontinued
              </button>
              {showArchived && (
                <div className="space-y-3">
                  {archived.map(g => (
                    <GoalCard key={g.id} goal={g} canManage={canManage}
                      onLogProgress={setProgressTarget}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* Modals */}
      {showAdd && (
        <AddGoalModal onSave={handleAddGoal} onClose={() => setShowAdd(false)} loading={actionLoading} />
      )}
      {progressTarget && (
        <LogProgressModal
          goal={progressTarget}
          onSave={handleLogProgress}
          onClose={() => setProgressTarget(null)}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
