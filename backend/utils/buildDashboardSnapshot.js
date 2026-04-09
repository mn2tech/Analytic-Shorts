function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toStringValue(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function sanitizeOperationalImpact(impact = {}) {
  if (!impact || typeof impact !== 'object') return null
  return {
    hoursSavedPerDay: toNumber(impact.hoursSavedPerDay, 0),
    annualHoursSaved: toNumber(impact.annualHoursSaved, 0),
    annualValue: toNumber(impact.annualValue, 0),
  }
}

function sanitizeSnapshot(snapshot = {}) {
  const safe = (snapshot && typeof snapshot === 'object') ? snapshot : {}
  const roomAvailability = (safe.roomAvailability && typeof safe.roomAvailability === 'object') ? safe.roomAvailability : {}

  return {
    hospitalName: toStringValue(safe.hospitalName, 'Demo Hospital'),
    timestamp: toStringValue(safe.timestamp, new Date().toISOString()),
    waitingRoom: toNumber(safe.waitingRoom),
    erPatients: toNumber(safe.erPatients),
    gwPatients: toNumber(safe.gwPatients),
    icuPatients: toNumber(safe.icuPatients),
    orPatients: toNumber(safe.orPatients),
    erOccupancy: toNumber(safe.erOccupancy),
    gwOccupancy: toNumber(safe.gwOccupancy),
    icuOccupancy: toNumber(safe.icuOccupancy),
    orOccupancy: toNumber(safe.orOccupancy),
    roomAvailability: {
      ER: toNumber(roomAvailability.ER),
      GW: toNumber(roomAvailability.GW),
      ICU: toNumber(roomAvailability.ICU),
      OR: toNumber(roomAvailability.OR),
      WAITING: toNumber(roomAvailability.WAITING),
    },
    boardingPatients: toNumber(safe.boardingPatients),
    avgBoardingDelay: toNumber(safe.avgBoardingDelay),
    transfersInProgress: toNumber(safe.transfersInProgress),
    dischargedToday: toNumber(safe.dischargedToday),
    losByDepartment: safe.losByDepartment && typeof safe.losByDepartment === 'object' ? safe.losByDepartment : {},
    longestLOS: toStringValue(safe.longestLOS, '0m'),
    longestLOSPatient: safe.longestLOSPatient && typeof safe.longestLOSPatient === 'object' ? safe.longestLOSPatient : null,
    operationalImpact: sanitizeOperationalImpact(safe.operationalImpact),
    roiPanel: safe.roiPanel && typeof safe.roiPanel === 'object' ? safe.roiPanel : null,
    roomStates: safe.roomStates && typeof safe.roomStates === 'object' ? safe.roomStates : {},
    metrics: safe.metrics && typeof safe.metrics === 'object' ? safe.metrics : {},
    scenarioMode: toStringValue(safe.scenarioMode, 'Normal'),
  }
}

module.exports = {
  sanitizeSnapshot,
}
