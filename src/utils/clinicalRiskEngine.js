const TREND_IMPACT = {
  up: 6,
  down: -4,
  stable: 0,
}

const SEPSIS_IMPACT = {
  low: 0,
  medium: 10,
  high: 22,
}

const OXYGEN_IMPACT = {
  'Room Air': 0,
  'NC 2L': 4,
  'NC 4L': 8,
  'NC 6L': 11,
  'HFNC 40L 60%': 16,
  'HFNC 50L 70%': 19,
  Ventilator: 24,
}

export function getRiskBand(riskScore) {
  if (riskScore >= 80) return 'red'
  if (riskScore >= 60) return 'orange'
  if (riskScore >= 30) return 'yellow'
  return 'green'
}

export function getRiskBandColorClass(riskBand) {
  if (riskBand === 'red') return 'bg-red-500 text-red-50 border-red-300/60'
  if (riskBand === 'orange') return 'bg-orange-500 text-orange-50 border-orange-300/60'
  if (riskBand === 'yellow') return 'bg-amber-400 text-amber-950 border-amber-100/70'
  return 'bg-emerald-500 text-emerald-50 border-emerald-300/60'
}

export function getStatusLabel(riskScore, escalationProbability) {
  if (riskScore >= 80 || escalationProbability >= 0.7) return 'Escalation Likely'
  if (riskScore >= 60 || escalationProbability >= 0.5) return 'High Risk'
  if (riskScore >= 30 || escalationProbability >= 0.25) return 'Watch Closely'
  return 'Stable'
}

function getAcuityRiskImpact(acuityLevel) {
  // ESI-like scale: lower number = higher acuity.
  const level = Number(acuityLevel || 5)
  if (level <= 1) return 30
  if (level === 2) return 22
  if (level === 3) return 14
  if (level === 4) return 7
  return 2
}

function getVitalsImpact(vitalsTrend = {}) {
  let score = 0
  const reasons = []
  const entries = [
    ['heartRateTrend', 'Heart rate worsening'],
    ['respiratoryRateTrend', 'Respiratory rate worsening'],
    ['bloodPressureTrend', 'Blood pressure instability'],
    ['spo2Trend', 'Oxygen saturation declining'],
    ['temperatureTrend', 'Temperature trend concerning'],
  ]
  entries.forEach(([key, reason]) => {
    const trend = vitalsTrend[key] || 'stable'
    score += TREND_IMPACT[trend] || 0
    if (trend === 'up' && (key === 'respiratoryRateTrend' || key === 'temperatureTrend' || key === 'heartRateTrend')) reasons.push(reason)
    if (trend === 'down' && (key === 'bloodPressureTrend' || key === 'spo2Trend')) reasons.push(reason)
  })
  return { score, reasons }
}

export function calculateClinicalRisk(patient, unitContext = null) {
  const explanation = []
  let riskScore = 0

  const acuityImpact = getAcuityRiskImpact(patient.acuityLevel)
  riskScore += acuityImpact
  if (patient.acuityLevel <= 2) explanation.push('High acuity presentation')

  const vitals = getVitalsImpact(patient.vitalsTrend)
  riskScore += vitals.score
  explanation.push(...vitals.reasons)

  const oxygenImpact = OXYGEN_IMPACT[patient.oxygenNeed] ?? 6
  riskScore += oxygenImpact
  if (oxygenImpact >= 10) explanation.push('High oxygen support')

  const sepsisImpact = SEPSIS_IMPACT[patient.sepsisRisk] ?? 0
  riskScore += sepsisImpact
  if (patient.sepsisRisk === 'high') explanation.push('High sepsis risk')

  const pendingTaskImpact = Math.min(8, (patient.pendingTasksCount || 0) * 1.2 + (patient.pendingLabsCount || 0) * 0.8)
  riskScore += pendingTaskImpact
  if ((patient.pendingTasksCount || 0) >= 4) explanation.push('Multiple pending clinical tasks')

  if ((patient.medsDueInMinutes || 999) <= 15) {
    riskScore += 5
    explanation.push('Time-sensitive medication due')
  }

  if (patient.riskTrend === 'up') {
    riskScore += 8
    explanation.push('Risk trajectory rising')
  } else if (patient.riskTrend === 'down') {
    riskScore -= 5
  }

  const ews = Number(patient.earlyWarningScore || 0)
  riskScore += Math.max(0, (ews - 2) * 2.4)
  if (ews >= 6) explanation.push('Elevated early warning score')

  const staffingPressure = Number(unitContext?.staffingPressureScore || 0)
  if (staffingPressure > 55) {
    riskScore += 5
    explanation.push('Unit staffing under pressure')
  }

  const workload = Number(unitContext?.workloadIndex || 0)
  if (workload > 75) {
    riskScore += 4
    explanation.push('Unit workload imbalance')
  }

  riskScore = Math.max(0, Math.min(100, Math.round(riskScore)))
  const riskBand = getRiskBand(riskScore)
  const expectedEscalationProbabilityNext60Min = Math.max(
    0.03,
    Math.min(0.97, Number(((riskScore / 100) * 0.65 + (staffingPressure / 100) * 0.2 + (ews / 10) * 0.15).toFixed(2))),
  )

  return {
    riskScore,
    riskBand,
    explanation: Array.from(new Set(explanation)).slice(0, 5),
    expectedEscalationProbabilityNext60Min,
    statusLabel: getStatusLabel(riskScore, expectedEscalationProbabilityNext60Min),
    deteriorationFlag: riskScore >= 60 || ews >= 6 || patient.sepsisRisk === 'high',
  }
}
