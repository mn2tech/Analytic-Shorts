const express = require('express')
const multer = require('multer')
const path = require('path')
const jobsController = require('../controllers/jobsController')
const runController = require('../controllers/runController')
const modelsController = require('../controllers/modelsController')
const scoreController = require('../controllers/scoreController')
const { optionalAuth, requireAuth } = require('../middleware/requireAuth')
const router = express.Router()

const modelUpload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (_, file, cb) => cb(null, `model_${Date.now()}_${file.originalname}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase()
    if (['.joblib', '.pkl', '.onnx'].includes(ext)) cb(null, true)
    else cb(new Error('Allowed: .joblib, .pkl, .onnx'))
  },
})

// Jobs (Execution API) - optional auth
router.post('/jobs', optionalAuth, jobsController.createJob)
router.get('/jobs/:id', optionalAuth, jobsController.getJob)

// Unified Compute - optional auth
router.post('/run', optionalAuth, runController.run)

// Models - require auth (/models/upload before /models/:id so "upload" isn't captured as id)
router.post('/models/upload', requireAuth, (req, res, next) => {
  if (!require('fs').existsSync(path.join(__dirname, '../uploads'))) {
    require('fs').mkdirSync(path.join(__dirname, '../uploads'), { recursive: true })
  }
  next()
}, modelUpload.single('file'), modelsController.uploadModel)
router.post('/models', requireAuth, modelsController.createModel)
router.post('/models/:id/confirm', requireAuth, modelsController.confirmModel)
router.get('/models', requireAuth, modelsController.listModels)

// Score - require auth
router.post('/score', requireAuth, scoreController.score)

module.exports = router
