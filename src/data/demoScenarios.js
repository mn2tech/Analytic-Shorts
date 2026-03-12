/**
 * Demo Scenarios for Hospital Command Center
 * Guided scenarios for demonstrating system capabilities
 */

function toAdmittedAtIso(losMinutes) {
  return new Date(Date.now() - losMinutes * 60_000).toISOString()
}

/**
 * Baseline demo state - normal operations before any scenario
 */
export function getBaselineDemoState(roomOverlays = []) {
  const erRooms = roomOverlays.filter((r) => r.unit === 'ER' && r.id?.startsWith('ROOM_'))
  const gwRooms = roomOverlays.filter((r) => r.unit === 'General Ward' && r.id?.startsWith('ROOM_'))
  
  // Baseline: ~60-70% ER occupancy, low waiting room, minimal alerts
  const baselineRooms = {}
  
  // ER rooms: baseline ~65% occupied (12-13 out of ~19 ER rooms)
  erRooms.forEach((r, i) => {
    // Pattern: occupy every 3rd room, plus a few more to reach ~65%
    if (i % 3 === 0 || (i % 3 === 1 && i < 13)) {
      // ~65% occupied
      baselineRooms[r.id] = {
        status: 'occupied',
        admitted_at_iso: toAdmittedAtIso(120 + (i * 15)), // 2-4 hours ago
      }
    } else if (i === 1 || i === 5) {
      // 2 rooms cleaning
      baselineRooms[r.id] = {
        status: 'cleaning',
        predictedInMinutes: 20 + (i * 5),
      }
    } else {
      // Rest available
      baselineRooms[r.id] = {
        status: 'available',
      }
    }
  })
  
  // General Ward: mostly available, few occupied
  gwRooms.forEach((r, i) => {
    if (i % 3 === 0) {
      baselineRooms[r.id] = {
        status: 'occupied',
        admitted_at_iso: toAdmittedAtIso(1440 + (i * 60)), // 24+ hours
      }
    } else {
      baselineRooms[r.id] = {
        status: 'available',
      }
    }
  })
  
  return {
    rooms: baselineRooms,
    waitingRoom: {
      totalWaiting: 5,
      avgWaitMinutes: 18,
      longestWaitMinutes: 32,
      waitingForProvider: 1,
    },
    inboundArrivals: {
      ambulanceCount: 0,
      estimatedPatients: 0,
      etaMin: 0,
      etaMax: 0,
      impact: 'Low',
    },
    alerts: [],
    departmentPressure: {},
  }
}

/**
 * Scenario 1: ER Overcrowding
 */
export const erOvercrowdingScenario = {
  id: 'er_overcrowding',
  name: 'ER Overcrowding',
  description: 'Rising waiting volume and ER utilization pressure',
  durationSeconds: 90,
  totalSteps: 4,
  steps: [
    {
      step: 1,
      at: 0,
      narrative: 'ER operations begin near normal levels.',
      updates: {
        waitingRoom: {
          totalWaiting: 6,
          avgWaitMinutes: 22,
          longestWaitMinutes: 38,
          waitingForProvider: 1,
        },
        rooms: {
          // Start with baseline ER occupancy ~70%
        },
      },
    },
    {
      step: 2,
      at: 20,
      narrative: 'Patient arrivals are increasing and room availability is tightening.',
      updates: {
        waitingRoom: {
          totalWaiting: 10,
          avgWaitMinutes: 35,
          longestWaitMinutes: 52,
          waitingForProvider: 2,
        },
        rooms: {
          // Occupy additional ER rooms (some may already be occupied from baseline)
          'ROOM_001': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(45) },
          'ROOM_004': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(30) },
          'ROOM_007': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(25) },
          'ROOM_023': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(40) },
          'ROOM_024': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(35) },
        },
        alerts: [
          {
            id: 'er-increasing',
            msg: 'ER patient arrivals increasing',
            severity: 'info',
            filterUnit: 'ER',
          },
        ],
      },
    },
    {
      step: 3,
      at: 45,
      narrative: 'ER capacity is now strained and intake delays may begin.',
      updates: {
        waitingRoom: {
          totalWaiting: 14,
          avgWaitMinutes: 48,
          longestWaitMinutes: 68,
          waitingForProvider: 3,
        },
        rooms: {
          // Occupy more ER rooms to reach ~85% utilization
          'ROOM_002': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(20) },
          'ROOM_005': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(15) },
          'ROOM_008': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(10) },
          'ROOM_010': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(8) },
          'ROOM_027': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(18) },
          'ROOM_028': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(16) },
          'ROOM_030': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(14) },
          'ROOM_031': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(12) },
        },
        departmentPressure: {
          unit: 'ER',
          level: 'high',
          score: 0.82,
        },
        alerts: [
          {
            id: 'er-near-capacity',
            msg: 'ER Near Capacity',
            severity: 'warning',
            filterUnit: 'ER',
          },
        ],
        highlightedZone: 'ER',
      },
    },
    {
      step: 4,
      at: 70,
      narrative: 'The ER is at critical utilization (95%+ occupied) with minimal buffer capacity remaining. Command-center action is needed to manage patient flow and prevent overflow.',
      updates: {
        waitingRoom: {
          totalWaiting: 18,
          avgWaitMinutes: 62,
          longestWaitMinutes: 95,
          waitingForProvider: 4,
        },
        rooms: {
          // Occupy ALL remaining ER rooms to reach 95%+ utilization (18-19 out of ~19 ER rooms)
          // Note: "ER Full" in healthcare means 85-95%+ utilization, leaving 1-2 rooms for emergencies
          // These rooms may already be occupied from previous steps, but ensure they're all set
          'ROOM_001': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(45) },
          'ROOM_002': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(20) },
          'ROOM_003': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(5) },
          'ROOM_004': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(30) },
          'ROOM_005': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(15) },
          'ROOM_006': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(3) },
          'ROOM_007': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(25) },
          'ROOM_008': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(10) },
          'ROOM_009': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(2) },
          'ROOM_010': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(8) },
          'ROOM_023': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(40) },
          'ROOM_024': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(35) },
          'ROOM_027': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(18) },
          'ROOM_028': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(16) },
          'ROOM_030': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(14) },
          'ROOM_031': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(12) },
          'ROOM_032': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(6) },
          'ROOM_057': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(7) },
          'ROOM_064': { status: 'occupied', admitted_at_iso: toAdmittedAtIso(8) },
          // Keep 1 ER room available for emergency overflow (realistic hospital operations)
          // This will be one of the rooms not explicitly set above, or the last available one
        },
        departmentPressure: {
          unit: 'ER',
          level: 'critical',
          score: 0.94,
        },
        alerts: [
          {
            id: 'er-critical',
            msg: 'ER Full - Critical ER Pressure',
            severity: 'critical',
            filterUnit: 'ER',
          },
        ],
        highlightedZone: 'ER',
      },
    },
  ],
}

/**
 * Scenario 2: Room Turnover
 */
export const roomTurnoverScenario = {
  id: 'room_turnover',
  name: 'Room Turnover',
  description: 'Room lifecycle from occupied to dirty to available',
  durationSeconds: 60,
  totalSteps: 3,
  focusRoom: 'ROOM_012', // ER-12
  steps: [
    {
      step: 1,
      at: 0,
      narrative: 'This room is currently occupied by an active patient.',
      updates: {
        rooms: {
          'ROOM_012': {
            status: 'occupied',
            admitted_at_iso: toAdmittedAtIso(180), // 3 hours ago
            patient_name: 'Sarah Johnson',
            doctor: 'Dr. Martinez',
          },
        },
        focusRoom: 'ROOM_012',
      },
    },
    {
      step: 2,
      at: 20,
      narrative: 'The patient has been discharged and the room is now pending cleaning.',
      updates: {
        rooms: {
          'ROOM_012': {
            status: 'cleaning',
            predictedInMinutes: 25,
            patient_name: null,
            doctor: null,
          },
        },
        alerts: [
          {
            id: 'room-turnover',
            msg: 'Room awaiting turnover',
            severity: 'info',
            filterStatus: 'cleaning',
          },
        ],
        focusRoom: 'ROOM_012',
      },
    },
    {
      step: 3,
      at: 45,
      narrative: 'Room turnover is complete and the room is ready for the next patient.',
      updates: {
        rooms: {
          'ROOM_012': {
            status: 'available',
            predictedInMinutes: null,
          },
        },
        alerts: [],
        focusRoom: 'ROOM_012',
      },
    },
  ],
}

/**
 * Scenario 3: Ambulance Inbound
 */
export const ambulanceInboundScenario = {
  id: 'ambulance_inbound',
  name: 'Ambulance Inbound',
  description: 'Inbound ambulance traffic creates near-future ER demand',
  durationSeconds: 75,
  totalSteps: 3,
  steps: [
    {
      step: 1,
      at: 0,
      narrative: 'ER operations are stable with no unusual inbound activity.',
      updates: {
        inboundArrivals: {
          ambulanceCount: 0,
          estimatedPatients: 0,
          etaMin: 0,
          etaMax: 0,
          impact: 'Low',
        },
      },
    },
    {
      step: 2,
      at: 20,
      narrative: 'Two ambulances are inbound and expected demand is rising.',
      updates: {
        inboundArrivals: {
          ambulanceCount: 2,
          estimatedPatients: 3,
          etaMin: 6,
          etaMax: 12,
          impact: 'Medium',
        },
        alerts: [
          {
            id: 'ambulance-inbound',
            msg: 'Inbound ambulance traffic detected',
            severity: 'info',
            filterUnit: 'ER',
          },
        ],
        highlightedZone: 'ER',
      },
    },
    {
      step: 3,
      at: 50,
      narrative: 'Inbound ambulance volume may push ER utilization higher in the next few minutes.',
      updates: {
        inboundArrivals: {
          ambulanceCount: 4,
          estimatedPatients: 6,
          etaMin: 3,
          etaMax: 8,
          impact: 'High',
        },
        departmentPressure: {
          unit: 'ER',
          level: 'watch',
          score: 0.68,
        },
        alerts: [
          {
            id: 'prepare-intake',
            msg: 'Prepare ER intake capacity',
            severity: 'warning',
            filterUnit: 'ER',
          },
        ],
        highlightedZone: 'ER',
      },
    },
  ],
}

/**
 * All available scenarios
 */
export const demoScenarios = [
  erOvercrowdingScenario,
  roomTurnoverScenario,
  ambulanceInboundScenario,
]

/**
 * Get scenario by ID
 */
export function getScenarioById(scenarioId) {
  return demoScenarios.find((s) => s.id === scenarioId) || null
}
