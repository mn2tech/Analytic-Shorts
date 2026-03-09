/**
 * RoomDetailsPanel - Right-side details panel for ER Command Map
 */
import type { RoomState } from '../../types/er'
import type { RoomDef } from '../../types/er'
import { getStatusColor, getStatusText } from '../../utils/roomStyles'
import PredictionBadge from './PredictionBadge'

type Props = {
  def: RoomDef | null
  state: RoomState | null
  onClose: () => void
  isEmpty?: boolean
}

export default function RoomDetailsPanel({ def, state, onClose, isEmpty }: Props) {
  if (isEmpty || !def || !state) {
    return (
      <div
        className="rounded-xl border border-slate-700/50 bg-slate-900/60 flex flex-col items-center justify-center min-h-[320px] p-8 text-center"
        role="region"
        aria-label="Room details"
      >
        <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-500 mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <p className="text-slate-400 font-medium">Select a room</p>
        <p className="text-slate-500 text-sm mt-1">Click a room on the map to view details</p>
      </div>
    )
  }

  const fillColor = getStatusColor(state.status)

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/80 flex flex-col overflow-hidden" role="region" aria-label={`Room details: ${def.label}`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-600/50">
        <h2 className="text-lg font-bold text-white">{def.label}</h2>
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
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="w-6 h-6 rounded border border-white/30 shrink-0"
            style={{ backgroundColor: fillColor }}
          />
          <span className="font-semibold text-slate-200">{getStatusText(state.status)}</span>
          {state.critical && (
            <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-1 rounded">
              CRITICAL
            </span>
          )}
          {state.predictedAvailableMinutes != null && (
            <PredictionBadge minutes={state.predictedAvailableMinutes} variant="avail" />
          )}
          {state.predictedCleanMinutes != null && (
            <PredictionBadge minutes={state.predictedCleanMinutes} variant="clean" />
          )}
        </div>

        {state.patientName && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Patient
            </h3>
            <p className="text-slate-200 font-medium">{state.patientName}</p>
            {state.age != null && (
              <p className="text-sm text-slate-400 mt-0.5">Age: {state.age}</p>
            )}
          </div>
        )}

        {state.reasonForVisit && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Reason for Visit
            </h3>
            <p className="text-slate-300">{state.reasonForVisit}</p>
          </div>
        )}

        {state.team && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Team
            </h3>
            <p className="text-slate-300">{state.team}</p>
          </div>
        )}

        {state.status === 'dirty' && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              EVS
            </h3>
            <p className="text-slate-300">{state.evsAssigned ? 'Assigned' : 'Pending'}</p>
          </div>
        )}

        {state.comments && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Comments
            </h3>
            <p className="text-slate-300 text-sm">{state.comments}</p>
          </div>
        )}

        {state.lastUpdated && (
          <div className="pt-4 border-t border-slate-600/50">
            <p className="text-xs text-slate-500">
              Last updated: {new Date(state.lastUpdated).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
