const STYLES = {
  given:        'bg-given/10 text-given border-given/30',
  refused:      'bg-refused/10 text-refused border-refused/30',
  missed:       'bg-gray-100 text-gray-500 border-gray-200',
  not_required: 'bg-gray-100 text-gray-400 border-gray-200',
  pending:      'bg-pending/10 text-pending border-pending/30',
}

const LABELS = {
  given:        '✓ Given',
  refused:      '✗ Refused',
  missed:       '— Missed',
  not_required: '○ N/A',
  pending:      '● Pending',
}

export default function StatusPill({ status }) {
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STYLES[status] || STYLES.pending}`}>
      {LABELS[status] || 'Pending'}
    </span>
  )
}
