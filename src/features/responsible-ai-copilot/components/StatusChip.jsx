const STATUS_STYLES = {
  passed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  review: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  blocked: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
}

const STATUS_LABELS = {
  passed: 'Passed',
  review: 'Review',
  blocked: 'Blocked',
}

export default function StatusChip({ status = 'review' }) {
  const normalized = STATUS_STYLES[status] ? status : 'review'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md border ${STATUS_STYLES[normalized]}`}>
      {STATUS_LABELS[normalized]}
    </span>
  )
}
