import { AlertTriangle, Clock } from 'lucide-react'
import { CHECK_META } from '../../hooks/useFire'

const STATUS_STYLES = {
  pass:           { pill: 'bg-green-100 text-green-800',  label: 'Pass'           },
  fail:           { pill: 'bg-red-100 text-red-800',      label: 'Fail'           },
  action_required:{ pill: 'bg-amber-100 text-amber-800',  label: 'Action Required'},
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  return diff
}

export default function CheckCard({ checkData, onLogCheck, readonly }) {
  const { check_type, latest, overdue } = checkData
  const meta    = CHECK_META[check_type]
  const { Icon } = meta
  const styleSt = latest ? STATUS_STYLES[latest.status] : null
  const days    = daysUntil(latest?.next_due_date)
  const checkedByName = latest?.users?.full_name || 'Staff'

  return (
    <div className={`bg-white rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all ${
      overdue ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
    }`}>
      {/* Top row: icon + title + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm leading-tight">{meta.label}</div>
            <div className="text-xs text-gray-400">Every {meta.intervalDays} day{meta.intervalDays > 1 ? 's' : ''}</div>
          </div>
        </div>
        {overdue && (
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700 shrink-0 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Overdue
          </span>
        )}
        {!overdue && styleSt && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${styleSt.pill}`}>
            {styleSt.label}
          </span>
        )}
        {!latest && (
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500 shrink-0">
            Not checked
          </span>
        )}
      </div>

      {/* Last check info */}
      {latest ? (
        <div className="text-xs text-gray-500 space-y-0.5">
          <div>Last checked <span className="font-semibold text-gray-700">{formatDate(latest.check_date)}</span> by {checkedByName}</div>
          {latest.notes && (
            <div className="text-gray-400 italic truncate">"{latest.notes}"</div>
          )}
        </div>
      ) : (
        <div className="text-xs text-gray-400 italic">No checks recorded yet</div>
      )}

      {/* Next due */}
      {latest?.next_due_date && (
        <div className={`text-xs font-semibold flex items-center gap-1 ${
          overdue ? 'text-red-600' : days !== null && days <= 2 ? 'text-amber-600' : 'text-gray-500'
        }`}>
          {overdue ? (
            <><AlertTriangle className="w-3 h-3" /> Was due {formatDate(latest.next_due_date)}</>
          ) : days === 0 ? (
            <><Clock className="w-3 h-3" /> Due today</>
          ) : days === 1 ? (
            <><Clock className="w-3 h-3" /> Due tomorrow</>
          ) : (
            `Next due ${formatDate(latest.next_due_date)}`
          )}
        </div>
      )}

      {/* Action button */}
      {!readonly && (
        <button
          onClick={() => onLogCheck(check_type)}
          className={`w-full min-h-[44px] rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
            overdue
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-teal text-white hover:bg-teal/90'
          }`}
        >
          {overdue && <AlertTriangle className="w-4 h-4" />}
          {overdue ? 'Log Check Now' : 'Log Check'}
        </button>
      )}
    </div>
  )
}
