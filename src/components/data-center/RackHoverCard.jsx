import { DATA_CENTER_STATUS_COLORS } from '../../utils/dataCenterDemoGenerator'

export default function RackHoverCard({ rack, x, y }) {
  if (!rack) return null
  const color = DATA_CENTER_STATUS_COLORS[rack.status] || '#94a3b8'
  return (
    <div
      className="fixed z-50 min-w-[260px] rounded-lg border border-white/20 bg-slate-900/95 text-white shadow-2xl pointer-events-none"
      style={{ left: x + 14, top: y - 10 }}
    >
      <div className="px-3 py-2 border-b border-white/10 bg-slate-800/80 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{rack.label}</span>
        <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: `${color}33`, color }}>
          {rack.status}
        </span>
      </div>
      <div className="p-3 text-xs space-y-1.5">
        <div className="flex justify-between"><span className="text-slate-400">Temperature</span><span>{rack.temperature}F</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Power</span><span>{rack.powerLoadKw}kW</span></div>
        <div className="flex justify-between"><span className="text-slate-400">CPU Load</span><span>{rack.cpuLoadPct}%</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Utilization</span><span>{rack.utilizationPct}%</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Airflow</span><span>{rack.airflowStatus}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Maintenance</span><span>{rack.maintenanceState}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Zone</span><span>{rack.zone}</span></div>
      </div>
    </div>
  )
}
