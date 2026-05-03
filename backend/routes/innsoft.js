const express = require('express')
const multer = require('multer')
const path = require('path')
const crypto = require('crypto')

const { getSupabaseAdmin } = require('../utils/supabaseAdmin')
const { buildPreviewModel, persistInnsoftImport } = require('../../src/utils/innsoft/importCore')

const router = express.Router()

// DB check constraint on innsoft_sync_runs.status does not allow literal "started"
// in this environment; use an allowed interim status + marker until completion.
const PENDING_STATUS = 'failed'
const PENDING_MARKER = 'started'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = String(path.extname(file.originalname || '')).toLowerCase()
    if (ext === '.dta') return cb(null, true)
    return cb(new Error('Only .dta files are supported for auto-import'))
  },
})

router.post('/auto-import', upload.single('file'), async (req, res) => {
  let runId = null
  let supabase = null
  let fileHash = null
  const nowIso = () => new Date().toISOString()

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    supabase = getSupabaseAdmin()
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase admin client is not configured' })
    }

    fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex')
    const motelId =
      req.headers['x-motel-id'] ||
      req.headers['motel-id'] ||
      process.env.MOTEL_ID ||
      process.env.CHECKINN_MOTEL_ID ||
      'demo-motel-1'

    const { data: startedRun, error: startedErr } = await supabase
      .from('innsoft_sync_runs')
      .insert({
        status: PENDING_STATUS,
        error_message: PENDING_MARKER,
        source_file: req.file.originalname,
        file_hash: fileHash,
        started_at: nowIso(),
        motel_id: String(motelId),
      })
      .select('id')
      .single()

    if (startedErr) {
      throw new Error(startedErr.message || 'Failed to insert started sync run')
    }
    runId = startedRun?.id || null

    const { data: existingSuccess, error: duplicateErr } = await supabase
      .from('innsoft_sync_runs')
      .select('id')
      .eq('file_hash', fileHash)
      .eq('status', 'success')
      .neq('id', runId)
      .limit(1)

    if (duplicateErr) {
      throw new Error(duplicateErr.message || 'Failed duplicate check')
    }

    if (Array.isArray(existingSuccess) && existingSuccess.length > 0) {
      await supabase
        .from('innsoft_sync_runs')
        .update({ status: 'skipped', error_message: null, finished_at: nowIso() })
        .eq('id', runId)

      return res.status(200).json({
        status: 'skipped',
        reason: 'duplicate',
        file_hash: fileHash,
      })
    }

    const dtaBytes = new Uint8Array(req.file.buffer)
    const previewData = buildPreviewModel(dtaBytes)
    const result = await persistInnsoftImport(previewData, supabase)

    await supabase
      .from('innsoft_sync_runs')
      .update({
        status: 'success',
        error_message: null,
        records_rooms: Number(result?.roomsUpserted || 0),
        records_guests: Number(result?.guestsInserted || 0),
        records_reservations: Number(result?.reservationsInserted || 0),
        finished_at: nowIso(),
      })
      .eq('id', runId)

    return res.json({
      status: 'success',
      file: req.file.originalname,
      file_hash: fileHash,
      summary: {
        rooms: previewData?.summary?.totalRooms || 0,
        guests: previewData?.summary?.guests || 0,
      },
      result,
    })
  } catch (error) {
    if (supabase && runId) {
      try {
        await supabase
          .from('innsoft_sync_runs')
          .update({
            status: 'failed',
            error_message: error.message || 'Unknown error',
            finished_at: nowIso(),
          })
          .eq('id', runId)
      } catch (_) {
        // Keep primary request failure response unchanged.
      }
    }
    return res.status(500).json({
      error: 'InnSoft auto-import failed',
      message: error.message || 'Unknown error',
    })
  }
})

module.exports = router
