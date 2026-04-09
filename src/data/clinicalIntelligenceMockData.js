/**
 * Clinical intelligence mock adapters for demo mode.
 * Future integration points:
 * - HL7 ADT feed for movement/encounter updates
 * - FHIR Observation for vitals and early warning contributors
 * - FHIR Encounter for care team and disposition signals
 * - Staffing assignment feed for real nurse/provider availability
 * - Housekeeping / bed status feed for throughput pressure
 */

export const CLINICAL_UNITS = {
  ER: 'ER',
  ICU: 'ICU',
  MED_SURG: 'Med-Surg',
  OR_PACU: 'OR/PACU',
  WAITING: 'Waiting',
}

export function normalizeClinicalUnit(unit) {
  if (!unit) return CLINICAL_UNITS.MED_SURG
  if (unit === 'GW' || unit === 'General Ward' || unit === 'MED-SURG' || unit === 'Med-Surg') return CLINICAL_UNITS.MED_SURG
  if (unit === 'OR' || unit === 'PACU' || unit === 'OR/PACU') return CLINICAL_UNITS.OR_PACU
  if (unit === 'ER') return CLINICAL_UNITS.ER
  if (unit === 'ICU') return CLINICAL_UNITS.ICU
  if (unit === 'WAITING') return CLINICAL_UNITS.WAITING
  return CLINICAL_UNITS.MED_SURG
}

export const MOCK_UNIT_BASELINES = {
  [CLINICAL_UNITS.ER]: {
    unitName: CLINICAL_UNITS.ER,
    staffedBeds: 18,
    recommendedNurses: 10,
    availableNurses: 9,
    transferPendingCount: 3,
    dischargePendingCount: 1,
    housekeepingDelayCount: 2,
  },
  [CLINICAL_UNITS.ICU]: {
    unitName: CLINICAL_UNITS.ICU,
    staffedBeds: 12,
    recommendedNurses: 11,
    availableNurses: 8,
    transferPendingCount: 2,
    dischargePendingCount: 0,
    housekeepingDelayCount: 1,
  },
  [CLINICAL_UNITS.MED_SURG]: {
    unitName: CLINICAL_UNITS.MED_SURG,
    staffedBeds: 28,
    recommendedNurses: 12,
    availableNurses: 8,
    transferPendingCount: 4,
    dischargePendingCount: 5,
    housekeepingDelayCount: 4,
  },
  [CLINICAL_UNITS.OR_PACU]: {
    unitName: CLINICAL_UNITS.OR_PACU,
    staffedBeds: 10,
    recommendedNurses: 6,
    availableNurses: 5,
    transferPendingCount: 2,
    dischargePendingCount: 1,
    housekeepingDelayCount: 1,
  },
}

// Includes demo scenarios:
// A) stable ER patient, B) worsening ICU respiratory patient,
// C) Med-Surg strain population, D) sepsis-watch patient.
export const MOCK_CLINICAL_PATIENT_TEMPLATES = [
  {
    patientId: 'PT-ER-10221',
    roomId: 'ROOM_006',
    department: CLINICAL_UNITS.ER,
    age: 34,
    chiefComplaint: 'Abdominal pain',
    acuityLevel: 4,
    riskScore: 24,
    riskTrend: 'stable',
    earlyWarningScore: 2,
    deteriorationFlag: false,
    sepsisRisk: 'low',
    fallRisk: 'low',
    oxygenNeed: 'Room Air',
    careIntensityLevel: 'low',
    vitalsTrend: {
      heartRateTrend: 'stable',
      respiratoryRateTrend: 'stable',
      bloodPressureTrend: 'stable',
      spo2Trend: 'stable',
      temperatureTrend: 'stable',
    },
    lastClinicalUpdate: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    pendingTasksCount: 1,
    pendingLabsCount: 1,
    medsDueInMinutes: 38,
    nurseAssigned: 'RN Harper',
    providerAssigned: 'Dr. Lee',
    isolationStatus: 'none',
    dispositionRisk: 'low',
    expectedEscalationProbabilityNext60Min: 0.12,
  },
  {
    patientId: 'PT-ICU-77341',
    roomId: 'ROOM_023',
    department: CLINICAL_UNITS.ICU,
    age: 67,
    chiefComplaint: 'Acute hypoxic respiratory failure',
    acuityLevel: 1,
    riskScore: 81,
    riskTrend: 'up',
    earlyWarningScore: 8,
    deteriorationFlag: true,
    sepsisRisk: 'medium',
    fallRisk: 'medium',
    oxygenNeed: 'HFNC 50L 70%',
    careIntensityLevel: 'critical',
    vitalsTrend: {
      heartRateTrend: 'up',
      respiratoryRateTrend: 'up',
      bloodPressureTrend: 'down',
      spo2Trend: 'down',
      temperatureTrend: 'up',
    },
    lastClinicalUpdate: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    pendingTasksCount: 4,
    pendingLabsCount: 3,
    medsDueInMinutes: 5,
    nurseAssigned: 'RN Santos',
    providerAssigned: 'Dr. Okafor',
    isolationStatus: 'droplet',
    dispositionRisk: 'high',
    expectedEscalationProbabilityNext60Min: 0.71,
  },
  {
    patientId: 'PT-MS-22017',
    roomId: 'ROOM_027',
    department: CLINICAL_UNITS.MED_SURG,
    age: 73,
    chiefComplaint: 'Pneumonia with weakness',
    acuityLevel: 2,
    riskScore: 66,
    riskTrend: 'up',
    earlyWarningScore: 6,
    deteriorationFlag: true,
    sepsisRisk: 'high',
    fallRisk: 'high',
    oxygenNeed: 'NC 4L',
    careIntensityLevel: 'high',
    vitalsTrend: {
      heartRateTrend: 'up',
      respiratoryRateTrend: 'up',
      bloodPressureTrend: 'stable',
      spo2Trend: 'down',
      temperatureTrend: 'up',
    },
    lastClinicalUpdate: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
    pendingTasksCount: 5,
    pendingLabsCount: 2,
    medsDueInMinutes: 12,
    nurseAssigned: 'RN Carter',
    providerAssigned: 'Dr. Patel',
    isolationStatus: 'contact',
    dispositionRisk: 'high',
    expectedEscalationProbabilityNext60Min: 0.62,
  },
  {
    patientId: 'PT-ER-55830',
    roomId: 'ROOM_009',
    department: CLINICAL_UNITS.ER,
    age: 58,
    chiefComplaint: 'Fever, hypotension, confusion',
    acuityLevel: 2,
    riskScore: 59,
    riskTrend: 'up',
    earlyWarningScore: 5,
    deteriorationFlag: true,
    sepsisRisk: 'high',
    fallRisk: 'medium',
    oxygenNeed: 'NC 6L',
    careIntensityLevel: 'high',
    vitalsTrend: {
      heartRateTrend: 'up',
      respiratoryRateTrend: 'up',
      bloodPressureTrend: 'down',
      spo2Trend: 'down',
      temperatureTrend: 'up',
    },
    lastClinicalUpdate: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    pendingTasksCount: 4,
    pendingLabsCount: 4,
    medsDueInMinutes: 8,
    nurseAssigned: 'RN Morgan',
    providerAssigned: 'Dr. Rao',
    isolationStatus: 'none',
    dispositionRisk: 'high',
    expectedEscalationProbabilityNext60Min: 0.56,
  },
]

export function getClinicalTemplateByRoom(roomId) {
  return MOCK_CLINICAL_PATIENT_TEMPLATES.find((p) => p.roomId === roomId) || null
}
