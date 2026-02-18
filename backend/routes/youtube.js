const express = require('express')
const multer = require('multer')
const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 256 * 1024 * 1024 },
})

const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos'
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/videos'

/**
 * POST /api/youtube/upload
 * Body: multipart/form-data
 *   - video: file (required)
 *   - access_token: string (required) — user's Google OAuth access token with scope https://www.googleapis.com/auth/youtube.upload
 *   - title: string (optional, default "Analytics Short")
 *   - description: string (optional)
 *   - privacy: 'public' | 'unlisted' | 'private' (optional, default "private")
 *
 * Creates and saves the short in the app; then uploads to YouTube using the user's token (CreateYouTube-style).
 */
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    const accessToken = req.body?.access_token || (req.headers.authorization && req.headers.authorization.replace(/^Bearer\s+/i, ''))
    if (!accessToken) {
      return res.status(400).json({ error: 'Missing access_token or Authorization header. Sign in with Google (YouTube) first.' })
    }
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Missing video file. Send a multipart file with field name "video".' })
    }

    const title = String(req.body?.title || 'Analytics Short').slice(0, 100)
    const description = String(req.body?.description || 'Created with NM2TECH Analytics Shorts').slice(0, 5000)
    const privacy = ['public', 'unlisted', 'private'].includes(String(req.body?.privacy || '').toLowerCase())
      ? String(req.body.privacy).toLowerCase()
      : 'private'

    const metadata = {
      snippet: {
        title,
        description,
        categoryId: '28',
        tags: ['analytics', 'shorts', 'nm2tech'],
      },
      status: {
        privacyStatus: privacy,
        selfDeclaredMadeForKids: false,
      },
    }

    const initRes = await fetch(`${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': req.file.mimetype || 'video/webm',
        'X-Upload-Content-Length': String(req.file.size),
      },
      body: JSON.stringify(metadata),
    })

    if (!initRes.ok) {
      const errBody = await initRes.text()
      let message = `YouTube API error (${initRes.status})`
      try {
        const j = JSON.parse(errBody)
        message = j.error?.message || j.error?.errors?.[0]?.message || message
      } catch (_) {}
      return res.status(initRes.status >= 400 && initRes.status < 500 ? initRes.status : 502).json({
        error: message,
        hint: initRes.status === 401 ? 'Sign in again with Google (YouTube). Your token may have expired.' : undefined,
      })
    }

    const location = initRes.headers.get('location')
    if (!location) {
      return res.status(502).json({ error: 'YouTube did not return an upload URL.' })
    }

    const putRes = await fetch(location, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': req.file.mimetype || 'video/webm',
        'Content-Length': String(req.file.size),
      },
      body: req.file.buffer,
    })

    if (!putRes.ok) {
      const errBody = await putRes.text()
      let message = `YouTube upload failed (${putRes.status})`
      try {
        const j = JSON.parse(errBody)
        message = j.error?.message || j.error?.errors?.[0]?.message || message
      } catch (_) {}
      return res.status(putRes.status >= 400 && putRes.status < 500 ? putRes.status : 502).json({ error: message })
    }

    const video = await putRes.json()
    const id = video.id
    const link = id ? `https://www.youtube.com/watch?v=${id}` : null

    return res.status(200).json({
      ok: true,
      videoId: id,
      link,
      title: video.snippet?.title || title,
      privacyStatus: video.status?.privacyStatus || privacy,
    })
  } catch (err) {
    console.error('[youtube] upload error:', err.message)
    return res.status(500).json({ error: err.message || 'Upload failed.' })
  }
})

/**
 * GET /api/youtube/upload
 * Returns minimal config for the frontend (e.g. whether upload is enabled).
 */
router.get('/upload', (req, res) => {
  res.json({ enabled: true, message: 'POST with multipart video + access_token to upload.' })
})

module.exports = router
