import {
  CLINICAL_UNITS,
  MOCK_UNIT_BASELINES,
  getClinicalTemplateByRoom,
  normalizeClinicalUnit,
} from '../data/clinicalIntelligenceMockData'
import { calculateClinicalRisk } from './clinicalRiskEngine'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function seededValue(seed, min, max) {
  const raw = Math.abs(Math.sin(seed * 12.345 + 1.2345))
  return min + raw * (max - min)
}

function createFallbackPatient(roomId, department, tick) {
  const age = Math.round(seededValue(roomId.length + tick, 28, 84))
  const acuityLevel = Math.round(seededValue(roomId.length * 2 + tick, 2, 5))
  const oxygenOptions = ['Room Air', 'NC 2L', 'NC 4L', 'NC 6L']
  const oxygenNeed = oxygenOptions[Math.floor(seededValue(roomId.length + tick, 0, oxygenOptions.length - 0.01))]
  return {
    patientId: `PT-${roomId.replace('ROOM_', '')}-${100 + tick}`,
    roomId,
    department,
    age,
    chiefComplaint: department === CLINICAL_UNITS.ER ? 'Chest pain' : 'Medical optimization',
    acuityLevel,
    riskScore: 40,
    riskTrend: 'stable',
    earlyWarningScore: clamp(Math.round(seededValue(tick + age, 2, 7)), 1, 9),
    deteriorationFlag: false,
    sepsisRisk: 'low',
    fallRisk: age > 70 ? 'high' : 'medium',
    oxygenNeed,
    careIntensityLevel: acuityLevel <= 2 ? 'high' : 'moderate',
    vitalsTrend: {
      heartRateTrend: 'stable',
      respiratoryRateTrend: 'stable',
      bloodPressureTrend: 'stable',
      spo2Trend: oxygenNeed === 'Room Air' ? 'stable' : 'down',
      temperatureTrend: 'stable',
    },
    lastClinicalUpdate: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    pendingTasksCount: Math.round(seededValue(tick + roomId.length, 1, 4)),
    pendingLabsCount: Math.round(seededValue(tick + roomId.length * 1.4, 0, 3)),
    medsDueInMinutes: Math.round(seededValue(tick + roomId.length * 2, 6, 50)),
    nurseAssigned: `RN ${roomId.slice(-2)}`,
    providerAssigned: department === CLINICAL_UNITS.ER ? 'Dr. Kim' : 'Dr. Ali',
    isolationStatus: 'none',
    dispositionRisk: acuityLevel <= 2 ? 'high' : 'moderate',
    expectedEscalationProbabilityNext60Min: 0.3,
  }
}

function withSimulation(basePatient, tick) {
  const wave = Math.sin(tick / 2 + basePatient.patientId.length * 0.03)
  const riskTrend = wave > 0.28 ? 'up' : wave < -0.28 ? 'down' : 'stable'
  const ewsDelta = riskTrend === 'up' ? 1 : riskTrend === 'down' ? -1 : 0
  const medsDueInMinutes = clamp((basePatient.medsDueInMinutes || 30) - (tick % 3 === 0 ? 2 : 0), 0, 90)
  const pendingTasksCount = clamp((basePatient.pendingTasksCount || 1) + (riskTrend === 'up' ? 1 : 0), 0, 8)
  const pendingLabsCount = clamp((basePatient.pendingLabsCount || 0) + (riskTrend === 'up' && tick % 2 === 0 ? 1 : 0), 0, 8)
  const refreshedAgoMins = clamp(3 + ((tick + basePatient.patientId.length) % 20), 2, 28)

  return {
    ...basePatient,
    riskTrend,
    earlyWarningScore: clamp((basePatient.earlyWarningScore || 3) + ewsDelta, 0, 12),
    medsDueInMinutes,
    pendingTasksCount,
    pendingLabsCount,
    lastClinicalUpdate: new Date(Date.now() - refreshedAgoMins * 60 * 1000).toISOString(),
    vitalsTrend: {
      ...basePatient.vitalsTrend,
      respiratoryRateTrend: riskTrend === 'up' ? 'up' : basePatient.vitalsTrend?.respiratoryRateTrend || 'stable',
      spo2Trend: basePatient.oxygenNeed === 'Room Air' ? 'stable' : (riskTrend === 'up' ? 'down' : 'stable'),
    },
  }
}

function createEmptyUnit(unitName) {
  const baseline = MOCK_UNIT_BASELINES[unitName] || {
    unitName,
    staffedBeds: 0,
    recommendedNurses: 0,
    availableNurses: 0,
    transferPendingCount: 0,
    dischargePendingCount: 0,
    housekeepingDelayCount: 0,
  }
  return {
    ...baseline,
    occupiedBeds: 0,
    staffingGap: baseline.availableNurses - baseline.recommendedNurses,
    avgAcuity: 0,
    workloadIndex: 0,
    deteriorationAlertsCount: 0,
    highRiskPatientCount: 0,
    acuityWeightedCensus: 0,
    nurseCapacityScore: 0,
    staffingPressureScore: 0,
    acuityStaffMismatch: false,
    alertReasons: [],
  }
}

function computeUnitMetrics(unit, patients, tick) {
  const occupiedBeds = patients.length
  const avgAcuity = occupiedBeds > 0
    ? Number((patients.reduce((sum, p) => sum + Number(p.acuityLevel || 3), 0) / occupiedBeds).toFixed(1))
    : 0
  const acuityWeightedCensus = Number(
    patients.reduce((sum, p) => {
      const riskWeight = (p.riskScore || 0) / 30
      const intensityWeight = p.careIntensityLevel === 'critical' ? 2.4 : p.careIntensityLevel === 'high' ? 1.8 : p.careIntensityLevel === 'moderate' ? 1.2 : 0.8
      return sum + intensityWeight + riskWeight
    }, 0).toFixed(1),
  )

  const nurseCapacityScore = Number(((unit.availableNurses || 0) * 10).toFixed(1))
  const staffingGap = (unit.availableNurses || 0) - (unit.recommendedNurses || 0)
  const basePressure = acuityWeightedCensus * 4.2 - nurseCapacityScore + (unit.transferPendingCount || 0) * 2 + (unit.housekeepingDelayCount || 0) * 1.5
  const staffingPressureScore = clamp(Math.round(basePressure + (tick % 4) * 2), 0, 100)

  const deteriorationAlertsCount = patients.filter((p) => p.deteriorationFlag).length
  const highRiskPatientCount = patients.filter((p) => p.riskScore >= 60).length
  const workloadIndex = clamp(Math.round(
    occupiedBeds * 3.4 +
    avgAcuity * 8 +
    (unit.transferPendingCount || 0) * 3 +
    (unit.housekeepingDelayCount || 0) * 2.5 +
    highRiskPatientCount * 5.5 -
    (unit.availableNurses || 0) * 3.2,
  ), 0, 100)

  const acuityStaffMismatch = acuityWeightedCensus > nurseCapacityScore * 0.95 || (avgAcuity >= 3.5 && staffingGap < 0)

  const alertReasons = []
  if (workloadIndex > 75) alertReasons.push('Workload index critical')
  if (staffingGap < 0) alertReasons.push('Nursing coverage below recommendation')
  if (acuityStaffMismatch) alertReasons.push(`${unit.unitName} acuity-capacity mismatch`)

  return {
    ...unit,
    occupiedBeds,
    staffingGap,
    avgAcuity,
    workloadIndex,
    deteriorationAlertsCount,
    highRiskPatientCount,
    acuityWeightedCensus,
    nurseCapacityScore,
    staffingPressureScore,
    acuityStaffMismatch,
    alertReasons,
  }
}

function makeTrendSeries(currentValue, tick, points = 6, volatility = 6) {
  return new Array(points).fill(0).map((_, idx) => {
    const phase = tick - (points - idx - 1)
    const delta = Math.sin(phase * 0.8) * volatility + Math.cos(phase * 0.33) * (volatility * 0.35)
    return Math.round(clamp(currentValue + delta, 0, 100))
  })
}

export function buildClinicalIntelligenceState({ roomStatusMap = {}, roomIdToUnit = new Map(), tick = 0 }) {
  const roomEntries = Object.entries(roomStatusMap)
  const occupiedRooms = roomEntries.filter(([, data]) => data?.status === 'occupied')

  const patients = occupiedRooms.map(([roomId, roomData]) => {
    const department = normalizeClinicalUnit(roomIdToUnit.get(roomId))
    const seeded = getClinicalTemplateByRoom(roomId)
    const base = seeded || createFallbackPatient(roomId, department, tick)
    const merged = withSimulation({
      ...base,
      roomId,
      department,
      patientId: roomData?.patient_id || base.patientId,
    }, tick)
    return merged
  })

  const units = {}
  Object.values(CLINICAL_UNITS).forEach((name) => {
    if (name !== CLINICAL_UNITS.WAITING) units[name] = createEmptyUnit(name)
  })

  patients.forEach((patient) => {
    const unitName = normalizeClinicalUnit(patient.department)
    if (!units[unitName]) units[unitName] = createEmptyUnit(unitName)
  })

  Object.keys(units).forEach((unitName) => {
    const unitPatients = patients.filter((p) => normalizeClinicalUnit(p.department) === unitName)
    units[unitName] = computeUnitMetrics(units[unitName], unitPatients, tick)
  })

  const enrichedPatients = patients.map((patient) => {
    const unitStats = units[normalizeClinicalUnit(patient.department)]
    const risk = calculateClinicalRisk(patient, unitStats)
    return {
      ...patient,
      ...risk,
      department: normalizeClinicalUnit(patient.department),
      dispositionRisk: patient.dispositionRisk || (risk.riskScore >= 65 ? 'high' : risk.riskScore >= 35 ? 'moderate' : 'low'),
      riskSeries: makeTrendSeries(risk.riskScore, tick, 6, 8),
      earlyWarningSeries: makeTrendSeries((patient.earlyWarningScore || 3) * 9, tick, 6, 4).map((v) => Math.round(v / 9)),
    }
  })

  const patientsByRoom = {}
  const patientsById = {}
  enrichedPatients.forEach((patient) => {
    patientsByRoom[patient.roomId] = patient
    patientsById[patient.patientId] = patient
  })

  const unitList = Object.values(units).map((unit) => ({
    ...unit,
    workloadSeries: makeTrendSeries(unit.workloadIndex, tick, 6, 7),
  }))

  const alerts = enrichedPatients
    .filter((p) => p.riskScore >= 60 || p.sepsisRisk === 'high' || p.deteriorationFlag || p.expectedEscalationProbabilityNext60Min >= 0.6)
    .sort((a, b) => b.riskScore - a.riskScore)
    .map((patient) => {
      const unit = units[normalizeClinicalUnit(patient.department)]
      const minsSinceUpdate = Math.max(1, Math.round((Date.now() - new Date(patient.lastClinicalUpdate).getTime()) / 60000))
      let recommendedAction = 'Review vitals and reassess within 15 min'
      if (patient.expectedEscalationProbabilityNext60Min >= 0.7) recommendedAction = 'Consider rapid response evaluation'
      else if (patient.sepsisRisk === 'high') recommendedAction = 'Check oxygen escalation and sepsis bundle compliance'
      else if (unit?.staffingPressureScore > 70) recommendedAction = 'Validate nurse assignment due to workload pressure'
      return {
        id: `${patient.patientId}-${tick}`,
        severity: patient.riskBand,
        type: patient.sepsisRisk === 'high'
          ? 'Sepsis Watch'
          : unit?.staffingPressureScore > 70
            ? 'Staffing Related'
            : patient.expectedEscalationProbabilityNext60Min >= 0.6
              ? 'Escalation Likely'
              : 'High Risk',
        patientId: patient.patientId,
        roomId: patient.roomId,
        department: patient.department,
        reasons: patient.explanation,
        riskScore: patient.riskScore,
        minsSinceClinicalUpdate: minsSinceUpdate,
        recommendedAction,
      }
    })

  const unitsUnderStaffingPressure = unitList.filter((u) => u.staffingGap < 0 || u.workloadIndex > 75)
  const totalHighRiskPatients = enrichedPatients.filter((p) => p.riskScore >= 60).length
  const likelyEscalations = enrichedPatients.filter((p) => p.expectedEscalationProbabilityNext60Min >= 0.6).length
  const transferBottlenecks = unitList.reduce((sum, u) => sum + (u.transferPendingCount || 0), 0)

  const summary = {
    totalHighRiskPatients,
    likelyEscalations,
    unitsUnderStaffingPressure: unitsUnderStaffingPressure.length,
    openDeteriorationAlerts: alerts.length,
    transferBottlenecks,
    averageAcuityByUnit: unitList.map((u) => ({ unitName: u.unitName, avgAcuity: u.avgAcuity })),
  }

  return {
    tick,
    patients: enrichedPatients,
    patientsByRoom,
    patientsById,
    unitMetrics: unitList,
    alerts,
    summary,
  }
}
