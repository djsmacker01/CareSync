import { Check, X, Minus, Circle, Clock, Hand, User, UserCheck } from 'lucide-react'

const STYLES = {
  given:            'bg-given/10 text-given border-given/30',
  prompted:         'bg-teal/10 text-teal border-teal/30',
  self_administered:'bg-blue-100 text-blue-700 border-blue-200',
  assisted:         'bg-indigo-100 text-indigo-700 border-indigo-200',
  refused:          'bg-refused/10 text-refused border-refused/30',
  missed:           'bg-gray-100 text-gray-500 border-gray-200',
  not_required:     'bg-gray-100 text-gray-400 border-gray-200',
  pending:          'bg-pending/10 text-pending border-pending/30',
}

const ICONS = {
  given:            Check,
  prompted:         Hand,
  self_administered:User,
  assisted:         UserCheck,
  refused:          X,
  missed:           Minus,
  not_required:     Circle,
  pending:          Clock,
}

const LABELS = {
  given:            'Given',
  prompted:         'Prompted',
  self_administered:'Self-Admin',
  assisted:         'Assisted',
  refused:          'Refused',
  missed:           'Missed',
  not_required:     'N/A',
  pending:          'Pending',
}

export const ADMINISTERED_STATUSES = ['given', 'prompted', 'self_administered', 'assisted']

export default function StatusPill({ status }) {
  const Icon = ICONS[status] || Clock
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${STYLES[status] || STYLES.pending}`}>
      <Icon className="w-3 h-3" />
      {LABELS[status] || 'Pending'}
    </span>
  )
}
