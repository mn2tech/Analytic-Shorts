/**
 * Zone/Department pressure calculation for Hospital Command Center.
 * pressure_score = (occupancy_pct * 0.4) + (waiting_provider_ratio * 0.2) +
 *                  (critical_ratio * 0.2) + (los_variance_ratio * 0.2)
 *
 * Thresholds: < 0.35 Normal | 0.35-0.55 Watch | 0.55-0.75 High | > 0.75 Critical
 */
import { calculateLOS, calculateAvgLOS, getRoomPressureLevel } from './losPressure'
import { INFRASTRUCTURE_ROOM_IDS, NON_PATIENT_ROOM_TYPES } from '../config/hospitalBedData'

export const PRESSURE_LEVELS = {
  normal: 'Normal',
  watch: 'Watch',
  high: 'High',
  critical: 'Critical',
}

const THRESHOLDS = {
  normal: 0.35,
  watch: 0.55,
  high: 0.75,
}

/** LOS targets by department (minutes) - used for los_variance_ratio */
const LOS_TARGETS = {
  ER: 180,
  'General Ward': 1440, // 24h
  OR: 120,
  ICU: 2880, // 48h
  WAITING: 60,
}

/**
 * Get pressure level from score.
 * @param {number} score - 0–1
 * @returns {'normal'|'watch'|'high'|'critical'}
 */
export function getPressureLevelFromScore(score) {
  if (score == null || score < 0) return 'normal'
  if (score >= THRESHOLDS.high) return 'critical'
  if (score >= THRESHOLDS.watch) return 'high'
  if (score >= THRESHOLDS.normal) return 'watch'
  return 'normal'
}

/**
 * Compute department summary and pressure score.
 * @param {object[]} rooms - Room status data
 * @param {Map<string, string>} roomIdToUnit - room id -> unit
 * @param {string} unit - ER | General Ward | OR | ICU | WAITING
 */
export function computeDepartmentPressure(rooms, roomIdToUnit, unit) {
  const departmentRooms = rooms.filter((r) => {
    const u = roomIdToUnit.get(r.room)
    return u === unit && !INFRASTRUCTURE_ROOM_IDS.has(r.room) && !NON_PATIENT_ROOM_TYPES.has(r.type)
  })

  const totalRooms = departmentRooms.length
  if (totalRooms === 0) {
    return {
      unit,
      totalRooms: 0,
      occupied: 0,
      available: 0,
      dirty: 0,
      reserved: 0,
      utilizationPct: 0,
      avgLOS: null,
      criticalCount: 0,
      waitingProviderCount: 0,
      pressureScore: 0,
      pressureLevel: 'normal',
    }
  }

  const occupied = departmentRooms.filter((r) => r.status === 'occupied').length
  const available = departmentRooms.filter((r) => r.status === 'available').length
  const dirty = departmentRooms.filter((r) => r.status === 'cleaning').length
  const reserved = departmentRooms.filter((r) => r.status === 'reserved').length
  const utilizationPct = totalRooms > 0 ? occupied / totalRooms : 0

  const avgLOS = calculateAvgLOS(departmentRooms)
  const losTarget = LOS_TARGETS[unit] ?? 240
  const losVarianceRatio = avgLOS != null && losTarget > 0
    ? Math.min(1, Math.max(0, (avgLOS - losTarget) / losTarget) * 0.5 + 0.5)
    : 0

  const waitingProviderCount = unit === 'ER'
    ? departmentRooms.filter((r) => r.status === 'occupied' && !r.provider_seen_time).length
    : 0
  const waitingProviderRatio = occupied > 0 ? waitingProviderCount / occupied : 0

  let criticalCount = 0
  departmentRooms.forEach((r) => {
    // Use getRoomPressureLevel to be consistent with visual display logic
    // This checks both explicit critical flag and LOS-based pressure level
    const { level } = getRoomPressureLevel(r)
    if (level === 'critical') {
      criticalCount++
    }
  })
  const criticalRatio = occupied > 0 ? criticalCount / occupied : 0

  const occupancyPct = utilizationPct
  const pressureScore = Math.min(
    1,
    occupancyPct * 0.4 +
      waitingProviderRatio * 0.2 +
      criticalRatio * 0.2 +
      losVarianceRatio * 0.2
  )
  const pressureLevel = getPressureLevelFromScore(pressureScore)

  return {
    unit,
    totalRooms,
    occupied,
    available,
    dirty,
    reserved,
    utilizationPct: Math.round(utilizationPct * 100),
    avgLOS,
    criticalCount,
    waitingProviderCount,
    pressureScore,
    pressureLevel,
  }
}

/**
 * Compute all department summaries for zone heat overlays.
 */
export function computeAllDepartmentPressures(rooms, roomIdToUnit) {
  const units = ['ER', 'General Ward', 'OR', 'ICU', 'WAITING']
  const result = {}
  units.forEach((u) => {
    result[u] = computeDepartmentPressure(rooms, roomIdToUnit, u)
  })
  return result
}
