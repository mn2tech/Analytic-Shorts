export type RoomStatus = 'occupied' | 'available' | 'dirty' | 'closed'

export interface RoomPrediction {
  predictedDischarge?: string
  predictedAvailableAt?: string
  predictedAvailableMinutes?: number
  predictedCleanMinutes?: number
}

export interface RoomState {
  roomId: string
  status: RoomStatus
  patientName?: string
  age?: number
  reasonForVisit?: string
  team?: string
  comments?: string
  critical?: boolean
  evsAssigned?: boolean
  congestionRisk?: 'low' | 'medium' | 'high'
  waitingCount?: number // For waiting area: number of patients waiting
  lastUpdated?: string
} & RoomPrediction

export interface RoomDef {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  type: 'room' | 'area'
}
