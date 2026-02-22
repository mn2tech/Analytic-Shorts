const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { requireAuth, optionalAuth } = require('../middleware/requireAuth')
const { isAdmin } = require('../middleware/isAdmin')
const careersController = require('../controllers/careersController')

const resumesDir = path.join(__dirname, '../uploads/resumes')
if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true })
const resumeUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, resumesDir),
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.pdf').toLowerCase()
      const safe = /^\.(pdf|doc|docx)$/.test(ext) ? ext : '.pdf'
      cb(null, `resume-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safe}`)
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/i.test(file.mimetype)
    cb(null, !!ok)
  }
})

// Jobs: list public, create/update/delete admin only
router.get('/jobs', optionalAuth, careersController.getJobs)
router.post('/jobs', requireAuth, isAdmin, careersController.createJob)
router.patch('/jobs/:id', requireAuth, isAdmin, careersController.updateJob)
router.delete('/jobs/:id', requireAuth, isAdmin, careersController.deleteJob)

// Resumes: list public, own CRUD. Upload must be before /:id
router.get('/resumes', optionalAuth, careersController.getResumes)
router.get('/resumes/my', requireAuth, careersController.getMyResume)
router.post('/resumes/upload', requireAuth, resumeUpload.single('resume'), (req, res) => {
  try {
    if (!req.file?.filename) return res.status(400).json({ error: 'No file uploaded. Use field name "resume" (PDF or Word).' })
    res.json({ url: `/api/uploads/resumes/${req.file.filename}` })
  } catch (err) {
    console.error('resume-upload:', err)
    res.status(500).json({ error: err.message || 'Failed to upload resume' })
  }
})
router.post('/resumes', requireAuth, careersController.createResume)
router.patch('/resumes/:id', requireAuth, careersController.updateResume)
router.delete('/resumes/:id', requireAuth, careersController.deleteResume)

module.exports = router
