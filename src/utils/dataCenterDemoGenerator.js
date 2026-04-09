const DEFAULT_LAYOUT_CONFIG = {
  rows: 8,
  racksPerRow: 12,
  rackWidth: 52,
  rackHeight: 30,
  horizontalGap: 14,
  verticalGap: 24,
  margin: 48,
  includeCentralCorridor: true,
  centralCorridorWidth: 80,
  seed: 'nm2tech-data-center-01',
}

const RACK_STATUSES = ['healthy', 'high_load', 'overheating', 'maintenance', 'reserved', 'offline']

export const DATA_CENTER_STATUS_COLORS = {
  healthy: '#22c55e',
  high_load: '#facc15',
  overheating: '#ef4444',
  maintenance: '#3b82f6',
  reserved: '#a855f7',
  offline: '#64748b',
}

function hashSeed(input) {
  const str = String(input ?? 'seed')
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function createSeededRandom(seed) {
  let t = hashSeed(seed)
  return function rand() {
    t += 0x6d2b79f5
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function pickN(ids, count, rand, blocked = new Set()) {
  const available = ids.filter((id) => !blocked.has(id))
  const picked = []
  while (picked.length < Math.min(count, available.length)) {
    const idx = Math.floor(rand() * available.length)
    const [candidate] = available.splice(idx, 1)
    picked.push(candidate)
  }
  return picked
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function formatRackLabel(rowIndex, rackIndex) {
  const row = String.fromCharCode(65 + rowIndex)
  const pos = String(rackIndex + 1).padStart(2, '0')
  return `${row}${pos}`
}

function buildRackId(label) {
  return `rack_${label.toLowerCase()}`
}

export function createRackLayout(config = {}) {
  const cfg = { ...DEFAULT_LAYOUT_CONFIG, ...config }
  const {
    rows,
    racksPerRow,
    rackWidth,
    rackHeight,
    horizontalGap,
    verticalGap,
    margin,
    includeCentralCorridor,
    centralCorridorWidth,
  } = cfg
  const racks = []
  const half = Math.floor(rows / 2)

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const rowLabel = String.fromCharCode(65 + rowIndex)
    const corridorOffset = includeCentralCorridor && rowIndex >= half ? centralCorridorWidth : 0
    const y = margin + rowIndex * (rackHeight + verticalGap) + corridorOffset

    for (let rackIndex = 0; rackIndex < racksPerRow; rackIndex += 1) {
      const label = formatRackLabel(rowIndex, rackIndex)
      const x = margin + rackIndex * (rackWidth + horizontalGap)
      racks.push({
        id: buildRackId(label),
        label,
        row: rowLabel,
        position: rackIndex + 1,
        x,
        y,
        width: rackWidth,
        height: rackHeight,
        zone: rowIndex < half ? 'Hall 1' : 'Hall 2',
      })
    }
  }

  const width = margin * 2 + racksPerRow * rackWidth + (racksPerRow - 1) * horizontalGap
  const totalRowHeight = rows * rackHeight + (rows - 1) * verticalGap
  const height = margin * 2 + totalRowHeight + (includeCentralCorridor ? centralCorridorWidth : 0)

  return {
    siteType: 'data_center',
    dimensions: { width, height },
    config: cfg,
    racks,
  }
}

export function createRackTelemetry(layout, options = {}) {
  const seed = options.seed ?? layout?.config?.seed ?? DEFAULT_LAYOUT_CONFIG.seed
  const rand = createSeededRandom(seed)
  const racks = Array.isArray(layout?.racks) ? layout.racks : []
  const ids = racks.map((r) => r.id)

  const overheatingCount = clamp(options.overheatingCount ?? (rand() > 0.5 ? 2 : 1), 1, 2)
  const highLoadCount = clamp(options.highLoadCount ?? Math.round(racks.length * 0.08), 4, 10)
  const maintenanceCount = clamp(options.maintenanceCount ?? Math.round(racks.length * 0.05), 2, 6)
  const reservedCount = clamp(options.reservedCount ?? Math.round(racks.length * 0.04), 2, 5)
  const offlineCount = clamp(options.offlineCount ?? Math.round(racks.length * 0.03), 1, 4)

  const overheating = new Set(pickN(ids, overheatingCount, rand))
  const highLoad = new Set(pickN(ids, highLoadCount, rand, overheating))
  const maintenance = new Set(pickN(ids, maintenanceCount, rand, new Set([...overheating, ...highLoad])))
  const reserved = new Set(pickN(ids, reservedCount, rand, new Set([...overheating, ...highLoad, ...maintenance])))
  const offline = new Set(pickN(ids, offlineCount, rand, new Set([...overheating, ...highLoad, ...maintenance, ...reserved])))

  const neighborBoost = new Set()
  overheating.forEach((id) => {
    const rack = racks.find((r) => r.id === id)
    if (!rack) return
    const nearby = racks.filter((r) => r.row === rack.row && Math.abs(r.position - rack.position) <= 1 && r.id !== rack.id)
    nearby.forEach((n) => {
      if (rand() > 0.35) neighborBoost.add(n.id)
    })
  })

  return racks.map((rack) => {
    let status = 'healthy'
    if (overheating.has(rack.id)) status = 'overheating'
    else if (highLoad.has(rack.id)) status = 'high_load'
    else if (maintenance.has(rack.id)) status = 'maintenance'
    else if (reserved.has(rack.id)) status = 'reserved'
    else if (offline.has(rack.id)) status = 'offline'

    let temperature = 70 + rand() * 12
    let powerLoadKw = 2.2 + rand() * 4
    let cpuLoadPct = 18 + rand() * 42
    let utilizationPct = 20 + rand() * 52
    let airflowStatus = rand() > 0.92 ? 'degraded' : 'normal'
    let maintenanceState = 'none'
    let alertLevel = 'none'

    if (status === 'high_load') {
      temperature = 82 + rand() * 10
      powerLoadKw = 7 + rand() * 4
      cpuLoadPct = 72 + rand() * 24
      utilizationPct = 74 + rand() * 22
      alertLevel = rand() > 0.4 ? 'warning' : 'none'
    }

    if (status === 'overheating') {
      temperature = 96 + rand() * 9
      powerLoadKw = 8 + rand() * 4
      cpuLoadPct = 86 + rand() * 13
      utilizationPct = 82 + rand() * 18
      airflowStatus = rand() > 0.2 ? 'degraded' : 'critical'
      alertLevel = 'critical'
    }

    if (status === 'maintenance') {
      temperature = 65 + rand() * 8
      powerLoadKw = 0.3 + rand() * 1.2
      cpuLoadPct = 0
      utilizationPct = 0
      airflowStatus = 'maintenance_bypass'
      maintenanceState = rand() > 0.5 ? 'scheduled' : 'in_progress'
      alertLevel = 'info'
    }

    if (status === 'reserved') {
      temperature = 66 + rand() * 6
      powerLoadKw = 0.8 + rand() * 1.7
      cpuLoadPct = 8 + rand() * 12
      utilizationPct = 0
      maintenanceState = 'capacity_reserved'
      alertLevel = 'info'
    }

    if (status === 'offline') {
      temperature = 65 + rand() * 3
      powerLoadKw = 0
      cpuLoadPct = 0
      utilizationPct = 0
      airflowStatus = 'idle'
      maintenanceState = 'offline'
      alertLevel = 'warning'
    }

    if (neighborBoost.has(rack.id) && status === 'healthy') {
      temperature += 4 + rand() * 4
      cpuLoadPct += 8 + rand() * 10
      powerLoadKw += 0.8 + rand() * 1.4
      airflowStatus = rand() > 0.7 ? 'degraded' : airflowStatus
    }

    return {
      id: rack.id,
      label: rack.label,
      row: rack.row,
      position: rack.position,
      x: rack.x,
      y: rack.y,
      width: rack.width,
      height: rack.height,
      zone: rack.zone,
      status,
      temperature: Number(clamp(temperature, 65, 105).toFixed(1)),
      powerLoadKw: Number(clamp(powerLoadKw, 0, 12).toFixed(2)),
      cpuLoadPct: Number(clamp(cpuLoadPct, 0, 99).toFixed(1)),
      utilizationPct: Number(clamp(utilizationPct, 0, 100).toFixed(1)),
      airflowStatus,
      maintenanceState,
      alertLevel,
    }
  })
}

export function createDataCenterAlerts(layout, telemetry, options = {}) {
  const seed = options.seed ?? layout?.config?.seed ?? DEFAULT_LAYOUT_CONFIG.seed
  const rand = createSeededRandom(`${seed}-alerts`)
  const byId = new Map((telemetry || []).map((t) => [t.id, t]))
  const overheating = (telemetry || []).filter((t) => t.status === 'overheating')
  const highLoad = (telemetry || []).filter((t) => t.status === 'high_load')
  const maintenance = (telemetry || []).filter((t) => t.status === 'maintenance')
  const alerts = []
  const now = Date.now()

  if (overheating[0]) {
    alerts.push({
      id: 'alert-temp-critical',
      severity: 'critical',
      title: `Rack ${overheating[0].label} temperature critical`,
      message: `Rack ${overheating[0].label} reached ${overheating[0].temperature}F with elevated CPU load.`,
      affectedRackIds: [overheating[0].id],
      timestamp: new Date(now - 2 * 60_000).toISOString(),
      category: 'thermal',
    })
  }

  if (highLoad[0]) {
    alerts.push({
      id: 'alert-power-spike',
      severity: 'warning',
      title: `Rack ${highLoad[0].label} power load spike detected`,
      message: `Power draw increased to ${highLoad[0].powerLoadKw}kW and compute utilization remains elevated.`,
      affectedRackIds: [highLoad[0].id],
      timestamp: new Date(now - 6 * 60_000).toISOString(),
      category: 'power',
    })
  }

  if (maintenance[0]) {
    alerts.push({
      id: 'alert-maintenance-active',
      severity: 'info',
      title: `Rack ${maintenance[0].label} scheduled maintenance in progress`,
      message: `Maintenance workflow active for ${maintenance[0].label}; workload allocation reduced.`,
      affectedRackIds: [maintenance[0].id],
      timestamp: new Date(now - 12 * 60_000).toISOString(),
      category: 'maintenance',
    })
  }

  if (overheating.length > 0) {
    const source = overheating[Math.floor(rand() * overheating.length)]
    const neighbors = (telemetry || [])
      .filter((t) => t.row === source.row && t.position >= source.position - 2 && t.position <= source.position + 1)
      .slice(0, 4)
      .map((t) => t.id)
    alerts.push({
      id: 'alert-airflow-zone',
      severity: 'warning',
      title: `Cooling airflow degradation near ${source.label}`,
      message: `Cross-aisle sensors indicate airflow degradation near ${source.row}${String(Math.max(1, source.position - 2)).padStart(2, '0')}-${source.row}${String(source.position + 1).padStart(2, '0')}.`,
      affectedRackIds: neighbors.length ? neighbors : [source.id],
      timestamp: new Date(now - 17 * 60_000).toISOString(),
      category: 'cooling',
    })
  }

  return alerts.filter((a) => a.affectedRackIds.every((id) => byId.has(id)))
}

export function createWorkloadMovements(layout, telemetry, options = {}) {
  const seed = options.seed ?? layout?.config?.seed ?? DEFAULT_LAYOUT_CONFIG.seed
  const rand = createSeededRandom(`${seed}-movements`)
  const risky = (telemetry || []).filter((t) => t.status === 'overheating' || t.status === 'high_load' || t.status === 'maintenance')
  const healthy = (telemetry || []).filter((t) => t.status === 'healthy')
  const now = Date.now()
  if (risky.length === 0 || healthy.length < 2) return []

  const movementCount = clamp(options.movementCount ?? 3, 2, 6)
  const events = []
  for (let i = 0; i < movementCount; i += 1) {
    const from = risky[i % risky.length]
    const to = healthy[Math.floor(rand() * healthy.length)]
    if (!from || !to || from.id === to.id) continue
    events.push({
      id: `move-${i + 1}`,
      fromRackId: from.id,
      toRackId: to.id,
      workloadName: `compute-batch-${String(i + 1).padStart(2, '0')}`,
      reason: from.status === 'maintenance' ? 'maintenance_reroute' : from.status === 'overheating' ? 'thermal_failover' : 'load_rebalance',
      status: i === 0 ? 'in_progress' : 'completed',
      timestamp: new Date(now - (i + 1) * 7 * 60_000).toISOString(),
    })
  }
  return events
}

export function createZoneSummaries(layout, telemetry, alerts = []) {
  const zones = [...new Set((layout?.racks || []).map((rack) => rack.zone).filter(Boolean))]
  return zones.map((zone) => {
    const zoneTelemetry = (telemetry || []).filter((item) => item.zone === zone)
    const zoneRackIds = new Set(zoneTelemetry.map((item) => item.id))
    const zoneAlerts = (alerts || []).filter((alert) => alert.affectedRackIds.some((id) => zoneRackIds.has(id)))
    const active = zoneTelemetry.filter((item) => item.status !== 'offline').length
    const healthy = zoneTelemetry.filter((item) => item.status === 'healthy').length
    const tempAvg = zoneTelemetry.length
      ? zoneTelemetry.reduce((sum, item) => sum + item.temperature, 0) / zoneTelemetry.length
      : 0
    const powerTotal = zoneTelemetry.reduce((sum, item) => sum + item.powerLoadKw, 0)
    return {
      zone,
      rackCount: zoneTelemetry.length,
      activeRacks: active,
      healthyRacks: healthy,
      criticalAlerts: zoneAlerts.filter((a) => a.severity === 'critical').length,
      averageTemperature: Number(tempAvg.toFixed(1)),
      totalPowerLoadKw: Number(powerTotal.toFixed(2)),
      utilizationRate: zoneTelemetry.length
        ? Number((zoneTelemetry.reduce((sum, item) => sum + item.utilizationPct, 0) / zoneTelemetry.length).toFixed(1))
        : 0,
    }
  })
}

export function buildDataCenterDemoSite(config = {}, options = {}) {
  const layout = createRackLayout(config)
  const telemetry = createRackTelemetry(layout, options)
  const alerts = createDataCenterAlerts(layout, telemetry, options)
  const movements = createWorkloadMovements(layout, telemetry, options)
  const zoneSummaries = createZoneSummaries(layout, telemetry, alerts)
  return {
    siteType: 'data_center',
    siteName: options.siteName || 'NM2TECH Demo Data Center 01',
    generatedAt: options.generatedAt || new Date().toISOString(),
    layout: layout.racks,
    telemetry,
    alerts,
    movements,
    zoneSummaries,
  }
}

export { RACK_STATUSES, DEFAULT_LAYOUT_CONFIG }
