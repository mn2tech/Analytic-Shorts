/**
 * Transfer Summary - ER→GW, GW→OR, OR→ICU, Discharges.
 */
import { getTransferCountsAtTime } from '../data/patientMovements'

export default function TransferSummary({ selectedTime }) {
  const time = selectedTime ?? '14:00'
  const counts = getTransferCountsAtTime(time)
  return (
    <div className="rounded-lg border border-white/10 bg-slate-800/60 px-4 py-3">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Transfers Today</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">WR → ER</span>
          <span className="text-lg font-bold text-amber-400">{counts.wrToEr ?? 0}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">ER → GW</span>
          <span className="text-lg font-bold text-white">{counts.erToGw}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">GW → OR</span>
          <span className="text-lg font-bold text-white">{counts.gwToOr}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">OR → ICU</span>
          <span className="text-lg font-bold text-white">{counts.orToIcu}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">Discharges</span>
          <span className="text-lg font-bold text-emerald-400">{counts.discharges}</span>
        </div>
      </div>
    </div>
  )
}
