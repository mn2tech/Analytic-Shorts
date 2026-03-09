const API_BASE = '/api'

/**
 * Upload floor plan image.
 * @param {File} file
 * @returns {Promise<{ filename: string; url: string; width: number; height: number }>}
 */
export async function uploadFloorplan(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/upload-floorplan`, {
    method: 'POST',
    body: form
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || res.statusText || 'Upload failed')
  }
  return res.json()
}

/**
 * Detect rooms in floor plan image using OpenCV.
 * @param {Object} params
 * @param {string} params.file_id - Upload file ID (from upload response)
 * @param {number} [params.image_width]
 * @param {number} [params.image_height]
 * @returns {Promise<{ rooms: import('../types/room').Room[] }>}
 */
export async function detectRooms({ file_id, image_width, image_height }) {
  const res = await fetch(`${API_BASE}/detect-rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id, image_width, image_height })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || res.statusText || 'Detection failed')
  }
  return res.json()
}

/**
 * Export map JSON (validates and returns final structure).
 * @param {Object} payload
 * @param {string} payload.file_id
 * @param {import('../types/room').Room[]} payload.rooms
 * @param {boolean} [payload.save_to_file=true]
 * @returns {Promise<{ map: object }>}
 */
export async function exportMap(payload) {
  const res = await fetch(`${API_BASE}/export-map`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || res.statusText || 'Export failed')
  }
  return res.json()
}

export const api = { uploadFloorplan, detectRooms, exportMap }
