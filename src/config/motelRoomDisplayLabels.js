/**
 * Maps room_id (ROOM_XXX) to display numbers shown on the map (201, 203, etc.).
 * Edit this file to match the numbers printed on your physical blueprint.
 * All display numbers must be unique.
 *
 * Layout: sorted top-to-bottom, left-to-right by position.
 * 2xx = upper rows (second floor), 1xx = lower rows (first floor).
 */
export const ROOM_DISPLAY_LABELS = {
  ROOM_011: '201', ROOM_001: '202', ROOM_002: '203', ROOM_003: '204', ROOM_004: '205',
  ROOM_013: '206', ROOM_014: '207', ROOM_015: '208', ROOM_005: '209', ROOM_006: '210',
  ROOM_007: '211', ROOM_008: '212', ROOM_009: '213',
  ROOM_018: '214', ROOM_019: '215', ROOM_020: '216', ROOM_021: '217', ROOM_022: '218',
  ROOM_027: '219', ROOM_023: '220', ROOM_024: '221', ROOM_028: '222', ROOM_025: '223',
  ROOM_026: '224', ROOM_029: '225', ROOM_010: '226',
  ROOM_039: '101', ROOM_032: '102', ROOM_040: '103', ROOM_041: '104', ROOM_033: '105',
  ROOM_042: '106', ROOM_034: '107', ROOM_035: '108', ROOM_036: '109', ROOM_037: '110',
  ROOM_012: '111', ROOM_016: '112',
  ROOM_047: '113', ROOM_048: '114', ROOM_049: '115', ROOM_050: '116', ROOM_051: '117',
  ROOM_046: '118', ROOM_052: '119', ROOM_053: '120', ROOM_054: '121', ROOM_055: '122',
  ROOM_056: '123', ROOM_057: '124', ROOM_058: '125',
  ROOM_063: '126', ROOM_072: '127', ROOM_064: '128', ROOM_065: '129', ROOM_066: '130',
  ROOM_067: '131', ROOM_068: '132', ROOM_073: '133', ROOM_069: '134', ROOM_070: '135',
  ROOM_071: '136', ROOM_074: '137',
}

/** Get display label for a room. Prefers mapping, then overlay label, then stripped id. */
export function getRoomDisplayLabel(roomId, overlay = null) {
  if (roomId && ROOM_DISPLAY_LABELS[roomId]) return ROOM_DISPLAY_LABELS[roomId]
  if (overlay?.label) return String(overlay.label)
  if (roomId) return roomId.replace(/^ROOM_0?/, '') || roomId
  return '—'
}
