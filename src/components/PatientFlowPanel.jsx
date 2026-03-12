/**
 * Patient Flow Panel - Shows patient journey when room/patient is selected.
 */
import { getPatientLocationAtTime, patientMovements } from '../data/patientMovements'

function parseTime(t) {
  if (!t) return 0
  const [h, m] = String(t).split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export default function PatientFlowPanel({ selectedRoomId, selectedTime }) {
  const time = selectedTime || '08:00'
  const patientInRoom = patientMovements.find((p) => {
    const loc = getPatientLocationAtTime(p, time)
    return loc?.room === selectedRoomId
  })
  const loc = patientInRoom ? getPatientLocationAtTime(patientInRoom, time) : null

  if (!selectedRoomId) {
    return (
      <div className="rounded-lg border border-white/10 bg-slate-800/60 px-4 py-4 text-sm text-slate-400">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Patient Flow</h3>
        <p>Click a room to view patient journey</p>
      </div>
    )
  }

  if (!loc) {
    return (
      <div className="rounded-lg border border-white/10 bg-slate-800/60 px-4 py-4 text-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Patient Flow</h3>
        <p className="text-slate-400">Room {selectedRoomId} — No patient at {time}</p>
      </div>
    )
  }

  const journey = patientInRoom.events
    .filter((e) => parseTime(e.time) <= parseTime(time))
    .map((e) => e.to)
    .filter(Boolean)
  const path = journey.join(' → ')
  const upcoming = patientInRoom.events.filter((e) => parseTime(e.time) > parseTime(time))

  return (
    <div className="rounded-lg border border-white/10 bg-slate-800/60 px-4 py-4 space-y-3">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Patient Flow</h3>
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-slate-400">Patient ID</span>
          <span className="ml-2 font-medium">{loc.patientId}</span>
        </div>
        <div>
          <span className="text-slate-400">Current Room</span>
          <span className="ml-2 font-medium">{loc.room}</span>
        </div>
        <div>
          <span className="text-slate-400">Previous</span>
          <span className="ml-2 font-medium">{loc.previous || '—'}</span>
        </div>
        <div>
          <span className="text-slate-400">Next Destination</span>
          <span className="ml-2 font-medium">{loc.next ? `${loc.next}${upcoming[0]?.action === 'post_op_transfer' ? ' (Reserved)' : ''}` : '—'}</span>
        </div>
      </div>
      {path && (
        <div className="pt-2 border-t border-white/10">
          <p className="text-xs text-slate-500 mb-1">Movement Timeline</p>
          <p className="text-teal-400 font-medium text-sm">{path}</p>
        </div>
      )}
      <div className="space-y-1 pt-2 border-t border-white/10">
        {patientInRoom.events
          .filter((e) => parseTime(e.time) <= parseTime(time))
          .map((e, i) => (
            <p key={i} className="text-xs text-slate-400">
              {e.time} {e.action === 'arrival' ? `arrived in Waiting Room` : e.action === 'roomed' ? `roomed into ${e.to}` : e.action === 'admitted' ? `admitted to ${e.to}` : e.action === 'transfer' ? `transferred to ${e.to}` : e.action === 'procedure' ? `moved to ${e.to}` : e.action === 'post_op_transfer' ? `reserved ${e.to}` : e.action === 'discharge' ? 'discharged' : e.action}
            </p>
          ))}
      </div>
    </div>
  )
}
