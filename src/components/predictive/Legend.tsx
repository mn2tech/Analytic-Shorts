/**
 * Legend - Status legend + prediction badge explanation
 */

import { getStatusColor } from '../../utils/predictiveStatusColors'
import PredictionBadge from './PredictionBadge'

export default function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-2 rounded-lg bg-slate-800/80 border border-white/10">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Legend</span>
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded border border-white/30 shrink-0"
          style={{ backgroundColor: getStatusColor('occupied') }}
        />
        <span className="text-sm text-slate-300">Occupied</span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded border border-white/30 shrink-0"
          style={{ backgroundColor: getStatusColor('available') }}
        />
        <span className="text-sm text-slate-300">Available</span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded border border-white/30 shrink-0"
          style={{ backgroundColor: getStatusColor('dirty') }}
        />
        <span className="text-sm text-slate-300">Dirty</span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded border border-white/30 shrink-0"
          style={{ backgroundColor: getStatusColor('closed') }}
        />
        <span className="text-sm text-slate-300">Closed</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded border border-white/30 shrink-0 bg-[#DC2626]" />
        <span className="text-sm text-slate-300">Critical / Alert</span>
      </div>
      <div className="flex items-center gap-2 pl-2 border-l border-white/20">
        <PredictionBadge predictedInMinutes={45} compact />
        <span className="text-sm text-slate-300">Predicted available</span>
      </div>
    </div>
  )
}
