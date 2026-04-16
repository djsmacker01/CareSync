import { CheckCircle2, AlertTriangle, XCircle, Clock, Circle } from 'lucide-react'

export default function ClientCard({ client, onClick }) {
  const { full_name, room_number, total, given, refused, pending } = client

  const pct     = total > 0 ? Math.round((given / total) * 100) : 0
  const allDone = pending === 0

  // Card border/bg based on completion state
  const cardStyle =
    allDone && refused === 0 ? 'border-given/40 bg-given/5'   :
    allDone && refused > 0   ? 'border-pending/40 bg-pending/5' :
    refused > 0              ? 'border-refused/20'              :
                               'border-gray-200 bg-white'

  // Status icon
  let StatusIcon, statusColor
  if (allDone && refused === 0) {
    StatusIcon = CheckCircle2; statusColor = 'text-given'
  } else if (allDone && refused > 0) {
    StatusIcon = AlertTriangle; statusColor = 'text-pending'
  } else if (refused > 0) {
    StatusIcon = XCircle; statusColor = 'text-refused'
  } else if (given > 0) {
    StatusIcon = Clock; statusColor = 'text-pending'
  } else {
    StatusIcon = Circle; statusColor = 'text-gray-300'
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98] hover:shadow-md ${cardStyle}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-bold text-gray-900 text-base">{full_name}</div>
          <div className="text-xs text-gray-400 mt-0.5">Flat {String(room_number || '').replace(/\D/g, '')}</div>
        </div>
        <StatusIcon className={`w-7 h-7 ${statusColor}`} />
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>{given}/{total} medications</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              allDone && refused === 0 ? 'bg-given' :
              refused > 0             ? 'bg-pending' : 'bg-teal'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {refused > 0 && (
          <div className="text-xs text-refused font-medium">{refused} refused</div>
        )}
      </div>
    </button>
  )
}
