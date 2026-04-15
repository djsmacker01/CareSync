export default function ShiftBadge({ shift }) {
  const styles = {
    AM:    'bg-amber-100 text-amber-800',
    PM:    'bg-blue-100 text-blue-800',
    NIGHT: 'bg-purple-100 text-purple-800',
  }
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${styles[shift] || 'bg-gray-100 text-gray-600'}`}>
      {shift} Shift
    </span>
  )
}
