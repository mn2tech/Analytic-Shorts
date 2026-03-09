/**
 * ER Command Map - Room definitions with SVG coordinates
 * Blueprint layout aligned to image: Trauma bays, Nurse Station, Triage, ER rooms, Waiting, Consult, Supply
 *
 * Room identification from blueprint image:
 * - Top: TRAUMA 1, TRAUMA 2 (two beds each), NURSE STATION (counter, monitors)
 * - Middle corridor: TRA 01 (triage, slightly wider), ER 102–110 (single bed each, ER 109B adjacent to 109)
 * - Bottom: WAITING AREA (chairs), CONSULT (desk, chairs), SUPPLY (shelving, cart)
 */

import type { RoomDef } from '../types/er'

/** Path to blueprint image - place your ER floor plan at public/images/er-blueprint.png */
export const ER_BLUEPRINT_IMAGE = '/images/er-blueprint.png'

/** ViewBox for blueprint image overlay - matches typical ER floor plan aspect ratio */
export const ER_BLUEPRINT_VIEWBOX = { width: 1200, height: 800 }

/**
 * Calibration - adjust if room overlays don't fit the blueprint image.
 * Tweak these values until overlays align with rooms in the image.
 * - offsetX/offsetY: shift overlay (positive = right/down)
 * - scaleX/scaleY: scale overlay (1.1 = 10% larger, 0.9 = 10% smaller)
 */
export const ER_CALIBRATION = {
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
}

/** Apply calibration to room coordinates */
export function calibrateRoom(def: RoomDef) {
  const { offsetX, offsetY, scaleX, scaleY } = ER_CALIBRATION
  return {
    ...def,
    x: def.x * scaleX + offsetX,
    y: def.y * scaleY + offsetY,
    width: def.width * scaleX,
    height: def.height * scaleY,
  }
}

export const ROOM_DEFS: RoomDef[] = [
  // Top section - Trauma bays and Nurse Station (aligned to blueprint bands)
  { id: 'trauma1', label: 'TRAUMA 1', x: 25, y: 25, width: 265, height: 215, type: 'room' },
  { id: 'trauma2', label: 'TRAUMA 2', x: 305, y: 25, width: 265, height: 215, type: 'room' },
  { id: 'nurse_station', label: 'NURSE STATION', x: 585, y: 25, width: 590, height: 215, type: 'area' },
  // Middle section - TRAA01 (wider) + ER 102-110 along central corridor (shifted left so ER 110 fits)
  { id: 'tra01', label: 'TRA 01', x: 25, y: 270, width: 140, height: 175, type: 'room' },
  { id: 'er102', label: 'ER 102', x: 170, y: 270, width: 88, height: 175, type: 'room' },
  { id: 'er103', label: 'ER 103', x: 263, y: 270, width: 88, height: 175, type: 'room' },
  { id: 'er104', label: 'ER 104', x: 356, y: 270, width: 88, height: 175, type: 'room' },
  { id: 'er105', label: 'ER 105', x: 449, y: 270, width: 88, height: 175, type: 'room' },
  { id: 'er106', label: 'ER 106', x: 542, y: 270, width: 88, height: 175, type: 'room' },
  { id: 'er107', label: 'ER 107', x: 635, y: 270, width: 88, height: 175, type: 'room' },
  { id: 'er108', label: 'ER 108', x: 728, y: 270, width: 88, height: 175, type: 'room' },
  { id: 'er109', label: 'ER 109', x: 821, y: 270, width: 88, height: 175, type: 'room' },
  { id: 'er109b', label: 'ER 109B', x: 914, y: 270, width: 88, height: 175, type: 'room' },
  { id: 'er110', label: 'ER 110', x: 1007, y: 270, width: 173, height: 175, type: 'room' },
  // Bottom section - Waiting, Consult, Supply
  { id: 'waiting_area', label: 'WAITING AREA', x: 25, y: 475, width: 485, height: 300, type: 'area' },
  { id: 'consult', label: 'CONSULT', x: 525, y: 475, width: 325, height: 300, type: 'room' },
  { id: 'supply', label: 'SUPPLY', x: 865, y: 475, width: 310, height: 300, type: 'area' },
]
