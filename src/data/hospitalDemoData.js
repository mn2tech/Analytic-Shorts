/**
 * Demo/mock data generators for Hospital Command Center.
 * Supports waiting room queue, ambulance arrivals, patient transfers, pressure by hour.
 * Hooked into timeline playback.
 */
import { getWaitingRoomMetricsAtTime } from './patientMovements'

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

  // Find next likely available room (has predicted availability)
  let nextAvailableRoom = null
  let nextAvailableInMinutes = null
  const erRooms = (roomOverlays || []).filter(
    (r) => r.unit === 'ER' && r.id?.startsWith('ROOM_') && !r.id.includes('ROOM_011')
  )
  let minMins = Infinity
  erRooms.forEach((r) => {
    const data = roomStatusMap[r.id]
    const pred = data?.predictedInMinutes ?? data?.predicted_in_minutes
    if (pred != null && pred < minMins) {
      minMins = pred
      nextAvailableRoom = r.id?.replace(/^ROOM_/, 'ER-') ?? r.id
      nextAvailableInMinutes = pred
    }
  })
  if (!nextAvailableRoom && erRooms.length > 0) {
    // Fallback: first available or first cleaning
    const avail = erRooms.find((r) => roomStatusMap[r.id]?.status === 'available')
    const cleaning = erRooms.find((r) => roomStatusMap[r.id]?.status === 'cleaning')
    if (avail) {
      nextAvailableRoom = avail.id?.replace(/^ROOM_/, 'ER-')
      nextAvailableInMinutes = 0
    } else if (cleaning) {
      nextAvailableRoom = cleaning.id?.replace(/^ROOM_/, 'ER-')
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
    nextAvailableRoom: nextAvailableRoom ?? 'ER-012',
    nextAvailableInMinutes: nextAvailableInMinutes ?? 11,
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
