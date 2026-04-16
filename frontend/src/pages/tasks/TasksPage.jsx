import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTasks } from '../../hooks/useTasks'
import { useRealtime } from '../../hooks/useRealtime'
import LiveBadge from '../../components/LiveBadge'
import TaskItem from '../../components/tasks/TaskItem'
import AddTaskModal from '../../components/tasks/AddTaskModal'
import HandoverModal from '../../components/tasks/HandoverModal'
import { Sun, Moon, CheckCircle2, PartyPopper, Clock, X } from 'lucide-react'

const TASK_SUBS = [
  { table: 'task_completions', event: '*' },
  { table: 'handover_notes',   event: '*' },
]

function getCurrentShift() {
  const h = new Date().getHours()
  return (h >= 8 && h < 22) ? (h < 14 ? 'AM' : 'PM') : 'AM'
}

// Is it currently the overlap window (14:00–16:00)?
function isHandoverTime() {
  const h = new Date().getHours()
  return h >= 14 && h < 16
}

export default function TasksPage() {
  const { user } = useAuth()
  const {
    data, loading, error,
    fetchTasks, completeTask, uncompleteTask, createTask, deactivateTask,
    fetchHandoverData, saveHandover, fetchLatestHandover,
  } = useTasks()

  const [shift, setShift]           = useState(getCurrentShift)
  const [showAdd, setShowAdd]       = useState(false)
  const [showHandover, setHandover] = useState(false)
  const [handoverNote, setHNote]    = useState(null)   // incoming note from previous shift
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast]           = useState(null)

  const canManage = ['manager', 'supervisor'].includes(user?.role)
  const readonly  = user?.role === 'readonly'

  const load = useCallback(() => fetchTasks(shift), [fetchTasks, shift])

  useEffect(() => { load() }, [load])

  // Live updates from other devices
  const liveStatus = useRealtime(TASK_SUBS, load)

  // Fetch previous shift's handover note on mount / shift change
  useEffect(() => {
    fetchLatestHandover(shift).then(note => setHNote(note || null))
  }, [shift, fetchLatestHandover])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  async function handleComplete(task) {
    setSubmitting(true)
    try {
      await completeTask({ taskId: task.id, shift, userId: user.id })
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUncomplete(task) {
    setSubmitting(true)
    try {
      await uncompleteTask({ taskId: task.id, shift, userId: user.id })
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate(task) {
    if (!confirm(`Remove "${task.title}" from the checklist?`)) return
    try {
      await deactivateTask(task.id)
      showToast(`"${task.title}" removed`)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function handleAddTask({ title, description, shift: taskShift, is_recurring }) {
    setSubmitting(true)
    try {
      await createTask({ title, description, shift: taskShift, is_recurring, userId: user.id })
      setShowAdd(false)
      showToast('Task added')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveHandover(params) {
    try {
      await saveHandover(params)
      showToast('Handover note saved')
    } catch (err) {
      showToast(err.message || 'Failed to save handover note', 'error')
      throw err // re-throw so HandoverModal can show its own error state
    }
  }

  const tasks    = data?.tasks || []
  const total    = data?.total || 0
  const completed = data?.completed || 0
  const pct      = total > 0 ? Math.round((completed / total) * 100) : 0

  const pendingCount = total - completed

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-y-2 gap-x-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">Task Board</h1>
            <LiveBadge status={liveStatus} />
          </div>
          <p className="text-sm text-gray-400">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {canManage && (
            <button onClick={() => setShowAdd(true)}
              className="min-h-[44px] px-4 rounded-xl bg-teal text-white text-sm font-bold hover:bg-teal/90 transition-colors">
              + Add
            </button>
          )}
        </div>
      </div>

      {/* Incoming handover note banner */}
      {handoverNote && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                Handover from {handoverNote.shift === 'AM' ? 'Morning' : handoverNote.shift === 'PM' ? 'Afternoon' : handoverNote.shift} shift · {handoverNote.users?.full_name || 'Staff'}
              </div>
              <pre className="text-sm text-blue-800 whitespace-pre-wrap font-sans leading-relaxed">
                {handoverNote.content}
              </pre>
            </div>
            <button onClick={() => setHNote(null)}
              className="text-blue-300 hover:text-blue-500 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-blue-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {handoverNote.flags?.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {handoverNote.flags.includes('incomplete_tasks') && <span className="badge-pending">Incomplete tasks</span>}
              {handoverNote.flags.includes('med_refused')      && <span className="badge-refused">Medication refusals</span>}
              {handoverNote.flags.includes('low_stock')        && <span className="badge-pending">Low stock</span>}
            </div>
          )}
        </div>
      )}

      {/* Shift selector */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {['AM', 'PM'].map(s => (
          <button key={s} onClick={() => setShift(s)}
            className={`flex-1 min-h-[44px] rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              shift === s ? 'bg-white text-navy shadow' : 'text-gray-400 hover:text-gray-600'
            }`}>
            {s === 'AM' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {s === 'AM' ? 'Morning (08:00–16:00)' : 'Afternoon (14:00–22:00)'}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      {data && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-700">{shift === 'AM' ? 'Morning' : 'Afternoon'} shift progress</span>
            <span className="text-sm font-bold text-teal">{completed}/{total} tasks</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>{pct}% complete</span>
            {pendingCount > 0 && <span className="text-pending font-medium">{pendingCount} remaining</span>}
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

      {/* Error */}
      {error && (
        <div className="bg-refused/10 border border-refused/20 text-refused text-sm rounded-xl px-4 py-3">
          {error} <button onClick={load} className="ml-2 underline font-semibold">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      )}

      {/* Task list */}
      {!loading && tasks.length > 0 && (
        <div className="space-y-2">
          {/* Pending tasks first */}
          {tasks.filter(t => !t.completed).map(task => (
            <TaskItem key={task.id} task={task} shift={shift}
              onComplete={handleComplete} onUncomplete={handleUncomplete} onDeactivate={handleDeactivate}
              canManage={canManage} submitting={submitting} />
          ))}

          {/* Divider if mixed */}
          {tasks.some(t => t.completed) && tasks.some(t => !t.completed) && (
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">Completed</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          )}

          {/* Completed tasks */}
          {tasks.filter(t => t.completed).map(task => (
            <TaskItem key={task.id} task={task} shift={shift}
              onComplete={handleComplete} onUncomplete={handleUncomplete} onDeactivate={handleDeactivate}
              canManage={canManage} submitting={submitting} />
          ))}
        </div>
      )}

      {!loading && tasks.length === 0 && !error && (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No tasks for this shift</p>
          {canManage && <p className="text-sm mt-1">Tap "+ Add" to create tasks</p>}
        </div>
      )}

      {/* All done + handover prompt */}
      {!loading && total > 0 && completed === total && (
        <div className="bg-given/10 border-2 border-given/30 rounded-2xl p-4 text-center space-y-3">
          <PartyPopper className="w-8 h-8 text-given mx-auto" />
          <div className="font-bold text-given">All {shift === 'AM' ? 'Morning' : 'Afternoon'} tasks complete!</div>
          {!readonly && (
            <button onClick={() => setHandover(true)}
              className="w-full min-h-[52px] rounded-xl bg-navy text-white font-bold text-sm hover:bg-navy/90 transition-colors">
              Write Handover Note →
            </button>
          )}
        </div>
      )}

      {/* Handover prompt during overlap window */}
      {!loading && isHandoverTime() && shift === 'AM' && completed < total && !readonly && (
        <div className="bg-pending/10 border-2 border-pending/30 rounded-2xl p-4">
          <div className="font-bold text-pending text-sm mb-1 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Overlap window — handover time</div>
          <div className="text-xs text-pending/80 mb-3">{pendingCount} task{pendingCount > 1 ? 's' : ''} still pending</div>
          <button onClick={() => setHandover(true)}
            className="w-full min-h-[48px] rounded-xl bg-pending text-white font-bold text-sm hover:bg-pending/90 transition-colors">
            Write Handover Note
          </button>
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddTaskModal onConfirm={handleAddTask} onCancel={() => setShowAdd(false)} loading={submitting} />
      )}

      {showHandover && (
        <HandoverModal
          shift={shift}
          fetchHandoverData={fetchHandoverData}
          onSave={handleSaveHandover}
          onClose={() => setHandover(false)}
          userId={user.id}
          loading={submitting}
        />
      )}
    </div>
  )
}
