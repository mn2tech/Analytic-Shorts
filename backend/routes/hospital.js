/**
 * Hospital Command Center API
 * GET /api/hospital/rooms/status - Returns room status for blueprint floor map
 */
const express = require('express')
const router = express.Router()

// Room IDs from FloorMap AI export (ROOM_001 through ROOM_079)
const ALL_ROOMS = Array.from({ length: 79 }, (_, i) => `ROOM_${String(i + 1).padStart(3, '0')}`)

const STATUSES = ['available', 'occupied', 'cleaning', 'reserved']
const SAMPLE_PATIENTS = [
  'Emma Thompson', 'Liam O\'Brien', 'Sofia Rodriguez', 'Noah Kim', 'Olivia Patel',
  'Ethan Martinez', 'Ava Chen', 'Mason Williams', 'Isabella Garcia', 'Lucas Johnson',
  'Mia Anderson', 'Alexander Taylor', 'Charlotte Lee', 'James Wilson', 'Amelia Brown',
  'Benjamin Davis', 'Harper Moore', 'Henry Thomas', 'Evelyn Jackson', 'Sebastian White',
  'Abigail Harris', 'Jack Martin', 'Elizabeth Clark', 'Aiden Lewis', 'Emily Robinson',
  'Samuel Walker', 'Ella Young', 'Joseph Hall', 'Scarlett Allen', 'David King',
  'Chloe Wright', 'Daniel Scott', 'Victoria Green', 'Matthew Adams', 'Grace Baker',
  'Andrew Nelson', 'Zoey Mitchell', 'Nathan Roberts', 'Lily Evans', 'Owen Phillips',
]
const SAMPLE_DOCTORS = [
  'Dr. Sarah Patel', 'Dr. Michael Chen', 'Dr. Elena Rodriguez', 'Dr. David Kim', 'Dr. Jennifer Thompson',
  'Dr. James Adams', 'Dr. Rachel Foster', 'Dr. Daniel Hayes', 'Dr. Amanda Morgan', 'Dr. Carlos Rivera',
  'Dr. Nicole Bennett', 'Dr. Kevin Hughes', 'Dr. Laura Coleman', 'Dr. Paul Sullivan', 'Dr. Megan Brooks',
  'Dr. Ryan Phillips', 'Dr. Christina Lee', 'Dr. Andrew Walker', 'Dr. Jessica Martinez', 'Dr. Brandon Scott',
  'Dr. Hannah Wilson', 'Dr. Tyler Brown', 'Dr. Ashley Davis', 'Dr. Justin Moore', 'Dr. Samantha Taylor',
]
/** Realistic admission times (hour, minute). LOS computed dynamically from current time. */
const MOCK_ADMISSION_TIMES = [
  { hour: 6, minute: 20 }, { hour: 7, minute: 45 }, { hour: 8, minute: 15 }, { hour: 9, minute: 0 },
  { hour: 9, minute: 42 }, { hour: 10, minute: 30 }, { hour: 11, minute: 0 }, { hour: 11, minute: 42 },
  { hour: 12, minute: 20 }, { hour: 13, minute: 5 }, { hour: 13, minute: 50 }, { hour: 14, minute: 18 },
  { hour: 15, minute: 0 }, { hour: 15, minute: 45 }, { hour: 16, minute: 30 }, { hour: 17, minute: 15 },
  { hour: 18, minute: 0 }, { hour: 19, minute: 20 }, { hour: 5, minute: 30 }, { hour: 20, minute: 10 },
]
/** Pressure demo rooms - use mins-ago so LOS stays in target band. */
const DEMO_LOS = { ROOM_006: 25, ROOM_009: 95, ROOM_027: 220, ROOM_023: 320, ROOM_038: 360 }

function pick(arr, roomId, index) {
  let h = 0
  for (let i = 0; i < roomId.length; i++) h = ((h << 5) - h) + roomId.charCodeAt(i)
  return arr[Math.abs((h + index) % arr.length)]
}

function hashRoom(roomId, index) {
  let h = 0
  for (let i = 0; i < roomId.length; i++) h = ((h << 5) - h) + roomId.charCodeAt(i)
  return Math.abs((h + index) % MOCK_ADMISSION_TIMES.length)
}

function getAdmittedAtIsoForRoom(roomId, index) {
  const i = hashRoom(roomId, index)
  const { hour, minute } = MOCK_ADMISSION_TIMES[i]
  const now = new Date()
  let admitted = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0)
  if (admitted.getTime() > now.getTime()) admitted.setDate(admitted.getDate() - 1)
  return admitted.toISOString()
}

// ROOM_011 is WAITING AREA on blueprint
const WAITING_ROOM_ID = 'ROOM_011'
// ER rooms for Door-to-Provider (D2P) metric - from FloorMap export
const ER_ROOM_IDS = new Set([
  'ROOM_001', 'ROOM_002', 'ROOM_003', 'ROOM_004', 'ROOM_005', 'ROOM_006', 'ROOM_007', 'ROOM_008', 'ROOM_009', 'ROOM_010',
  'ROOM_022', 'ROOM_023', 'ROOM_024', 'ROOM_027', 'ROOM_028', 'ROOM_030', 'ROOM_031', 'ROOM_032', 'ROOM_057', 'ROOM_064',
])
// Elevators, stairs, corridors, nurse stations, storage, lobby, lab - no occupancy; always available
const INFRASTRUCTURE_ROOM_IDS = new Set([
  'ROOM_011', 'ROOM_022', 'ROOM_026', 'ROOM_033', 'ROOM_034', 'ROOM_035', 'ROOM_036',
  'ROOM_048', 'ROOM_055', 'ROOM_056', 'ROOM_058', 'ROOM_063', 'ROOM_079',
  'ROOM_073', 'ROOM_078',
])

function toAdmittedAtIso(minutesAgo) {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString()
}

function formatAdmittedTime(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function hashForD2P(roomId) {
  let h = 0
  for (let i = 0; i < roomId.length; i++) h = ((h << 5) - h) + roomId.charCodeAt(i)
  return Math.abs(h % 100)
}

function generateMockRoomData(roomId, index) {
  const status = INFRASTRUCTURE_ROOM_IDS.has(roomId) || roomId === WAITING_ROOM_ID ? 'available' : STATUSES[index % 4]
  const isOccupied = status === 'occupied'
  const isReserved = status === 'reserved'
  const isWaitingRoom = roomId === WAITING_ROOM_ID
  const admittedAtIso = (isOccupied || isReserved)
    ? (DEMO_LOS[roomId] != null ? toAdmittedAtIso(DEMO_LOS[roomId]) : getAdmittedAtIsoForRoom(roomId, index))
    : null
  const admittedAt = admittedAtIso ? formatAdmittedTime(admittedAtIso) : null

  let arrivalTime = admittedAtIso
  let providerSeenTime = null
  if (isOccupied && ER_ROOM_IDS.has(roomId) && admittedAtIso) {
    arrivalTime = admittedAtIso
    // ~60% of ER occupied rooms have provider_seen_time (deterministic per room)
    if (hashForD2P(roomId) < 60) {
      const d2pMins = 15 + (hashForD2P(roomId + 'x') % 25)
      providerSeenTime = new Date(new Date(admittedAtIso).getTime() + d2pMins * 60_000).toISOString()
    }
  }

  return {
    room: roomId,
    status,
    patient_name: isOccupied ? pick(SAMPLE_PATIENTS, roomId, index) : (isReserved ? 'Incoming' : null),
    doctor: isOccupied || isReserved ? pick(SAMPLE_DOCTORS, roomId, index) : null,
    admitted_at: admittedAt,
    admitted_at_iso: admittedAtIso,
    ...(arrivalTime && { arrival_time: arrivalTime }),
    ...(providerSeenTime && { provider_seen_time: providerSeenTime }),
    ...(isWaitingRoom && { waiting_count: 12 }),
  }
}

let mockCache = null
let mockCacheTime = 0
const CACHE_MS = 2000

function getMockRoomStatuses() {
  const now = Date.now()
  if (mockCache && now - mockCacheTime < CACHE_MS) return mockCache
  mockCache = ALL_ROOMS.map((roomId, i) => {
    const data = generateMockRoomData(roomId, i)
    if (roomId === WAITING_ROOM_ID) return { ...data, waiting_count: 12 }
    return data
  })
  mockCacheTime = now
  return mockCache
}

/**
 * GET /api/hospital/rooms/status
 * Returns array of { room, status, patient_name?, doctor?, admitted_at? }
 * status: available | occupied | cleaning | reserved
 */
router.get('/rooms/status', (req, res) => {
  try {
    const data = getMockRoomStatuses()
    res.json(data)
  } catch (err) {
    console.error('Error in /api/hospital/rooms/status:', err)
    res.status(500).json({ error: 'Failed to fetch room status', message: err?.message })
  }
})

module.exports = router
