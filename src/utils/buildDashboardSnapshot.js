function getUnitOccupancySummary(roomOverlays = [], roomStatusMap = {}, unitName) {
  const unitRooms = roomOverlays.filter((r) => r.unit === unitName)
  const total = unitRooms.length
  const occupied = unitRooms.reduce((count, room) => {
    const status = roomStatusMap?.[room.id]?.status
    return (status === 'occupied' || status === 'reserved') ? count + 1 : count
  }, 0)
  const available = unitRooms.reduce((count, room) => {
    const status = roomStatusMap?.[room.id]?.status
    return status === 'available' ? count + 1 : count
  }, 0)
  const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0

  return { occupied, available, total, occupancyPct }
}

function formatLosMinutes(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '0m'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  if (hours <= 0) return `${minutes}m`
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function extractLongestLosPatient(roomStatusMap = {}, roomIdToUnit = new Map(), nowTs = Date.now()) {
  let maxMinutes = -1
  let longest = null

  Object.entries(roomStatusMap).forEach(([roomId, roomData]) => {
    if (!roomData || roomData.status !== 'occupied' || !roomData.admitted_at_iso) return
    const admittedAt = new Date(roomData.admitted_at_iso).getTime()
    if (!Number.isFinite(admittedAt)) return
    const losMinutes = Math.max(0, Math.floor((nowTs - admittedAt) / 60000))
    if (losMinutes > maxMinutes) {
      maxMinutes = losMinutes
      longest = {
        roomId,
        unit: roomIdToUnit.get(roomId) || 'Unknown',
        patientId: roomData.patient_id || null,
        losMinutes,
        formatted: formatLosMinutes(losMinutes),
      }
    }
  })

  return longest
}

export default function buildDashboardSnapshot({
  hospitalName = 'Demo Hospital',
  roomOverlays = [],
  roomStatusMap = {},
  roomIdToUnit = new Map(),
  liveFlowSummary = {},
  activeTransfers = [],
  metrics = {},
  flowDemoMode = 'normal',
  operationalImpact = null,
  nowTs = Date.now(),
}) {
  const waitingSummary = getUnitOccupancySummary(roomOverlays, roomStatusMap, 'WAITING')
  const erSummary = getUnitOccupancySummary(roomOverlays, roomStatusMap, 'ER')
  const gwSummary = getUnitOccupancySummary(roomOverlays, roomStatusMap, 'General Ward')
  const icuSummary = getUnitOccupancySummary(roomOverlays, roomStatusMap, 'ICU')
  const orSummary = getUnitOccupancySummary(roomOverlays, roomStatusMap, 'OR')
  const longestLos = extractLongestLosPatient(roomStatusMap, roomIdToUnit, nowTs)

  const roomStates = Object.entries(roomStatusMap || {}).reduce((acc, [roomId, roomData]) => {
    if (!roomData || typeof roomData !== 'object') return acc
    acc[roomId] = {
      status: roomData.status || 'unknown',
      unit: roomIdToUnit.get(roomId) || 'Unknown',
      patientId: roomData.patient_id || null,
      triageLevel: roomData.triage_level || roomData.acuity_level || null,
      reasonForVisit: roomData.reason_for_visit || null,
      admittedAtIso: roomData.admitted_at_iso || null,
      flowStatus: roomData.flow_status || null,
      boardingMinutes: Number.isFinite(Number(roomData.boarding_minutes)) ? Number(roomData.boarding_minutes) : null,
    }
    return acc
  }, {})

  const boardingPatients = Object.entries(roomStatusMap).reduce((count, [, roomData]) => {
    if (!roomData) return count
    return (roomData.flow_status === 'Boarding' || roomData.flow_status === 'Transfer In Progress') ? count + 1 : count
  }, 0)

  const boardingMinutes = Object.entries(roomStatusMap).reduce((acc, [, roomData]) => {
    if (!roomData) return acc
    if (roomData.flow_status === 'Boarding' || roomData.flow_status === 'Transfer In Progress') {
      const mins = Number(roomData.boarding_minutes || 0)
      return {
        total: acc.total + (Number.isFinite(mins) ? mins : 0),
        count: acc.count + 1,
      }
    }
    return acc
  }, { total: 0, count: 0 })
  const avgBoardingDelay = boardingMinutes.count > 0 ? Math.round(boardingMinutes.total / boardingMinutes.count) : 0

  const losByDepartment = ['ER', 'General Ward', 'ICU', 'OR'].reduce((acc, unitName) => {
    let totalMins = 0
    let count = 0
    Object.entries(roomStatusMap).forEach(([roomId, roomData]) => {
      if (!roomData || roomData.status !== 'occupied' || roomIdToUnit.get(roomId) !== unitName || !roomData.admitted_at_iso) return
      const admittedAt = new Date(roomData.admitted_at_iso).getTime()
      if (!Number.isFinite(admittedAt)) return
      totalMins += Math.max(0, Math.floor((nowTs - admittedAt) / 60000))
      count += 1
    })
    const avgMins = count > 0 ? Math.round(totalMins / count) : 0
    acc[unitName] = {
      avgMinutes: avgMins,
      avgFormatted: formatLosMinutes(avgMins),
      patients: count,
    }
    return acc
  }, {})

  return {
    hospitalName,
    timestamp: new Date(nowTs).toISOString(),
    waitingRoom: liveFlowSummary.waiting ?? waitingSummary.occupied,
    erPatients: erSummary.occupied,
    gwPatients: gwSummary.occupied,
    icuPatients: icuSummary.occupied,
    orPatients: orSummary.occupied,
    erOccupancy: erSummary.occupancyPct,
    gwOccupancy: gwSummary.occupancyPct,
    icuOccupancy: icuSummary.occupancyPct,
    orOccupancy: orSummary.occupancyPct,
    roomAvailability: {
      ER: erSummary.available,
      GW: gwSummary.available,
      ICU: icuSummary.available,
      OR: orSummary.available,
      WAITING: waitingSummary.available,
    },
    boardingPatients,
    avgBoardingDelay,
    transfersInProgress: liveFlowSummary.transfersInProgress ?? activeTransfers.length,
    dischargedToday: liveFlowSummary.dischargedToday ?? 0,
    losByDepartment,
    longestLOS: longestLos ? longestLos.formatted : '0m',
    longestLOSPatient: longestLos,
    operationalImpact: operationalImpact ? {
      hoursSavedPerDay: Number((operationalImpact?.roi?.hoursSavedPerDay ?? 0).toFixed(1)),
      annualHoursSaved: Math.round(operationalImpact?.roi?.annualHoursSaved ?? 0),
      annualValue: Math.round(operationalImpact?.roi?.annualCostImpact ?? 0),
    } : null,
    roiPanel: operationalImpact || null,
    roomStates,
    metrics: {
      totalBeds: metrics.total ?? 0,
      occupiedBeds: metrics.occupied ?? 0,
      availableBeds: metrics.available ?? 0,
      utilizationPct: metrics.utilizationPct ?? 0,
      avgLOS: metrics.avgLOS ?? 0,
      waitingForProvider: metrics.waitingForProvider ?? 0,
      highPressureRooms: metrics.highPressureRooms ?? 0,
      criticalRooms: metrics.criticalRooms ?? 0,
    },
    scenarioMode: flowDemoMode === 'optimized' ? 'Optimized' : 'Normal',
  }
}
