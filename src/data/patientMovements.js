/**
 * Patient movement history for flow tracking.
 * Tracks patient journey across ER → GW → OR → ICU.
 */
export const patientMovements = [
  {
    patientId: 'P001',
    name: 'Emma Thompson',
    events: [
      { time: '08:10', from: null, to: 'ROOM_003', department: 'ER', action: 'admitted' },
      { time: '10:45', from: 'ROOM_003', to: 'ROOM_012', department: 'GW', action: 'transfer' },
      { time: '14:20', from: 'ROOM_012', to: 'ROOM_037', department: 'OR', action: 'procedure' },
      { time: '16:10', from: 'ROOM_037', to: 'ROOM_038', department: 'ICU', action: 'post_op_transfer' },
    ],
  },
  {
    patientId: 'P002',
    name: 'Liam O\'Brien',
    events: [
      { time: '08:30', from: null, to: 'ROOM_006', department: 'ER', action: 'admitted' },
      { time: '11:00', from: 'ROOM_006', to: 'ROOM_013', department: 'GW', action: 'transfer' },
    ],
  },
  {
    patientId: 'P003',
    name: 'Sofia Rodriguez',
    events: [
      { time: '09:00', from: null, to: 'ROOM_009', department: 'ER', action: 'admitted' },
      { time: '12:15', from: 'ROOM_009', to: 'ROOM_014', department: 'GW', action: 'transfer' },
      { time: '15:00', from: 'ROOM_014', to: 'ROOM_043', department: 'OR', action: 'procedure' },
    ],
  },
  {
    patientId: 'P004',
    name: 'Noah Kim',
    events: [
      { time: '07:45', from: null, to: 'ROOM_001', department: 'ER', action: 'admitted' },
      { time: '09:30', from: 'ROOM_001', to: 'ROOM_015', department: 'GW', action: 'transfer' },
      { time: '11:45', from: 'ROOM_015', to: null, department: null, action: 'discharge' },
    ],
  },
  {
    patientId: 'P005',
    name: 'Olivia Patel',
    events: [
      { time: '10:00', from: null, to: 'ROOM_010', department: 'ER', action: 'admitted' },
    ],
  },
  {
    patientId: 'P006',
    name: 'Ethan Martinez',
    events: [
      { time: '08:00', from: null, to: 'ROOM_023', department: 'ER', action: 'admitted' },
      { time: '10:30', from: 'ROOM_023', to: 'ROOM_016', department: 'GW', action: 'transfer' },
      { time: '13:00', from: 'ROOM_016', to: 'ROOM_044', department: 'OR', action: 'procedure' },
      { time: '14:45', from: 'ROOM_044', to: 'ROOM_039', department: 'ICU', action: 'post_op_transfer' },
    ],
  },
  {
    patientId: 'P007',
    name: 'Ava Chen',
    events: [
      { time: '06:30', from: null, to: 'ROOM_027', department: 'ER', action: 'admitted' },
      { time: '08:15', from: 'ROOM_027', to: 'ROOM_017', department: 'GW', action: 'transfer' },
      { time: '12:00', from: null, to: null, department: null, action: 'discharge' },
    ],
  },
  {
    patientId: 'P008',
    name: 'Mason Williams',
    events: [
      { time: '09:15', from: null, to: 'ROOM_030', department: 'ER', action: 'admitted' },
      { time: '11:30', from: 'ROOM_030', to: 'ROOM_041', department: 'ICU', action: 'direct_admit' },
    ],
  },
  {
    patientId: 'P009',
    name: 'Isabella Foster',
    events: [
      { time: '07:50', from: null, to: 'WR01', department: 'WAITING', action: 'arrival' },
      { time: '08:25', from: 'WR01', to: 'ROOM_004', department: 'ER', action: 'roomed' },
      { time: '11:45', from: 'ROOM_004', to: 'ROOM_025', department: 'GW', action: 'transfer' },
    ],
  },
  {
    patientId: 'P010',
    name: 'James Wilson',
    events: [
      { time: '07:55', from: null, to: 'WR02', department: 'WAITING', action: 'arrival' },
      { time: '08:20', from: 'WR02', to: 'ROOM_005', department: 'ER', action: 'roomed' },
      { time: '11:10', from: 'ROOM_005', to: 'ROOM_016', department: 'GW', action: 'transfer' },
      { time: '14:00', from: 'ROOM_016', to: 'ROOM_043', department: 'OR', action: 'procedure' },
    ],
  },
  {
    patientId: 'P011',
    name: 'Charlotte Davis',
    events: [
      { time: '08:05', from: null, to: 'WR03', department: 'WAITING', action: 'arrival' },
      { time: '09:00', from: 'WR03', to: 'ROOM_007', department: 'ER', action: 'roomed' },
    ],
  },
]

/**
 * Get patient location at a given time.
 * @param {object} patient - { patientId, name, events }
 * @param {string} selectedTime - "HH:MM" format
 * @returns {{ patientId, department, room, previous, next, lastEvent }|null}
 */
export function getPatientLocationAtTime(patient, selectedTime) {
  if (!patient?.events?.length) return null
  const sel = parseTime(selectedTime)
  const past = patient.events.filter((e) => parseTime(e.time) <= sel)
  const lastEvent = past[past.length - 1]
  if (!lastEvent) return null

  const nextEvent = patient.events.find((e) => parseTime(e.time) > sel)
  return {
    patientId: patient.patientId,
    name: patient.name,
    department: lastEvent.department,
    room: lastEvent.to,
    previous: lastEvent.from,
    next: nextEvent?.to ?? null,
    nextTime: nextEvent?.time ?? null,
    lastEvent,
    nextEvent,
  }
}

/** Parse "HH:MM" to minutes since midnight for comparison */
export function parseTime(t) {
  if (!t) return 0
  const [h, m] = String(t).split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/**
 * Get patient in a room at given time.
 */
export function getPatientInRoomAtTime(roomId, selectedTime) {
  for (const p of patientMovements) {
    const loc = getPatientLocationAtTime(p, selectedTime)
    if (loc?.room === roomId) {
      const result = { ...loc, patient: p }
      if (loc.department === 'WAITING' && loc.lastEvent?.time) {
        result.waitMins = parseTime(selectedTime) - parseTime(loc.lastEvent.time)
        result.arrivalTime = loc.lastEvent.time
      }
      return result
    }
  }
  return null
}

/**
 * Get transfer events that occur in the time window (prevTime, selectedTime].
 * Used to trigger transfer animations when timeline advances.
 * Only returns room-to-room transfers (from and to must both be room IDs).
 */
export function getTransfersInTimeWindow(prevTime, currTime) {
  if (!currTime) return []
  const prev = parseTime(prevTime)
  const curr = parseTime(currTime)
  if (curr <= prev) return []
  const result = []
  for (const p of patientMovements) {
    for (const e of p.events) {
      const et = parseTime(e.time)
      if (et > prev && et <= curr && e.from && e.to) {
        result.push({
          id: `${p.patientId}-${e.time.replace(':', '-')}`,
          patientId: p.patientId,
          name: p.name,
          from: e.from,
          to: e.to,
          time: e.time,
          action: e.action,
        })
      }
    }
  }
  return result
}

/**
 * Get room center coordinates from overlay. Returns { x, y } in map viewBox units.
 */
export function getRoomCenter(roomOverlay) {
  if (!roomOverlay) return null
  const w = roomOverlay.width ?? 50
  const h = roomOverlay.height ?? 50
  return {
    x: roomOverlay.x + w / 2,
    y: roomOverlay.y + h / 2,
  }
}

/**
 * Get room IDs that had a transfer at exactly this time (for highlight animation).
 */
export function getTransferRoomsAtTime(selectedTime) {
  const sel = parseTime(selectedTime)
  const rooms = new Set()
  for (const p of patientMovements) {
    for (const e of p.events) {
      if (parseTime(e.time) === sel && (e.from || e.to)) {
        if (e.from) rooms.add(e.from)
        if (e.to) rooms.add(e.to)
      }
    }
  }
  return rooms
}

/**
 * Waiting room metrics at a given time.
 */
export function getWaitingRoomMetricsAtTime(selectedTime) {
  const time = selectedTime ?? '14:00'
  const sel = parseTime(time)

  let waitingCount = 0
  let totalWaitMins = 0
  let maxWaitMins = 0
  let pendingRoomAssignment = 0

  for (const p of patientMovements) {
    const loc = getPatientLocationAtTime(p, time)
    if (!loc) continue
    if (loc.department === 'WAITING' && loc.room) {
      waitingCount++
      const arrivedAt = loc.lastEvent?.time
      if (arrivedAt) {
        const waitMins = sel - parseTime(arrivedAt)
        totalWaitMins += waitMins
        if (waitMins > maxWaitMins) maxWaitMins = waitMins
      }
      if (loc.next) pendingRoomAssignment++
    }
  }

  const avgWaitMins = waitingCount > 0 ? Math.round(totalWaitMins / waitingCount) : 0
  return {
    waitingCount,
    avgWaitMins,
    maxWaitMins: maxWaitMins > 0 ? maxWaitMins : 0,
    pendingRoomAssignment,
  }
}

/**
 * Compute transfer counts up to selectedTime.
 */
export function getTransferCountsAtTime(selectedTime) {
  const sel = parseTime(selectedTime || '23:59')
  const counts = { wrToEr: 0, erToGw: 0, gwToOr: 0, orToIcu: 0, discharges: 0 }
  for (const p of patientMovements) {
    for (const e of p.events) {
      if (parseTime(e.time) > sel) break
      if (e.action === 'roomed' && e.department === 'ER') counts.wrToEr++
      else if (e.action === 'transfer' && e.department === 'GW') counts.erToGw++
      else if (e.action === 'procedure') counts.gwToOr++
      else if (e.action === 'post_op_transfer' || e.action === 'direct_admit') counts.orToIcu++
      else if (e.action === 'discharge') counts.discharges++
    }
  }
  return counts
}
