/**
 * Tooltip shown on room hover - displays room details
 */
import type { RoomData } from '../../types/edRoom'

type Props = {
  room: RoomData
  x: number
  y: number
}

export default function RoomTooltip({ room, x, y }: Props) {
  return (
    <div
      className="fixed z-50 pointer-events-none min-w-[240px] max-w-[300px] rounded-lg shadow-2xl overflow-hidden
        border border-white/20 bg-slate-900/95 backdrop-blur-sm text-white"
      style={{ left: x + 16, top: y - 8 }}
    >
      <div className="px-4 py-2.5 bg-slate-800/90 border-b border-white/10 flex items-center justify-between gap-2">
        <span className="font-bold text-sm">{room.label}</span>
        {room.critical && (
          <span className="text-xs font-semibold text-red-400 bg-red-500/20 px-2 py-0.5 rounded">
            CRITICAL
          </span>
        )}
      </div>
      <div className="p-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Status</span>
          <span className="font-semibold capitalize">{room.status}</span>
        </div>
        {room.id === 'waiting_room' && room.waitingCount != null && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Patients waiting</span>
            <span className="font-semibold text-amber-400">{room.waitingCount}</span>
          </div>
        )}
        {room.patientName && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Patient</span>
            <span className="font-medium text-right">{room.patientName}</span>
          </div>
        )}
        {room.age != null && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Age</span>
            <span className="font-medium">{room.age}</span>
          </div>
        )}
        {room.reasonForVisit && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Reason</span>
            <span className="font-medium text-right text-slate-300">{room.reasonForVisit}</span>
          </div>
        )}
        {room.team && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Team</span>
            <span className="font-medium">{room.team}</span>
          </div>
        )}
        {room.comments && (
          <div className="pt-2 border-t border-white/10">
            <span className="text-slate-400 text-xs">Comments</span>
            <p className="text-slate-300 text-xs mt-0.5">{room.comments}</p>
          </div>
        )}
        {room.isolation && (
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
            <span>⚠</span> Isolation
          </div>
        )}
      </div>
    </div>
  )
}
