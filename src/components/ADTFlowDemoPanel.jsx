import { useEffect, useMemo, useRef, useState } from 'react'

const ADMISSION_TARGETS = ['WR01', 'WR02', 'WR03']
const TRANSFER_ROUTES = [
  { from: 'WR01', to: 'ER-12' },
  { from: 'WR02', to: 'ER-09' },
  { from: 'WR03', to: 'ER-15' },
  { from: 'ER-12', to: 'GW-04' },
  { from: 'ER-09', to: 'ICU-02' },
  { from: 'ER-15', to: 'OR-01' },
]
const DISCHARGE_ORIGINS = ['ER-12', 'ER-09', 'ER-15', 'GW-04', 'ICU-02']

function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function eventTypeFromRoll(roll) {
  if (roll < 0.4) return 'ADMISSION'
  if (roll < 0.8) return 'TRANSFER'
  return 'DISCHARGE'
}

function labelForEvent(event) {
  if (event.type === 'ADMISSION') return `${event.patientId} admitted to ${event.to}`
  if (event.type === 'TRANSFER') return `${event.patientId} moved ${event.from} -> ${event.to}`
  return `${event.patientId} discharged from ${event.from}`
}

function makeEvent(type, patientId, pools = {}) {
  const waitingRooms = Array.isArray(pools.waiting) && pools.waiting.length > 0 ? pools.waiting : ADMISSION_TARGETS
  const erRooms = Array.isArray(pools.er) && pools.er.length > 0 ? pools.er : ['ER-12', 'ER-09', 'ER-15']
  const inpatientRooms = Array.isArray(pools.inpatient) && pools.inpatient.length > 0 ? pools.inpatient : ['GW-04', 'ICU-02', 'OR-01']

  if (type === 'ADMISSION') {
    const to = randomPick(waitingRooms)
    return { type, patientId, from: 'Arrival', to, at: Date.now() }
  }
  if (type === 'TRANSFER') {
    const routes = [
      ...waitingRooms.map((from) => ({ from, to: randomPick(erRooms) })),
      ...erRooms.map((from) => ({ from, to: randomPick(inpatientRooms) })),
    ]
    const route = randomPick(routes.length > 0 ? routes : TRANSFER_ROUTES)
    return { type, patientId, from: route.from, to: route.to, at: Date.now() }
  }
  const dischargeOrigins = [...erRooms, ...inpatientRooms]
  const from = randomPick(dischargeOrigins.length > 0 ? dischargeOrigins : DISCHARGE_ORIGINS)
  return { type, patientId, from, to: 'Discharged', at: Date.now() }
}

export default function ADTFlowDemoPanel({ roomPools, onEvent }) {
  const [running, setRunning] = useState(true)
  const [events, setEvents] = useState([])
  const [counts, setCounts] = useState({ admissions: 0, transfers: 0, discharges: 0 })
  const nextPatientNumberRef = useRef(1001)
  const knownPatientsRef = useRef([])

  useEffect(() => {
    if (!running) return undefined
    const interval = setInterval(() => {
      const type = eventTypeFromRoll(Math.random())
      let patientId = null

      if (type === 'ADMISSION' || knownPatientsRef.current.length === 0) {
        patientId = `ED-${nextPatientNumberRef.current}`
        nextPatientNumberRef.current += 1
        knownPatientsRef.current = [patientId, ...knownPatientsRef.current].slice(0, 100)
      } else {
        patientId = randomPick(knownPatientsRef.current)
      }

      const nextEvent = makeEvent(type, patientId, roomPools)
      if (type === 'DISCHARGE') {
        knownPatientsRef.current = knownPatientsRef.current.filter((id) => id !== patientId)
      }

      setEvents((prev) => ([{
        id: `${nextEvent.type}-${nextEvent.patientId}-${nextEvent.at}`,
        ...nextEvent,
      }, ...prev]).slice(0, 8))

      setCounts((prev) => ({
        admissions: prev.admissions + (type === 'ADMISSION' ? 1 : 0),
        transfers: prev.transfers + (type === 'TRANSFER' ? 1 : 0),
        discharges: prev.discharges + (type === 'DISCHARGE' ? 1 : 0),
      }))

      onEvent?.(nextEvent)
    }, 10_000)

    return () => clearInterval(interval)
  }, [running, roomPools, onEvent])

  const totalEvents = counts.admissions + counts.transfers + counts.discharges
  const statusLabel = running ? 'Live' : 'Paused'
  const statusClass = running ? 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10' : 'text-amber-300 border-amber-400/40 bg-amber-500/10'

  const rows = useMemo(() => events.map((e) => ({
    ...e,
    timeLabel: new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    text: labelForEvent(e),
  })), [events])

  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/60 px-4 py-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">ADT Demo Feed</h3>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${statusClass}`}>
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={() => setRunning((v) => !v)}
            className="text-[11px] px-2 py-1 rounded border border-white/15 bg-slate-700/70 hover:bg-slate-600/80 text-slate-200"
          >
            {running ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-2">
          <div className="text-[11px] text-slate-300">Admissions</div>
          <div className="text-lg font-bold text-emerald-300">{counts.admissions}</div>
        </div>
        <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-2 py-2">
          <div className="text-[11px] text-slate-300">Transfers</div>
          <div className="text-lg font-bold text-blue-300">{counts.transfers}</div>
        </div>
        <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2 py-2">
          <div className="text-[11px] text-slate-300">Discharges</div>
          <div className="text-lg font-bold text-cyan-300">{counts.discharges}</div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mb-2">Total events: <span className="text-slate-200 font-semibold">{totalEvents}</span> (1 event every 10 seconds)</p>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">Waiting for first ADT event…</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((e) => (
            <div key={e.id} className="text-xs text-slate-300">
              <span className="text-slate-500">{e.timeLabel}</span>{' '}
              <span className="font-semibold text-cyan-300">{e.patientId}</span>{' '}
              {e.text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

