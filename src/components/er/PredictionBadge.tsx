/**
 * PredictionBadge - Avail ~45m or Clean ~20m badges for ER Command Map
 */
type Props = {
  minutes: number
  variant: 'avail' | 'clean'
  compact?: boolean
}

function formatMinutes(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60)
    return h === 1 ? '1h' : `${h}h`
  }
  return `${min}m`
}

export default function PredictionBadge({ minutes, variant, compact }: Props) {
  const prefix = variant === 'avail' ? 'Avail' : 'Clean'
  const text = compact ? `~${formatMinutes(minutes)}` : `${prefix} ~${formatMinutes(minutes)}`
  const title =
    variant === 'avail'
      ? `Predicted available in ~${minutes} minutes`
      : `Predicted clean in ~${minutes} minutes`

  const bgClass = variant === 'avail' ? 'bg-emerald-500/90 border-emerald-400/50' : 'bg-amber-500/90 border-amber-400/50'

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-white border ${bgClass}`}
      title={title}
    >
      {text}
    </span>
  )
}
