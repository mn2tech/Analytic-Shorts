/**
 * Predictive Bed Map - Status colors for blueprint overlay
 * Same as edStatusColors for consistent visual language
 */

import type { RoomStatus } from '../types/predictiveRoom'

export const STATUS_FILL: Record<RoomStatus, string> = {
  occupied: 'rgba(220, 38, 38, 0.5)',   // red
  available: 'rgba(34, 197, 94, 0.5)',  // green
  dirty: 'rgba(234, 179, 8, 0.5)',      // yellow
  closed: 'rgba(107, 114, 128, 0.5)',   // gray
}

export const STATUS_LABEL: Record<RoomStatus, string> = {
  occupied: 'Occupied',
  available: 'Available',
  dirty: 'Dirty',
  closed: 'Closed',
}

/** Transparent fill for blueprint map overlay */
export function getStatusFill(status: RoomStatus): string {
  return STATUS_FILL[status] ?? 'rgba(107, 114, 128, 0.5)'
}

/** Solid color for status indicators (e.g. legend, panel) */
export function getStatusColor(status: RoomStatus): string {
  const solid: Record<RoomStatus, string> = {
    occupied: '#dc2626',
    available: '#22c55e',
    dirty: '#eab308',
    closed: '#6b7280',
  }
  return solid[status] ?? '#6b7280'
}
