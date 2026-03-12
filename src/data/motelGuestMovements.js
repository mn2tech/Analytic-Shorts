/**
 * Guest movement history for motel flow tracking.
 * Tracks guest journey: check-in, check-out, room change.
 */
export const guestMovements = [
  {
    guestId: 'G001',
    name: 'Emma Thompson',
    events: [
      { time: '08:15', from: null, to: 'ROOM_003', action: 'check_in' },
      { time: '10:30', from: 'ROOM_003', to: 'ROOM_015', action: 'room_change' },
      { time: '14:00', from: 'ROOM_015', to: null, action: 'check_out' },
    ],
  },
  {
    guestId: 'G002',
    name: 'Liam O\'Brien',
    events: [
      { time: '08:45', from: null, to: 'ROOM_006', action: 'check_in' },
      { time: '11:00', from: 'ROOM_006', to: 'ROOM_022', action: 'room_change' },
    ],
  },
  {
    guestId: 'G003',
    name: 'Sofia Rodriguez',
    events: [
      { time: '09:00', from: null, to: 'ROOM_009', action: 'check_in' },
      { time: '12:15', from: 'ROOM_009', to: 'ROOM_028', action: 'room_change' },
    ],
  },
  {
    guestId: 'G004',
    name: 'Noah Kim',
    events: [
      { time: '07:30', from: null, to: 'ROOM_001', action: 'check_in' },
      { time: '11:45', from: 'ROOM_001', to: null, action: 'check_out' },
    ],
  },
  {
    guestId: 'G005',
    name: 'Olivia Patel',
    events: [
      { time: '10:00', from: null, to: 'ROOM_010', action: 'check_in' },
    ],
  },
  {
    guestId: 'G006',
    name: 'Ethan Martinez',
    events: [
      { time: '08:00', from: null, to: 'ROOM_023', action: 'check_in' },
      { time: '10:30', from: 'ROOM_023', to: 'ROOM_037', action: 'room_change' },
    ],
  },
  {
    guestId: 'G007',
    name: 'Ava Chen',
    events: [
      { time: '06:30', from: null, to: 'ROOM_027', action: 'check_in' },
      { time: '12:00', from: 'ROOM_027', to: null, action: 'check_out' },
    ],
  },
  {
    guestId: 'G008',
    name: 'Mason Williams',
    events: [
      { time: '09:15', from: null, to: 'ROOM_004', action: 'check_in' },
      { time: '11:30', from: 'ROOM_004', to: 'ROOM_016', action: 'room_change' },
    ],
  },
  {
    guestId: 'G009',
    name: 'Isabella Foster',
    events: [
      { time: '07:50', from: null, to: 'ROOM_007', action: 'check_in' },
    ],
  },
  {
    guestId: 'G010',
    name: 'James Wilson',
    events: [
      { time: '08:20', from: null, to: 'ROOM_005', action: 'check_in' },
      { time: '14:00', from: 'ROOM_005', to: null, action: 'check_out' },
    ],
  },
  {
    guestId: 'G011',
    name: 'Charlotte Davis',
    events: [
      { time: '09:00', from: null, to: 'ROOM_018', action: 'check_in' },
      { time: '13:30', from: 'ROOM_018', to: 'ROOM_041', action: 'room_change' },
    ],
  },
]

function parseTime(t) {
  if (!t) return 0
  const [h, m] = String(t).split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function getGuestLocationAtTime(guest, selectedTime) {
  if (!guest?.events?.length) return null
  const sel = parseTime(selectedTime)
  const past = guest.events.filter((e) => parseTime(e.time) <= sel)
  const lastEvent = past[past.length - 1]
  if (!lastEvent) return null
  const nextEvent = guest.events.find((e) => parseTime(e.time) > sel)
  return {
    guestId: guest.guestId,
    name: guest.name,
    room: lastEvent.to,
    previous: lastEvent.from,
    next: nextEvent?.to ?? null,
    nextTime: nextEvent?.time ?? null,
    lastEvent,
    nextEvent,
  }
}

export function getGuestInRoomAtTime(roomId, selectedTime) {
  for (const g of guestMovements) {
    const loc = getGuestLocationAtTime(g, selectedTime)
    if (loc?.room === roomId) return { ...loc, guest: g }
  }
  return null
}

export function getTransfersInTimeWindow(prevTime, currTime) {
  if (!currTime) return []
  const prev = parseTime(prevTime)
  const curr = parseTime(currTime)
  if (curr <= prev) return []
  const result = []
  for (const g of guestMovements) {
    for (const e of g.events) {
      const et = parseTime(e.time)
      if (et > prev && et <= curr && e.from && e.to) {
        result.push({
          id: `${g.guestId}-${e.time.replace(':', '-')}`,
          guestId: g.guestId,
          name: g.name,
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

export function getRoomCenter(roomOverlay) {
  if (!roomOverlay) return null
  const w = roomOverlay.width ?? 50
  const h = roomOverlay.height ?? 50
  return { x: roomOverlay.x + w / 2, y: roomOverlay.y + h / 2 }
}

export function getTransferRoomsAtTime(selectedTime) {
  const sel = parseTime(selectedTime)
  const rooms = new Set()
  for (const g of guestMovements) {
    for (const e of g.events) {
      if (parseTime(e.time) === sel && (e.from || e.to)) {
        if (e.from) rooms.add(e.from)
        if (e.to) rooms.add(e.to)
      }
    }
  }
  return rooms
}

export function getTransferCountsAtTime(selectedTime) {
  const sel = parseTime(selectedTime || '23:59')
  const counts = { checkIns: 0, checkOuts: 0, roomChanges: 0 }
  for (const g of guestMovements) {
    for (const e of g.events) {
      if (parseTime(e.time) > sel) break
      if (e.action === 'check_in') counts.checkIns++
      else if (e.action === 'check_out') counts.checkOuts++
      else if (e.action === 'room_change') counts.roomChanges++
    }
  }
  return counts
}
