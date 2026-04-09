function metric(label, value, accent) {
  return { label, value, accent }
}

export default function DataCenterKpiBlock({ telemetry = [], alerts = [] }) {
  const activeRacks = telemetry.filter((r) => r.status !== 'offline').length
  const healthyRacks = telemetry.filter((r) => r.status === 'healthy').length
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length
  const avgTemp = telemetry.length
    ? (telemetry.reduce((sum, r) => sum + r.temperature, 0) / telemetry.length).toFixed(1)
    : '0.0'
  const totalPower = telemetry.reduce((sum, r) => sum + r.powerLoadKw, 0).toFixed(1)
  const utilizationRate = telemetry.length
    ? (telemetry.reduce((sum, r) => sum + r.utilizationPct, 0) / telemetry.length).toFixed(1)
    : '0.0'

  const metrics = [
    metric('Active Racks', activeRacks, 'text-cyan-300'),
    metric('Healthy Racks', healthyRacks, 'text-emerald-300'),
    metric('Critical Alerts', criticalAlerts, 'text-red-300'),
    metric('Average Temperature', `${avgTemp}F`, 'text-amber-300'),
    metric('Total Power Load', `${totalPower}kW`, 'text-violet-300'),
    metric('Utilization Rate', `${utilizationRate}%`, 'text-blue-300'),
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
      {metrics.map((item) => (
        <div key={item.label} className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">{item.label}</div>
          <div className={`text-lg font-semibold ${item.accent}`}>{item.value}</div>
        </div>
      ))}
    </div>
  )
}
