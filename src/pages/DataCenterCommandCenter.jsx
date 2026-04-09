import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DataCenterMapCanvas from '../components/data-center/DataCenterMapCanvas'
import RackHoverCard from '../components/data-center/RackHoverCard'
import DataCenterKpiBlock from '../components/data-center/DataCenterKpiBlock'
import { buildDataCenterDemoSite } from '../utils/dataCenterDemoGenerator'

const DEFAULT_CONFIG = {
  rows: 8,
  racksPerRow: 12,
  rackWidth: 52,
  rackHeight: 30,
  horizontalGap: 14,
  verticalGap: 24,
  margin: 48,
  includeCentralCorridor: true,
  seed: 'nm2tech-dc-demo-01',
}

export default function DataCenterCommandCenter() {
  const [seed, setSeed] = useState(DEFAULT_CONFIG.seed)
  const [selectedRackId, setSelectedRackId] = useState(null)
  const [hoveredRackId, setHoveredRackId] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const demo = useMemo(
    () =>
      buildDataCenterDemoSite(
        { ...DEFAULT_CONFIG, seed },
        { seed, siteName: 'NM2TECH Demo Data Center 01' }
      ),
    [seed]
  )

  const telemetryById = useMemo(() => new Map(demo.telemetry.map((item) => [item.id, item])), [demo.telemetry])
  const activeRackId = selectedRackId || hoveredRackId
  const activeRack = activeRackId ? telemetryById.get(activeRackId) : null

  const exportPayload = useMemo(
    () => ({
      siteType: 'data_center',
      siteName: demo.siteName,
      generatedAt: demo.generatedAt,
      layout: demo.layout,
      telemetry: demo.telemetry,
      alerts: demo.alerts,
      movements: demo.movements,
      zoneSummaries: demo.zoneSummaries,
    }),
    [demo]
  )

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `data-center-demo-${seed}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-[1700px] mx-auto px-4 py-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Data Center Demo Generator</h1>
            <p className="text-sm text-slate-400">Synthetic blueprint racks + deterministic telemetry/alerts for FloorMap-style overlays.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/hospital-bed-command-center" className="px-3 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-white/10">Hospital</Link>
            <Link to="/motel-command-center" className="px-3 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-white/10">Hotel</Link>
            <button type="button" onClick={handleExport} className="px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500">Export JSON</button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 flex items-center gap-2">
          <label htmlFor="dc-seed" className="text-xs text-slate-400">Seed</label>
          <input
            id="dc-seed"
            className="px-2 py-1 rounded bg-slate-800 border border-white/10 text-sm w-56"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
          />
          <button type="button" onClick={() => setSeed(`${DEFAULT_CONFIG.seed}-${Date.now()}`)} className="px-3 py-1.5 rounded text-xs bg-slate-700 hover:bg-slate-600">
            Randomize
          </button>
          <button type="button" onClick={() => setSeed(DEFAULT_CONFIG.seed)} className="px-3 py-1.5 rounded text-xs bg-slate-700 hover:bg-slate-600">
            Reset
          </button>
        </div>

        <DataCenterKpiBlock telemetry={demo.telemetry} alerts={demo.alerts} />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
          <div className="relative">
            <DataCenterMapCanvas
              layout={demo.layout}
              telemetry={demo.telemetry}
              movements={demo.movements}
              selectedRackId={selectedRackId}
              onRackHover={(rackId, event) => {
                setHoveredRackId(rackId)
                setTooltipPos({ x: event.clientX, y: event.clientY })
              }}
              onRackLeave={() => setHoveredRackId(null)}
              onRackClick={(rackId) => setSelectedRackId((prev) => (prev === rackId ? null : rackId))}
            />
            <RackHoverCard rack={activeRack} x={tooltipPos.x} y={tooltipPos.y} />
          </div>

          <aside className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
              <h2 className="text-sm font-semibold text-cyan-300 mb-2">Selected Rack</h2>
              {!activeRack ? (
                <p className="text-xs text-slate-400">Click a rack to pin details.</p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Rack</span><span>{activeRack.label}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Status</span><span>{activeRack.status}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Temp</span><span>{activeRack.temperature}F</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Power</span><span>{activeRack.powerLoadKw}kW</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">CPU</span><span>{activeRack.cpuLoadPct}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Utilization</span><span>{activeRack.utilizationPct}%</span></div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
              <h2 className="text-sm font-semibold text-amber-300 mb-2">Alerts</h2>
              <div className="space-y-2">
                {demo.alerts.map((alert) => (
                  <div key={alert.id} className="rounded border border-white/10 bg-slate-800/70 p-2">
                    <div className="text-xs font-semibold">{alert.title}</div>
                    <div className="text-[11px] text-slate-400">{alert.message}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
              <h2 className="text-sm font-semibold text-violet-300 mb-2">Workload Movements</h2>
              <div className="space-y-1.5 text-xs">
                {demo.movements.map((event) => {
                  const from = telemetryById.get(event.fromRackId)?.label || event.fromRackId
                  const to = telemetryById.get(event.toRackId)?.label || event.toRackId
                  return (
                    <div key={event.id} className="rounded border border-white/10 bg-slate-800/70 p-2">
                      <div className="font-semibold">{event.workloadName}</div>
                      <div className="text-slate-400">{from} to {to} ({event.reason})</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
