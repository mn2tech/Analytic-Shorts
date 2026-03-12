/**
 * Ambulance / Inbound Arrival Indicator - Shows future demand entering the ER.
 */
import { useMemo } from 'react'
import { getInboundArrivalsAtTime } from '../data/hospitalDemoData'

const IMPACT_STYLES = {
  Low: 'text-emerald-400',
  Medium: 'text-amber-400',
  High: 'text-red-400 animate-pulse',
}

export default function InboundArrivalsWidget({ selectedTime, compact = false, scenarioInboundArrivals = null }) {
  const data = useMemo(() => {
    // Use scenario data if provided, otherwise use computed data
    if (scenarioInboundArrivals) {
      return {
        ambulanceCount: scenarioInboundArrivals.ambulanceCount ?? 0,
        estimatedPatients: scenarioInboundArrivals.estimatedPatients ?? 0,
        etaMin: scenarioInboundArrivals.etaMin ?? 0,
        etaMax: scenarioInboundArrivals.etaMax ?? 0,
        impact: scenarioInboundArrivals.impact ?? 'Low',
      }
    }
    return getInboundArrivalsAtTime(selectedTime)
  }, [selectedTime, scenarioInboundArrivals])

  const impactClass = IMPACT_STYLES[data.impact] ?? IMPACT_STYLES.Low

  return (
    <div className="rounded-lg border border-slate-600/50 bg-slate-800/60 px-4 py-3">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
        Ambulances Incoming
      </h3>
      <div className={`space-y-1.5 ${compact ? 'text-xs' : 'text-sm'}`}>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Count</span>
          <span className="font-bold text-white">{data.ambulanceCount}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">ETA</span>
          <span className="font-medium text-cyan-400">{data.etaMin}–{data.etaMax} min</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Expected Patients</span>
          <span className="font-medium text-white">{data.estimatedPatients}</span>
        </div>
        <div className="flex justify-between gap-4 items-center">
          <span className="text-slate-400">Impact</span>
          <span className={`font-semibold ${impactClass}`}>{data.impact}</span>
        </div>
      </div>
    </div>
  )
}
