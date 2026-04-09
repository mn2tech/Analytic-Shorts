/**
 * Demo/mock data generators for Hospital Command Center.
 * Supports waiting room queue, ambulance arrivals, patient transfers, pressure by hour.
 * Hooked into timeline playback.
 */
import { getWaitingRoomMetricsAtTime } from './patientMovements'
import { INFRASTRUCTURE_ROOM_IDS, NON_PATIENT_ROOM_TYPES } from '../config/hospitalBedData'

/** Parse "HH:MM" to minutes since midnight */
function parseTime(t) {
  if (!t) return 0
  const [h, m] = String(t).split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/**
 * Waiting room summary - extended with next available room and urgency.
 */
export function getWaitingRoomSummaryAtTime(selectedTime, roomStatusMap = {}, roomOverlays = []) {
  const base = getWaitingRoomMetricsAtTime(selectedTime ?? '14:00')
  const time = selectedTime ?? '14:00'
  const isWaitingProviderRoom = (room, data) =>
    room?.unit === 'ER' &&
    data?.status === 'occupied' &&
    !data?.provider_seen_time
  const formatRoomLabel = (room) => {
    if (!room?.id) return '—'
    const n = room.id.replace(/^ROOM_/, '')
    if (room.unit === 'ER') return `ER-${n}`
    if (room.unit === 'General Ward') return `GW-${n}`
    if (room.unit === 'ICU') return `ICU-${n}`
    if (room.unit === 'OR') return `OR-${n}`
    return room.id
  }

  // Find next likely available room across patient-facing units.
  let nextAvailableRoom = null
  let nextAvailableInMinutes = null
  const candidateRooms = (roomOverlays || []).filter(
    (r) =>
      r.id?.startsWith('ROOM_') &&
      !INFRASTRUCTURE_ROOM_IDS.has(r.id) &&
      !NON_PATIENT_ROOM_TYPES.has(r.type) &&
      r.unit !== 'WAITING'
  )
  let minMins = Infinity
  candidateRooms.forEach((r) => {
    const data = roomStatusMap[r.id]
    if (isWaitingProviderRoom(r, data)) return
    const pred = data?.predictedInMinutes ?? data?.predicted_in_minutes
    if (pred != null && pred < minMins) {
      minMins = pred
      nextAvailableRoom = formatRoomLabel(r)
      nextAvailableInMinutes = pred
    }
  })
  if (!nextAvailableRoom && candidateRooms.length > 0) {
    // Fallback: first available or first cleaning
    const avail = candidateRooms.find((r) => {
      const data = roomStatusMap[r.id]
      return data?.status === 'available' && !isWaitingProviderRoom(r, data)
    })
    const cleaning = candidateRooms.find((r) => {
      const data = roomStatusMap[r.id]
      return data?.status === 'cleaning' && !isWaitingProviderRoom(r, data)
    })
    if (avail) {
      nextAvailableRoom = formatRoomLabel(avail)
      nextAvailableInMinutes = 0
    } else if (cleaning) {
      nextAvailableRoom = formatRoomLabel(cleaning)
      nextAvailableInMinutes = 25
    }
  }

  const totalWaiting = base.waitingCount
  const avgWaitMinutes = base.avgWaitMins
  const longestWaitMinutes = base.maxWaitMins
  const waitingForProvider = 0 // Could come from patient acuity if available

  // Urgency: Stable | Busy | Delayed | Overflow
  let urgency = 'Stable'
  if (totalWaiting >= 15 || longestWaitMinutes >= 120) urgency = 'Overflow'
  else if (totalWaiting >= 10 || longestWaitMinutes >= 90) urgency = 'Delayed'
  else if (totalWaiting >= 6 || longestWaitMinutes >= 60) urgency = 'Busy'

  return {
    totalWaiting,
    avgWaitMinutes,
    longestWaitMinutes,
    waitingForProvider,
    nextAvailableRoom: nextAvailableRoom ?? '—',
    nextAvailableInMinutes: nextAvailableInMinutes ?? 0,
    urgency,
  }
}

/**
 * Inbound ambulance arrivals - demo data varies by time.
 */
export function getInboundArrivalsAtTime(selectedTime) {
  const time = selectedTime ?? '14:00'
  const mins = parseTime(time)

  // Simulate higher inbound during morning/evening
  const isPeak = (mins >= 7 * 60 && mins <= 9 * 60) || (mins >= 16 * 60 && mins <= 19 * 60)
  const ambulanceCount = isPeak ? 4 : Math.max(1, (mins % 60) % 4)
  const estimatedPatients = Math.min(ambulanceCount + 1, 6)
  const etaMin = 3 + (mins % 5)
  const etaMax = etaMin + 8

  let impact = 'Low'
  if (ambulanceCount >= 4 || estimatedPatients >= 5) impact = 'High'
  else if (ambulanceCount >= 2 || estimatedPatients >= 3) impact = 'Medium'

  return {
    ambulanceCount,
    estimatedPatients,
    etaMin,
    etaMax,
    impact,
  }
}

/**
 * Patient transitions for movement animation - derived from patientMovements.
 */
export function getPatientTransitionsAtTime(selectedTime, prevTime, patientMovements) {
  if (!prevTime || !selectedTime) return []
  const prev = parseTime(prevTime)
  const curr = parseTime(selectedTime)
  if (curr <= prev) return []

  const transitions = []
  for (const p of patientMovements || []) {
    for (const e of p.events || []) {
      const et = parseTime(e.time)
      if (et > prev && et <= curr && e.from && e.to) {
        const fromDept = e.department === 'WAITING' ? 'WAITING' : e.from
        const toDept = e.to
        transitions.push({
          patientId: p.patientId,
          from: fromDept,
          to: toDept,
          startTime: prevTime,
          endTime: e.time,
          status: 'completed',
        })
      }
    }
  }
  return transitions
}
