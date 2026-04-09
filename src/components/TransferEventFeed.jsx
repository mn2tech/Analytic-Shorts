export default function TransferEventFeed({ events = [] }) {
  const rows = Array.isArray(events) ? events.slice(0, 8) : []
  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/60 px-4 py-4">
      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3">Recent Transfer Events</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No recent transfer events</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((e) => (
            <div key={e.id} className="text-xs text-slate-300">
              <span className="text-slate-500">{e.timeLabel}</span>{' '}
              <span className="font-semibold text-cyan-300">{e.patientId}</span>{' '}
              {e.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

