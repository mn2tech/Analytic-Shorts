/**
 * FloorMap AI API client.
 * Uses /api-floormap proxy (Vite) to reach FastAPI backend on port 8000.
 */
const API_BASE = '/api-floormap'

/** Rewrite /api/ to /api-floormap/ for image URLs (proxied to FloorMap backend) */
export function rewriteImageUrl(url) {
  if (!url || typeof url !== 'string') return url
  return url.replace(/^\/api\//, '/api-floormap/')
}

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
  const data = await res.json()
  data.url = rewriteImageUrl(data.url)
  return data
}

export async function detectRooms({ file_id, image_width, image_height, extract_labels = true }) {
  const res = await fetch(`${API_BASE}/detect-rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id, image_width, image_height, extract_labels })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || res.statusText || 'Detection failed')
  }
  return res.json()
}

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

export const floormapApi = { uploadFloorplan, detectRooms, exportMap, rewriteImageUrl }
