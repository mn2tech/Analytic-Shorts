import { useEffect, useMemo, useState } from 'react'

export function calculateBoardingImpact({
  boardedPatients,
  averageBoardingDelayMinutes,
  costPerBoardedHour,
  revenueLossPerHour,
}) {
  const totalBoardingHours = (boardedPatients * averageBoardingDelayMinutes) / 60
  const operationalCostLoss = totalBoardingHours * costPerBoardedHour
  const revenueOpportunityLoss = totalBoardingHours * revenueLossPerHour
  const totalEstimatedImpact = operationalCostLoss + revenueOpportunityLoss
  const dailyBoardingImpact = totalEstimatedImpact
  const annualBoardingImpact = dailyBoardingImpact * 365

  return {
    totalBoardingHours,
    operationalCostLoss,
    revenueOpportunityLoss,
    totalEstimatedImpact,
    dailyBoardingImpact,
    annualBoardingImpact,
  }
}

export function getBoardingSeverity(delayMinutes) {
  if (delayMinutes > 120) return { label: 'Critical', tone: 'critical' }
  if (delayMinutes >= 60) return { label: 'High', tone: 'high' }
  return { label: 'Manageable', tone: 'manageable' }
}

function formatCurrency(v) {
  return v.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

function SliderRow({ label, min, max, value, onChange, step = 1 }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-orange-500"
      />
    </div>
  )
}

export default function LiveBoardingDelayPanel({
  boardedPatients: initialBoardedPatients = 8,
  averageBoardingDelayMinutes: initialAverageDelay = 95,
  costPerBoardedHour: initialCostPerHour = 200,
  revenueLossPerHour: initialRevenueLossPerHour = 450,
  readOnly = false,
}) {
  const [boardedPatients, setBoardedPatients] = useState(initialBoardedPatients)
  const [averageBoardingDelayMinutes, setAverageBoardingDelayMinutes] = useState(initialAverageDelay)
  const [costPerBoardedHour, setCostPerBoardedHour] = useState(initialCostPerHour)
  const [revenueLossPerHour, setRevenueLossPerHour] = useState(initialRevenueLossPerHour)
  const [liveImpactTarget, setLiveImpactTarget] = useState(0)
  const [liveImpactDisplay, setLiveImpactDisplay] = useState(0)

  // Keep panel aligned with external scenario data when props change.
  useEffect(() => { setBoardedPatients(initialBoardedPatients) }, [initialBoardedPatients])
  useEffect(() => { setAverageBoardingDelayMinutes(initialAverageDelay) }, [initialAverageDelay])
  useEffect(() => { setCostPerBoardedHour(initialCostPerHour) }, [initialCostPerHour])
  useEffect(() => { setRevenueLossPerHour(initialRevenueLossPerHour) }, [initialRevenueLossPerHour])

  const impact = useMemo(
    () =>
      calculateBoardingImpact({
        boardedPatients,
        averageBoardingDelayMinutes,
        costPerBoardedHour,
        revenueLossPerHour,
      }),
    [boardedPatients, averageBoardingDelayMinutes, costPerBoardedHour, revenueLossPerHour]
  )

  const severity = useMemo(
    () => getBoardingSeverity(averageBoardingDelayMinutes),
    [averageBoardingDelayMinutes]
  )

  // Reset live target whenever core assumptions change.
  useEffect(() => {
    setLiveImpactTarget(impact.totalEstimatedImpact)
  }, [impact.totalEstimatedImpact])

  // Increment target subtly every few seconds to simulate ongoing delay.
  useEffect(() => {
    const perMinuteImpact =
      boardedPatients > 0 ? (boardedPatients * (costPerBoardedHour + revenueLossPerHour)) / 60 : 0
    const simulatedMinutesPerTick = 0.25 // 15s of simulated boarding every 3s
    const tickIncrement = perMinuteImpact * simulatedMinutesPerTick
    const t = setInterval(() => {
      setLiveImpactTarget((curr) => curr + tickIncrement)
    }, 3000)
    return () => clearInterval(t)
  }, [boardedPatients, costPerBoardedHour, revenueLossPerHour])

  // Smoothly animate displayed counter toward target.
  useEffect(() => {
    let raf = null
    const step = () => {
      setLiveImpactDisplay((curr) => {
        const delta = liveImpactTarget - curr
        if (Math.abs(delta) < 1) return liveImpactTarget
        return curr + delta * 0.12
      })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [liveImpactTarget])

  const severityBadgeClass =
    severity.tone === 'critical'
      ? 'bg-red-500/25 text-red-300 border-red-400/40'
      : severity.tone === 'high'
        ? 'bg-orange-500/25 text-orange-300 border-orange-400/40'
        : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'

  const panelBorderClass =
    severity.tone === 'critical'
      ? 'border-red-500/40 bg-red-500/10'
      : severity.tone === 'high'
        ? 'border-orange-500/35 bg-orange-500/10'
        : 'border-emerald-500/30 bg-emerald-500/10'

  const trendValues = useMemo(() => {
    const base = impact.dailyBoardingImpact
    const slope = severity.tone === 'critical' ? 0.08 : severity.tone === 'high' ? 0.05 : 0.02
    return [0, 1, 2, 3, 4, 5].map((i) => base * (1 + slope * (i - 5)))
  }, [impact.dailyBoardingImpact, severity.tone])

  const trendPath = useMemo(() => {
    const min = Math.min(...trendValues)
    const max = Math.max(...trendValues)
    const width = 240
    const height = 46
    return trendValues
      .map((v, i) => {
        const x = (i / (trendValues.length - 1)) * width
        const y = max === min ? height / 2 : height - ((v - min) / (max - min)) * height
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }, [trendValues])

  return (
    <div className={`rounded-xl border px-4 py-4 space-y-4 ${panelBorderClass} ${severity.tone === 'critical' ? 'shadow-[0_0_20px_rgba(239,68,68,0.18)]' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">
          Live Boarding Delay Impact
        </h3>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${severityBadgeClass}`}>
          Boarding Status: {severity.label}
        </span>
      </div>

      <div className="rounded-lg border border-white/10 bg-slate-900/55 px-3 py-3">
        <div className="text-[11px] text-slate-400">🚨 Current Boarding Delay Cost</div>
        <div className="text-2xl font-bold text-red-300 mt-1">
          {formatCurrency(Math.max(0, liveImpactDisplay))}
        </div>
        <div className="text-xs text-slate-400 mt-1">+ increasing while patients wait</div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-slate-400">🏥 Boarded Patients</span><span className="font-semibold">{boardedPatients}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">⏳ Avg Delay</span><span className="font-semibold">{averageBoardingDelayMinutes} min</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Total Boarding Hours</span><span className="font-semibold">{impact.totalBoardingHours.toFixed(1)} hrs</span></div>
        <div className="flex justify-between"><span className="text-slate-400">💰 Operational Cost Loss</span><span className="font-semibold">{formatCurrency(impact.operationalCostLoss)}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Revenue Opportunity Loss</span><span className="font-semibold">{formatCurrency(impact.revenueOpportunityLoss)}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Estimated Daily Impact</span><span className="font-semibold text-orange-300">{formatCurrency(impact.dailyBoardingImpact)}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Estimated Annual Impact</span><span className="font-semibold text-amber-300">{formatCurrency(impact.annualBoardingImpact)}</span></div>
      </div>

      <div className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2">
        <div className="text-[11px] text-slate-400 mb-1">6h impact trend</div>
        <svg viewBox="0 0 240 46" className="w-full h-12">
          <path d={trendPath} fill="none" stroke={severity.tone === 'critical' ? '#f87171' : severity.tone === 'high' ? '#fb923c' : '#34d399'} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      {!readOnly && (
        <div className="space-y-3 pt-1 border-t border-white/10">
          <SliderRow label="Boarded Patients" min={0} max={20} value={boardedPatients} onChange={setBoardedPatients} />
          <SliderRow
            label="Average Boarding Delay Minutes"
            min={15}
            max={240}
            value={averageBoardingDelayMinutes}
            onChange={setAverageBoardingDelayMinutes}
          />
          <SliderRow label="Cost Per Boarded Hour" min={100} max={400} value={costPerBoardedHour} onChange={setCostPerBoardedHour} />
          <SliderRow label="Revenue Loss Per Hour" min={200} max={800} value={revenueLossPerHour} onChange={setRevenueLossPerHour} />
        </div>
      )}

      <p className="text-[11px] leading-snug text-slate-500 pt-1 border-t border-white/10">
        Demo estimate based on simulated boarding conditions. Actual impact depends on census, staffing, and patient throughput.
      </p>
    </div>
  )
}

