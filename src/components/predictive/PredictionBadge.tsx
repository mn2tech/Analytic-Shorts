/**
 * PredictionBadge - Small badge showing "Avail ~45m" or "Avail ~1h"
 * Rendered inside room or as overlay on the blueprint map
 */

type Props = {
  predictedInMinutes: number
  compact?: boolean
}

function formatMinutes(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60)
    return h === 1 ? '1h' : `${h}h`
  }
  return `${min}m`
}

export default function PredictionBadge({ predictedInMinutes, compact }: Props) {
  const text = compact ? `~${formatMinutes(predictedInMinutes)}` : `Avail ~${formatMinutes(predictedInMinutes)}`
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/90 text-white border border-emerald-400/50"
      title={`Predicted available in ~${predictedInMinutes} minutes`}
    >
      {text}
    </span>
  )
}
