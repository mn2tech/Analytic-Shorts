const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { requireAuth } = require('../middleware/requireAuth')

const thumbnailsDir = path.join(__dirname, '../uploads/thumbnails')
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, thumbnailsDir),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.png').toLowerCase()
    const safe = /^\.(png|jpe?g|gif|webp)$/.test(ext) ? ext : '.png'
    cb(null, `thumb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safe}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(png|jpeg|jpg|gif|webp)$/i.test(file.mimetype)
    cb(null, !!ok)
  }
})

/**
 * POST /api/thumbnail-upload
 * Body: multipart/form-data, field name "thumbnail" (image file).
 * Returns: { url: string } - path to the uploaded image (e.g. /api/uploads/thumbnails/thumb-xxx.png).
 */
router.post('/', requireAuth, upload.single('thumbnail'), (req, res) => {
  try {
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ error: 'No image file uploaded. Use field name "thumbnail".' })
    }
    const url = `/api/uploads/thumbnails/${req.file.filename}`
    res.json({ url })
  } catch (err) {
    console.error('thumbnail-upload:', err)
    res.status(500).json({ error: err.message || 'Failed to upload thumbnail' })
  }
})

module.exports = router
