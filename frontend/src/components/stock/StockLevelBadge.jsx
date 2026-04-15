/**
 * Colour-coded stock level indicator.
 * Red   — at or below reorder_threshold
 * Amber — within 7 units above threshold (approaching)
 * Green — safe
 */
export function stockStatus(qty, threshold) {
  if (qty <= threshold)      return 'critical'
  if (qty <= threshold + 7)  return 'low'
  return 'ok'
}

const STYLES = {
  critical: 'bg-refused/10 text-refused border-refused/30',
  low:      'bg-pending/10 text-pending border-pending/30',
  ok:       'bg-given/10  text-given  border-given/30',
}

const ICONS = { critical: '🔴', low: '🟡', ok: '🟢' }

export default function StockLevelBadge({ qty, threshold, unit, showIcon = true }) {
  const status = stockStatus(qty, threshold)
  return (
    <span className={`stock-badge inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${STYLES[status]}`}>
      {showIcon && <span>{ICONS[status]}</span>}
      {qty} {unit}
    </span>
  )
}
