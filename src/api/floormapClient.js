/**
 * FloorMap AI API client.
 * Dev: Vite proxies /api-floormap → localhost:8000.
 * Prod: Set VITE_FLOORMAP_API_URL to your deployed FloorMap backend (e.g. http://98.90.130.74:8000).
 * Backend routes are under /api/, so we append that when using a full URL.
 */
const _base = import.meta.env.VITE_FLOORMAP_API_URL || ''
const API_BASE = _base
  ? (_base.replace(/\/$/, '') + (_base.includes('/api') ? '' : '/api'))
  : '/api-floormap'

if (import.meta.env.PROD && typeof console !== 'undefined') {
  console.log('VITE_FLOORMAP_API_URL:', _base || 'Not set (uploads will 404)')
}

/** Rewrite image URL - proxy path in dev, full URL when VITE_FLOORMAP_API_URL is set */
export function rewriteImageUrl(url) {
  if (!url || typeof url !== 'string') return url
  
  // If already a full URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  const base = import.meta.env.VITE_FLOORMAP_API_URL
  if (base) {
    // In production with backend URL set, rewrite to full URL
    const cleanBase = base.replace(/\/$/, '')
    let path = url.startsWith('/') ? url : `/${url}`
    
    // If base already ends with /api and path starts with /api/, remove /api from path to avoid duplication
    if (cleanBase.endsWith('/api') && path.startsWith('/api/')) {
      path = path.replace(/^\/api/, '')
    }
    
    const finalUrl = `${cleanBase}${path}`
    
    // Debug logging in production
    if (import.meta.env.PROD && typeof console !== 'undefined') {
      console.log('[FloorMap] Rewriting image URL:', { original: url, base: cleanBase, path, final: finalUrl })
    }
    
    return finalUrl
  }
  
  // In dev, rewrite /api/ to /api-floormap/ for Vite proxy
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
