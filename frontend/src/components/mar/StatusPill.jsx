import { Check, X, Minus, Circle, Clock } from 'lucide-react'

const STYLES = {
  given:        'bg-given/10 text-given border-given/30',
  refused:      'bg-refused/10 text-refused border-refused/30',
  missed:       'bg-gray-100 text-gray-500 border-gray-200',
  not_required: 'bg-gray-100 text-gray-400 border-gray-200',
  pending:      'bg-pending/10 text-pending border-pending/30',
}

const ICONS = {
  given:        Check,
  refused:      X,
  missed:       Minus,
  not_required: Circle,
  pending:      Clock,
}

const LABELS = {
  given:        'Given',
  refused:      'Refused',
  missed:       'Missed',
  not_required: 'N/A',
  pending:      'Pending',
}

export default function StatusPill({ status }) {
  const Icon = ICONS[status] || Clock
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${STYLES[status] || STYLES.pending}`}>
      <Icon className="w-3 h-3" />
      {LABELS[status] || 'Pending'}
    </span>
  )
}
