import type { RoomStatus } from '../types/er'

export function getRoomFill(status: RoomStatus): string {
  switch (status) {
    case 'occupied':
      return 'rgba(239, 68, 68, 0.65)'
    case 'available':
      return 'rgba(34, 197, 94, 0.6)'
    case 'dirty':
      return 'rgba(234, 179, 8, 0.65)'
    case 'closed':
      return 'rgba(100, 116, 139, 0.55)'
    default:
      return 'rgba(148, 163, 184, 0.4)'
  }
}

export function getRoomStroke(isSelected: boolean, isHovered: boolean): string {
  if (isSelected) return 'rgba(59, 130, 246, 1)'
  if (isHovered) return 'rgba(255, 255, 255, 0.9)'
  return 'rgba(255, 255, 255, 0.5)'
}

export function getStatusText(status: RoomStatus): string {
  switch (status) {
    case 'occupied':
      return 'Occupied'
    case 'available':
      return 'Available'
    case 'dirty':
      return 'Dirty'
    case 'closed':
      return 'Closed'
    default:
      return status
  }
}

/** Solid color for legend, panel, badges */
export function getStatusColor(status: RoomStatus): string {
  const solid: Record<RoomStatus, string> = {
    occupied: '#ef4444',
    available: '#22c55e',
    dirty: '#eab308',
    closed: '#64748b',
  }
  return solid[status] ?? '#94a3b8'
}
