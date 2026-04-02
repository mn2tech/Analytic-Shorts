import { useMemo, useState } from 'react'

function buildRecommendations({ roomOverlays, roomStatusMap, metrics }) {
  const rooms = roomOverlays
    .map((r) => ({ id: r.id, unit: r.unit || 'Unknown', status: roomStatusMap[r.id]?.status || 'available' }))
  const occupied = rooms.filter((r) => r.status === 'occupied')
  const dirty = rooms.filter((r) => r.status === 'dirty')
  const available = rooms.filter((r) => r.status === 'available')

  const byUnit = rooms.reduce((acc, r) => {
    if (!acc[r.unit]) acc[r.unit] = { total: 0, occupied: 0, dirty: 0, available: 0 }
    acc[r.unit].total += 1
    acc[r.unit][r.status] = (acc[r.unit][r.status] || 0) + 1
    return acc
  }, {})

  const highestDirtyUnit = Object.entries(byUnit)
    .sort((a, b) => (b[1].dirty || 0) - (a[1].dirty || 0))[0]
  const highestOccUnit = Object.entries(byUnit)
    .sort((a, b) => (b[1].occupied || 0) - (a[1].occupied || 0))[0]

  const recs = []

  if ((metrics?.dirty || dirty.length) >= 8) {
    recs.push({
      id: 'dirty-backlog',
      priority: 'High',
      title: 'Deploy housekeeping surge to clear dirty backlog',
      reason: `${dirty.length} dirty rooms are blocking same-day sellable inventory.`,
      action: highestDirtyUnit
        ? `Reassign 2 attendants to ${highestDirtyUnit[0]} for the next 60 minutes and fast-track room release checks.`
        : 'Reassign attendants to highest dirty wing for next 60 minutes.',
      impact: 'Estimated +3 to +6 rooms returned to sellable status today.',
    })
  }

  if ((metrics?.utilizationPct || 0) >= 75) {
    recs.push({
      id: 'rate-yield',
      priority: 'Medium',
      title: 'Protect occupancy while improving yield',
      reason: `Utilization is ${metrics?.utilizationPct || 0}% with stable occupancy demand.`,
      action: highestOccUnit
        ? `Apply a +$5 to +$12 fenced rate increase for ${highestOccUnit[0]} on same-day arrivals; keep direct-booking perks enabled.`
        : 'Apply small fenced rate increase on high pickup room blocks.',
      impact: 'Potential RevPAR lift without reducing occupancy.',
    })
  }

  if (available.length <= 10) {
    recs.push({
      id: 'late-checkout',
      priority: 'Medium',
      title: 'Control late-checkout approvals',
      reason: `Only ${available.length} rooms currently available; turnover risk is elevated.`,
      action: 'Allow complimentary late checkout only for loyalty tier guests; charge fee otherwise.',
      impact: 'Reduces check-in delays and protects evening availability.',
    })
  }

  recs.push({
    id: 'direct-channel',
    priority: 'Low',
    title: 'Shift mix toward direct bookings',
    reason: 'Maintain occupancy while reducing margin leakage from high-commission channels.',
    action: 'Enable direct-only bundle (parking/F&B credit) for tonight and pause broad OTA discounts.',
    impact: 'Improves net ADR and contribution margin per occupied room.',
  })

  return recs.slice(0, 4)
}

export default function BestWesternDecisionPanel({
  roomOverlays = [],
  roomStatusMap = {},
  metrics = {},
  selectedTime,
}) {
  const [decisionState, setDecisionState] = useState({})
  const recommendations = useMemo(
    () => buildRecommendations({ roomOverlays, roomStatusMap, metrics }),
    [roomOverlays, roomStatusMap, metrics]
  )

  const updateState = (id, state) => setDecisionState((prev) => ({ ...prev, [id]: state }))

  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/80 p-3">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">Decision Panel</h3>
        <p className="text-xs text-slate-400">Recommended actions at {selectedTime || 'Live'}</p>
      </div>
      <div className="space-y-3">
        {recommendations.map((rec) => {
          const state = decisionState[rec.id] || 'Proposed'
          return (
            <article key={rec.id} className="rounded-lg border border-white/10 bg-slate-800/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-white">{rec.title}</p>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300">{rec.priority}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">{rec.reason}</p>
              <p className="mt-2 text-[11px] text-slate-200">{rec.action}</p>
              <p className="mt-1 text-[11px] text-emerald-300">{rec.impact}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-cyan-300">Status: {state}</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => updateState(rec.id, 'Approved')} className="px-2 py-1 text-[10px] rounded bg-emerald-600/80 hover:bg-emerald-600 text-white">Approve</button>
                  <button type="button" onClick={() => updateState(rec.id, 'Rejected')} className="px-2 py-1 text-[10px] rounded bg-rose-600/80 hover:bg-rose-600 text-white">Reject</button>
                  <button type="button" onClick={() => updateState(rec.id, 'Done')} className="px-2 py-1 text-[10px] rounded bg-slate-700 hover:bg-slate-600 text-white">Done</button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
