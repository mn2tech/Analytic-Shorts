const GUEST_BLOCK_SIZE = 3000

function readUInt16LE(bytes, offset) {
  if (offset + 2 > bytes.length) return 0
  return bytes[offset] | (bytes[offset + 1] << 8)
}

function readUTF16String(buffer, offset) {
  try {
    const view = new DataView(buffer)
    const length = view.getUint16(offset, true)
    if (length === 0 || length > 100) return ''
    let text = ''
    for (let i = 0; i < length; i += 1) {
      const charOffset = offset + 2 + i * 2
      if (charOffset + 1 >= buffer.byteLength) break
      const code = view.getUint16(charOffset, true)
      if (code === 0) break
      if (code >= 32 && code <= 126) text += String.fromCharCode(code)
    }
    return text.trim()
  } catch {
    return ''
  }
}

function parseGuestBlocks(buffer) {
  const guests = {}
  for (let base = 0; base < 57000; base += GUEST_BLOCK_SIZE) {
    if (base + GUEST_BLOCK_SIZE > buffer.byteLength) break
    const firstName = readUTF16String(buffer, base + 106)
    const lastName = readUTF16String(buffer, base + 158)
    if (!firstName || !lastName) continue
    const key = `${lastName}, ${firstName}`
    guests[key] = {
      first_name: firstName,
      last_name: lastName,
      source: readUTF16String(buffer, base + 210),
      address: readUTF16String(buffer, base + 292),
      city: readUTF16String(buffer, base + 496),
      state: readUTF16String(buffer, base + 548),
      country: readUTF16String(buffer, base + 560),
      zip: readUTF16String(buffer, base + 612),
      phone: readUTF16String(buffer, base + 634),
      email: readUTF16String(buffer, base + 666),
      rate: readUTF16String(buffer, base + 768),
      check_in: readUTF16String(buffer, base + 1688),
      check_out: readUTF16String(buffer, base + 1710),
      room_number: readUTF16String(buffer, base + 1744),
    }
  }
  return guests
}

function parseRoomMap(buffer, guests) {
  const rooms = []
  for (let base = 55000; base < buffer.byteLength - 300; base += 1000) {
    const roomNum = readUTF16String(buffer, base + 106)
    const roomType = readUTF16String(buffer, base + 116)
    const guestName = readUTF16String(buffer, base + 180)
    const unavailDt = readUTF16String(buffer, base + 158)
    if (!roomNum || Number.isNaN(Number.parseInt(roomNum, 10))) continue
    const rn = Number.parseInt(roomNum, 10)
    if (rn < 100 || rn > 999) continue
    const guestData = guests[guestName] || null
    const isUnavail = unavailDt && unavailDt.includes('/')
    const status = guestName ? 'occupied' : isUnavail ? 'unavailable' : 'available'
    rooms.push({
      room_number: roomNum,
      room_type: roomType,
      status,
      guest_name: guestName || null,
      unavail_until: isUnavail ? unavailDt : null,
      guest: guestData,
    })
  }
  return rooms.sort((a, b) => Number.parseInt(a.room_number, 10) - Number.parseInt(b.room_number, 10))
}

function toDateOnly(value) {
  const s = String(value || '').trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addOneCalendarDay(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d, 12, 0, 0)
  dt.setDate(dt.getDate() + 1)
  const year = dt.getFullYear()
  const month = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizedCheckoutIso(checkInRaw, checkOutRaw) {
  const inIso = toDateOnly(checkInRaw)
  const outIso = toDateOnly(checkOutRaw)
  if (!inIso) return outIso
  if (!outIso || outIso <= inIso) return addOneCalendarDay(inIso)
  return outIso
}

function isoToMdY(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [, m, d] = iso.split('-')
  const y = iso.slice(0, 4)
  return `${m}/${d}/${y}`
}

function parseRate(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const num = Number(raw.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(num) ? num : null
}

function parseDateDisplay(value) {
  const text = String(value || '').trim()
  if (!text) return null
  const slashOrDash = text.match(/\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}[\/.-]\d{1,2}[\/.-]\d{1,2})\b/)
  if (slashOrDash?.[1]) return slashOrDash[1].replace(/\./g, '/').replace(/-/g, '/')
  const compact = text.match(/\b(\d{8})\b/)
  if (compact?.[1]) {
    const raw = compact[1]
    return `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`
  }
  return text
}

function parseSourceDisplay(value) {
  const text = String(value || '').trim()
  if (!text) return null
  const source = text.match(/[A-Z0-9.-]+\.[A-Z]{2,}(?:\.[A-Z]{2,})?/i)?.[0]
  return source ? source.toUpperCase() : text.toUpperCase()
}

function formatRateLabel(rate) {
  const numeric = parseRate(rate)
  if (numeric == null) return null
  return `$${numeric.toFixed(2)}/night`
}

function buildPreviewModel(dtaBytes) {
  const buffer = dtaBytes.buffer.slice(dtaBytes.byteOffset, dtaBytes.byteOffset + dtaBytes.byteLength)
  const guestsByName = parseGuestBlocks(buffer)
  const guests = Object.values(guestsByName).map((guest) => ({
    firstName: guest.first_name || 'Guest',
    lastName: guest.last_name || 'Unknown',
    source: guest.source || null,
    address: guest.address || null,
    city: guest.city || null,
    state: guest.state || null,
    country: guest.country || null,
    zip: guest.zip || null,
    phone: guest.phone || null,
    email: guest.email || null,
    rate: guest.rate || null,
    checkIn: guest.check_in || null,
    checkOut: guest.check_out || null,
    roomNumber: guest.room_number || null,
  }))
  const rooms = parseRoomMap(buffer, guestsByName)
  const mergedRooms = rooms.map((room) => {
    const guest = room.guest
    const checkoutIso = guest ? normalizedCheckoutIso(guest.check_in, guest.check_out) : null
    return {
      roomNumber: room.room_number,
      roomType: room.room_type || null,
      status: room.status,
      guest_name: room.guest_name || null,
      guestName: room.guest_name || null,
      source: parseSourceDisplay(guest?.source),
      rate: formatRateLabel(guest?.rate),
      checkIn: parseDateDisplay(guest?.check_in),
      checkOut: isoToMdY(checkoutIso) || parseDateDisplay(guest?.check_out),
      unavailableDate: room.unavail_until || null,
      guest,
    }
  })

  const occupied = mergedRooms.filter((r) => r.status === 'occupied').length
  const unavailable = mergedRooms.filter((r) => r.status === 'unavailable').length
  const available = mergedRooms.length - occupied - unavailable
  return {
    rooms: mergedRooms,
    guests,
    summary: {
      totalRooms: mergedRooms.length,
      occupied,
      available,
      guests: Object.keys(guestsByName).length,
    },
  }
}

async function decompressEntry(method, bytes) {
  if (method === 0) return bytes
  if (method !== 8) throw new Error(`Unsupported ZIP compression method: ${method}`)
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('ZIP import requires browser DecompressionStream support')
  }
  const tryFormat = async (format) => {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format))
    const decompressed = await new Response(stream).arrayBuffer()
    return new Uint8Array(decompressed)
  }
  try {
    return await tryFormat('deflate-raw')
  } catch {
    return await tryFormat('deflate')
  }
}

function findEocdOffset(zipBytes) {
  for (let i = zipBytes.length - 22; i >= Math.max(0, zipBytes.length - 65557); i -= 1) {
    if (zipBytes[i] === 0x50 && zipBytes[i + 1] === 0x4b && zipBytes[i + 2] === 0x05 && zipBytes[i + 3] === 0x06) return i
  }
  return -1
}

async function extractTodayDtaFromZip(file) {
  const zipBytes = new Uint8Array(await file.arrayBuffer())
  const eocdOffset = findEocdOffset(zipBytes)
  if (eocdOffset < 0) throw new Error('Invalid ZIP file: EOCD marker not found.')

  const centralDirectorySize = readUInt16LE(zipBytes, eocdOffset + 12) | (readUInt16LE(zipBytes, eocdOffset + 14) << 16)
  const centralDirectoryOffset = readUInt16LE(zipBytes, eocdOffset + 16) | (readUInt16LE(zipBytes, eocdOffset + 18) << 16)
  const centralEnd = centralDirectoryOffset + centralDirectorySize
  let cursor = centralDirectoryOffset

  while (cursor + 46 <= centralEnd && cursor + 46 <= zipBytes.length) {
    if (zipBytes[cursor] !== 0x50 || zipBytes[cursor + 1] !== 0x4b || zipBytes[cursor + 2] !== 0x01 || zipBytes[cursor + 3] !== 0x02) break

    const method = readUInt16LE(zipBytes, cursor + 10)
    const compressedSize = readUInt16LE(zipBytes, cursor + 20) | (readUInt16LE(zipBytes, cursor + 22) << 16)
    const fileNameLen = readUInt16LE(zipBytes, cursor + 28)
    const extraLen = readUInt16LE(zipBytes, cursor + 30)
    const commentLen = readUInt16LE(zipBytes, cursor + 32)
    const localHeaderOffset = readUInt16LE(zipBytes, cursor + 42) | (readUInt16LE(zipBytes, cursor + 44) << 16)
    const fileNameStart = cursor + 46
    const fileName = new TextDecoder('utf-8').decode(zipBytes.slice(fileNameStart, fileNameStart + fileNameLen))
    const normalized = fileName.replace(/\\/g, '/').toLowerCase()

    if (normalized.endsWith('/today.dta') || normalized === 'today.dta') {
      if (zipBytes[localHeaderOffset] !== 0x50 || zipBytes[localHeaderOffset + 1] !== 0x4b || zipBytes[localHeaderOffset + 2] !== 0x03 || zipBytes[localHeaderOffset + 3] !== 0x04) {
        throw new Error('Invalid ZIP local header for TODAY.DTA.')
      }
      const localNameLen = readUInt16LE(zipBytes, localHeaderOffset + 26)
      const localExtraLen = readUInt16LE(zipBytes, localHeaderOffset + 28)
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen
      const compressed = zipBytes.slice(dataStart, dataStart + compressedSize)
      return decompressEntry(method, compressed)
    }

    cursor += 46 + fileNameLen + extraLen + commentLen
  }

  throw new Error('TODAY.DTA not found inside ZIP backup.')
}

async function parseUploadedInnsoftFile(file) {
  const name = String(file?.name || '').toLowerCase()
  if (name.endsWith('.zip')) {
    const todayBytes = await extractTodayDtaFromZip(file)
    return buildPreviewModel(todayBytes)
  }
  if (name.endsWith('.dta')) {
    const dtaBytes = new Uint8Array(await file.arrayBuffer())
    return buildPreviewModel(dtaBytes)
  }
  throw new Error('Unsupported file. Upload a .ZIP backup or .DTA file.')
}

function buildRoomRows(previewRooms) {
  const roomMap = new Map()
  previewRooms.forEach((room) => {
    const roomNumber = String(room.roomNumber || '').trim()
    if (!roomNumber) return
    roomMap.set(roomNumber, {
      room_number: roomNumber,
      room_type: room.roomType || null,
      status: room.status || 'available',
      rate_per_night: parseRate(room.rate),
    })
  })
  return Array.from(roomMap.values())
}

async function persistInnsoftImport(previewData, supabaseClient) {
  const roomRows = buildRoomRows(previewData.rooms)
  if (roomRows.length === 0) {
    throw new Error('No valid rooms found in import file.')
  }

  const { error: upsertRoomsError } = await supabaseClient.from('rooms').upsert(roomRows, { onConflict: 'room_number' })
  if (upsertRoomsError) throw upsertRoomsError

  const roomNumbers = roomRows.map((room) => room.room_number)
  const { data: insertedRooms, error: fetchRoomsError } = await supabaseClient
    .from('rooms')
    .select('id, room_number')
    .in('room_number', roomNumbers)
  if (fetchRoomsError) throw fetchRoomsError

  const roomIdByNumber = new Map((insertedRooms || []).map((room) => [room.room_number, room.id]))
  const guestRows = previewData.guests.map((guest) => ({
    first_name: guest.firstName || 'Guest',
    last_name: guest.lastName || 'Unknown',
    email: guest.email || null,
    phone: guest.phone || null,
    address: guest.address || null,
    city: guest.city || null,
    state: guest.state || null,
    zip: guest.zip || null,
    country: guest.country || null,
  }))

  let insertedGuests = []
  if (guestRows.length > 0) {
    const { data, error: insertGuestsError } = await supabaseClient.from('guests').insert(guestRows).select('id, first_name, last_name')
    if (insertGuestsError) throw insertGuestsError
    insertedGuests = data || []
  }

  const insertedGuestIds = insertedGuests.map((g) => g.id)
  const reservationRows = previewData.guests
    .map((guest, index) => {
      const roomId = roomIdByNumber.get(String(guest.roomNumber || '').trim())
      const guestId = insertedGuestIds[index]
      if (!roomId || !guestId) return null
      return {
        room_id: roomId,
        guest_id: guestId,
        check_in_date: toDateOnly(guest.checkIn),
        check_out_date: normalizedCheckoutIso(guest.checkIn, guest.checkOut),
        status: 'checked_in',
        rate_per_night: parseRate(guest.rate),
        source: guest.source || 'innsoft_import',
      }
    })
    .filter(Boolean)

  if (reservationRows.length > 0) {
    const { error: insertReservationsError } = await supabaseClient.from('reservations').insert(reservationRows)
    if (insertReservationsError) throw insertReservationsError
  }

  return {
    roomsUpserted: roomRows.length,
    guestsInserted: guestRows.length,
    reservationsInserted: reservationRows.length,
  }
}

export {
  parseUploadedInnsoftFile,
  persistInnsoftImport,
  buildPreviewModel,
}

export default {
  parseUploadedInnsoftFile,
  persistInnsoftImport,
  buildPreviewModel,
}
