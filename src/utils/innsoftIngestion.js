import * as XLSX from 'xlsx'

const FIELD_ALIASES = {
  roomNumber: ['room number', 'room', 'room no', 'rm', 'unit', 'room #'],
  guestName: ['guest name', 'guest', 'name', 'guest full name'],
  arrivalDate: ['arrival date', 'arrival', 'check in', 'check-in', 'arrival dt'],
  departureDate: ['departure date', 'departure', 'check out', 'check-out', 'checkout'],
  roomStatus: ['room status', 'status', 'occupancy status'],
  housekeepingStatus: ['housekeeping status', 'hk status', 'housekeeping', 'cleaning status'],
  rate: ['rate', 'room rate', 'daily rate'],
  balance: ['balance', 'guest balance', 'folio balance'],
  notes: ['notes', 'remarks', 'comment', 'comments'],
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function buildHeaderLookup(row) {
  const lookup = {}
  Object.keys(row || {}).forEach((key) => {
    lookup[normalizeKey(key)] = key
  })
  return lookup
}

function pickField(row, headerLookup, aliases) {
  for (const alias of aliases) {
    const sourceKey = headerLookup[normalizeKey(alias)]
    if (sourceKey && row[sourceKey] != null && String(row[sourceKey]).trim() !== '') return row[sourceKey]
  }
  return null
}

function toDate(value) {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed?.y) return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0)
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function asIsoDate(value) {
  const d = toDate(value)
  return d ? d.toISOString() : null
}

function sameDay(a, b) {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function normalizeStatus(statusText) {
  const value = normalizeKey(statusText)
  if (!value) return null
  if (value.includes('out of order') || value.includes('maintenance')) return 'maintenance'
  if (value.includes('vacant dirty') || value === 'dirty') return 'dirty'
  if (value.includes('vacant clean') || value.includes('available') || value === 'vacant') return 'available'
  if (value.includes('occupied')) return 'occupied'
  if (value.includes('reserved') || value.includes('arrival')) return 'reserved'
  return null
}

function deriveStatus({ roomStatus, housekeepingStatus, arrivalDate, departureDate, notes, now }) {
  const fromRoomStatus = normalizeStatus(roomStatus)
  const fromHousekeeping = normalizeStatus(housekeepingStatus)
  const notesText = normalizeKey(notes)
  const arrival = toDate(arrivalDate)
  const departure = toDate(departureDate)

  if (notesText.includes('out of order')) return 'maintenance'
  if (fromRoomStatus) return fromRoomStatus
  if (fromHousekeeping) return fromHousekeeping
  if (departure && sameDay(departure, now)) return 'dirty'
  if (arrival && sameDay(arrival, now)) return 'reserved'
  return 'available'
}

function computeNights(checkInIso, checkOutIso) {
  const checkIn = toDate(checkInIso)
  const checkOut = toDate(checkOutIso)
  if (!checkIn || !checkOut) return 0
  const ms = checkOut.getTime() - checkIn.getTime()
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
}

function derivePriority({ status, checkOutIso, now, nights }) {
  const checkOut = toDate(checkOutIso)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  let label = 'LOW'
  let score = 1
  if (status === 'dirty' || (checkOut && sameDay(checkOut, now))) {
    label = 'HIGH'
    score = 3
  } else if (checkOut && sameDay(checkOut, tomorrow)) {
    label = 'MEDIUM'
    score = 2
  }

  // Longer stays are typically deeper turns and should be elevated in queue ordering.
  if (nights >= 5) score += 1
  return { label, score }
}

export async function parseInnsoftFile(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) return []
  const worksheet = workbook.Sheets[firstSheet]
  return XLSX.utils.sheet_to_json(worksheet, { defval: '' })
}

export function normalizeInnsoftRows(rows, opts = {}) {
  const now = opts.now || new Date()
  return (Array.isArray(rows) ? rows : [])
    .map((row, idx) => {
      const headerLookup = buildHeaderLookup(row)
      const roomNumber = String(pickField(row, headerLookup, FIELD_ALIASES.roomNumber) || '').trim()
      if (!roomNumber) return null
      const guestName = String(pickField(row, headerLookup, FIELD_ALIASES.guestName) || '').trim() || null
      const arrivalDate = pickField(row, headerLookup, FIELD_ALIASES.arrivalDate)
      const departureDate = pickField(row, headerLookup, FIELD_ALIASES.departureDate)
      const roomStatus = pickField(row, headerLookup, FIELD_ALIASES.roomStatus)
      const housekeepingStatus = pickField(row, headerLookup, FIELD_ALIASES.housekeepingStatus)
      const rate = pickField(row, headerLookup, FIELD_ALIASES.rate)
      const balance = pickField(row, headerLookup, FIELD_ALIASES.balance)
      const remarks = String(pickField(row, headerLookup, FIELD_ALIASES.notes) || '').trim() || null
      const checkIn = asIsoDate(arrivalDate)
      const checkOut = asIsoDate(departureDate)
      const status = deriveStatus({ roomStatus, housekeepingStatus, arrivalDate, departureDate, notes: remarks, now })
      const nights = computeNights(checkIn, checkOut)
      const priority = derivePriority({ status, checkOutIso: checkOut, now, nights })

      return {
        id: `innsoft-${idx}-${roomNumber}`,
        roomNumber,
        guestName,
        checkIn,
        checkOut,
        roomStatus: roomStatus ? String(roomStatus) : null,
        housekeepingStatus: housekeepingStatus ? String(housekeepingStatus) : null,
        status,
        priority: priority.label,
        priorityScore: priority.score,
        rate: rate ?? null,
        balance: balance ?? null,
        remarks,
        updatedAt: now.toISOString(),
        // Backward-compatible shape for existing map + metrics components.
        room: roomNumber,
        guest_name: guestName,
        check_in: checkIn,
        check_out: checkOut,
      }
    })
    .filter(Boolean)
}
