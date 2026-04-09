export default function LivePatientFlowPanel({ summary }) {
  const safe = summary || {}
  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/60 px-4 py-4">
      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3">Live Patient Flow</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-slate-400">Waiting</span><div className="font-semibold text-amber-300">{safe.waiting ?? 0}</div></div>
        <div><span className="text-slate-400">ER</span><div className="font-semibold text-cyan-300">{safe.er ?? 0}</div></div>
        <div><span className="text-slate-400">Boarding</span><div className="font-semibold text-orange-300">{safe.boarding ?? 0}</div></div>
        <div><span className="text-slate-400">Transfers In Progress</span><div className="font-semibold text-blue-300">{safe.transfersInProgress ?? 0}</div></div>
        <div className="col-span-2 pt-1 border-t border-white/10">
          <span className="text-slate-400">Discharged Today</span>
          <div className="font-semibold text-emerald-300">{safe.dischargedToday ?? 0}</div>
        </div>
      </div>
    </div>
  )
}

