import { useMemo } from 'react'

function formatDurationFromMinutes(totalMinutes) {
  const mins = Math.max(0, Math.floor(totalMinutes || 0))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

export default function BoardingTimer({ boardingStartTime, nowTs = Date.now() }) {
  const label = useMemo(() => {
    if (!boardingStartTime) return '—'
    const start = new Date(boardingStartTime).getTime()
    if (!Number.isFinite(start)) return '—'
    const elapsedMins = (nowTs - start) / 60000
    return formatDurationFromMinutes(elapsedMins)
  }, [boardingStartTime, nowTs])

  return <>{label}</>
}

