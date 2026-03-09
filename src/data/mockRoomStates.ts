/**
 * ER Command Map - Mock room states for all rooms
 * Future: Replace with REST API / WebSocket / HL7 feed
 */

import type { RoomState } from '../types/er'

export const MOCK_ROOM_STATES: RoomState[] = [
  { roomId: 'trauma1', status: 'occupied', patientName: 'Jane Smith', age: 45, reasonForVisit: 'MVA', team: 'Red', critical: true, lastUpdated: '2026-03-06T15:20:00Z' },
  { roomId: 'trauma2', status: 'available', lastUpdated: '2026-03-06T15:18:00Z' },
  { roomId: 'nurse_station', status: 'available', lastUpdated: '2026-03-06T15:20:00Z' },
  { roomId: 'tra01', status: 'occupied', patientName: 'Amy Davis', age: 28, reasonForVisit: 'Abdominal pain', team: 'Green', lastUpdated: '2026-03-06T15:17:00Z' },
  { roomId: 'er102', status: 'available', predictedAvailableMinutes: 45, lastUpdated: '2026-03-06T15:18:00Z' },
  { roomId: 'er103', status: 'dirty', evsAssigned: true, predictedCleanMinutes: 20, lastUpdated: '2026-03-06T15:10:00Z' },
  { roomId: 'er104', status: 'occupied', patientName: 'Susan Brown', age: 34, reasonForVisit: 'Laceration', team: 'Green', predictedAvailableMinutes: 25, lastUpdated: '2026-03-06T15:21:00Z' },
  { roomId: 'er105', status: 'occupied', patientName: 'David Wilson', age: 72, reasonForVisit: 'Stroke symptoms', team: 'Red', critical: true, lastUpdated: '2026-03-06T15:23:00Z' },
  { roomId: 'er106', status: 'closed', lastUpdated: '2026-03-06T14:00:00Z' },
  { roomId: 'er107', status: 'available', lastUpdated: '2026-03-06T15:19:00Z' },
  { roomId: 'er108', status: 'dirty', evsAssigned: false, predictedCleanMinutes: 35, lastUpdated: '2026-03-06T15:12:00Z' },
  { roomId: 'er109', status: 'occupied', patientName: 'John Doe', age: 68, reasonForVisit: 'Chest Pain', team: 'Blue', comments: 'Awaiting lab', critical: true, predictedAvailableMinutes: 60, lastUpdated: '2026-03-06T15:20:00Z' },
  { roomId: 'er109b', status: 'dirty', evsAssigned: true, predictedCleanMinutes: 15, lastUpdated: '2026-03-06T15:15:00Z' },
  { roomId: 'er110', status: 'available', lastUpdated: '2026-03-06T15:18:00Z' },
  { roomId: 'waiting_area', status: 'available', waitingCount: 12, lastUpdated: '2026-03-06T15:20:00Z' },
  { roomId: 'consult', status: 'dirty', evsAssigned: true, predictedCleanMinutes: 25, lastUpdated: '2026-03-06T15:12:00Z' },
  { roomId: 'supply', status: 'closed', lastUpdated: '2026-03-06T14:30:00Z' },
]
