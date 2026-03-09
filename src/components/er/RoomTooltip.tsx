/**
 * RoomTooltip - Premium tooltip on room hover for ER Command Map
 */
import type { RoomState } from '../../types/er'
import type { RoomDef } from '../../types/er'
import { getStatusText } from '../../utils/roomStyles'
import PredictionBadge from './PredictionBadge'

type Props = {
  def: RoomDef
  state: RoomState
  x: number
  y: number
}

export default function RoomTooltip({ def, state, x, y }: Props) {
  return (
    <div
      className="fixed z-50 pointer-events-none min-w-[240px] max-w-[300px] rounded-lg shadow-2xl overflow-hidden
        border border-slate-600/50 bg-slate-900/95 backdrop-blur-sm text-white"
      style={{ left: x + 16, top: y - 8 }}
    >
      <div className="px-4 py-2.5 bg-slate-800/90 border-b border-slate-600/50 flex items-center justify-between gap-2">
        <span className="font-bold text-sm">{def.label}</span>
        {state.critical && (
          <span className="text-xs font-semibold text-red-400 bg-red-500/20 px-2 py-0.5 rounded">
            CRITICAL
          </span>
        )}
      </div>
      <div className="p-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Status</span>
          <span className="font-semibold">{getStatusText(state.status)}</span>
        </div>
        {def.id === 'waiting_area' && state.waitingCount != null && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Patients waiting</span>
            <span className="font-semibold text-amber-400">{state.waitingCount}</span>
          </div>
        )}
        {state.predictedAvailableMinutes != null && (
          <div className="flex items-center gap-2">
            <PredictionBadge minutes={state.predictedAvailableMinutes} variant="avail" />
          </div>
        )}
        {state.predictedCleanMinutes != null && (
          <div className="flex items-center gap-2">
            <PredictionBadge minutes={state.predictedCleanMinutes} variant="clean" />
          </div>
        )}
        {state.patientName && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Patient</span>
            <span className="font-medium text-right">{state.patientName}</span>
          </div>
        )}
        {state.age != null && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Age</span>
            <span className="font-medium">{state.age}</span>
          </div>
        )}
        {state.reasonForVisit && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Reason</span>
            <span className="font-medium text-right text-slate-300">{state.reasonForVisit}</span>
          </div>
        )}
        {state.team && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Team</span>
            <span className="font-medium">{state.team}</span>
          </div>
        )}
        {state.evsAssigned != null && state.status === 'dirty' && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">EVS</span>
            <span className="font-medium">{state.evsAssigned ? 'Assigned' : 'Pending'}</span>
          </div>
        )}
        {state.comments && (
          <div className="pt-2 border-t border-slate-600/50">
            <span className="text-slate-400 text-xs">Comments</span>
            <p className="text-slate-300 text-xs mt-0.5">{state.comments}</p>
          </div>
        )}
      </div>
    </div>
  )
}
