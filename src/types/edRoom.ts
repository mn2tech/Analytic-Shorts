/**
 * ED Bed Map - Room data types
 * Future-ready: replace mock with REST API / WebSocket / HL7 feed
 */

export type RoomStatus = 'occupied' | 'available' | 'dirty' | 'closed'

export interface RoomData {
  id: string
  label: string
  status: RoomStatus
  patientName?: string
  age?: number
  reasonForVisit?: string
  team?: string
  comments?: string
  critical?: boolean
  isolation?: boolean
  /** For waiting room: number of patients waiting */
  waitingCount?: number
  lastUpdated?: string
}
