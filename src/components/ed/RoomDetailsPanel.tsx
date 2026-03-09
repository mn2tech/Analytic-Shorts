/**
 * Side panel shown when a room is clicked - detailed room information
 */
import type { RoomData } from '../../types/edRoom'
import { getStatusColor } from '../../utils/edStatusColors'

type Props = {
  room: RoomData
  onClose: () => void
}

export default function RoomDetailsPanel({ room, onClose }: Props) {
  const fillColor = getStatusColor(room.status)

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-900/98 border-l border-white/10 shadow-2xl z-40 flex flex-col animate-slide-in-right">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-white">{room.label}</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-700/80 text-slate-400 hover:text-white transition-colors"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded border border-white/30 shrink-0"
            style={{ backgroundColor: fillColor }}
          />
          <span className="font-semibold capitalize text-slate-200">{room.status}</span>
          {room.critical && (
            <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-1 rounded">
              CRITICAL
            </span>
          )}
          {room.isolation && (
            <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-2 py-1 rounded">
              ISOLATION
            </span>
          )}
        </div>

        {room.patientName && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Patient
            </h3>
            <p className="text-slate-200 font-medium">{room.patientName}</p>
            {room.age != null && (
              <p className="text-sm text-slate-400 mt-0.5">Age: {room.age}</p>
            )}
          </div>
        )}

        {room.reasonForVisit && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Reason for Visit
            </h3>
            <p className="text-slate-300">{room.reasonForVisit}</p>
          </div>
        )}

        {room.team && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Team
            </h3>
            <p className="text-slate-300">{room.team}</p>
          </div>
        )}

        {room.comments && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Comments
            </h3>
            <p className="text-slate-300 text-sm">{room.comments}</p>
          </div>
        )}

        {room.lastUpdated && (
          <div className="pt-4 border-t border-white/10">
            <p className="text-xs text-slate-500">
              Last updated: {new Date(room.lastUpdated).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
