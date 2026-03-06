/**
 * Models Controller - Model Scoring as a Service
 * POST /v1/models, POST /v1/models/upload, POST /v1/models/:id/confirm, GET /v1/models
 */
const fs = require('fs')
const path = require('path')
const { getSupabaseAdmin } = require('../utils/supabaseAdmin')

const ALLOWED_FORMATS = ['joblib', 'pickle', 'pkl', 'onnx']
const BUCKET = 'models'

function getAdmin() {
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Database not configured')
  return admin
}

function requireUser(req) {
  if (!req.user?.id) throw new Error('Authentication required')
  return req.user.id
}

/** POST /v1/models - Create model record and return signed upload URL */
async function createModel(req, res) {
  try {
    const ownerId = requireUser(req)
    const { name, format, filename = 'model.joblib' } = req.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' })
    }
    const fmt = (format || 'joblib').toLowerCase()
    if (!ALLOWED_FORMATS.includes(fmt)) {
      return res.status(400).json({ error: 'Invalid format', allowed: ALLOWED_FORMATS })
    }
    const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : (fmt === 'pkl' ? 'pkl' : fmt)
    const safeName = `model.${ext}`.replace(/[^a-z0-9._-]/gi, '_')

    const db = getAdmin()
    const { data: model, error: insertErr } = await db
      .from('models')
      .insert({
        owner_id: ownerId,
        name: name.trim(),
        format: fmt === 'pkl' ? 'pickle' : fmt,
        storage_path: `models/${ownerId}/pending`,
      })
      .select()
      .single()
    if (insertErr) return res.status(500).json({ error: insertErr.message })

    const objectPath = `${ownerId}/${model.id}/${safeName}`
    const { data: signedData, error: signedErr } = await getAdmin().storage
      .from(BUCKET)
      .createSignedUploadUrl(objectPath, { upsert: true })
    if (signedErr) {
      await db.from('models').delete().eq('id', model.id)
      return res.status(500).json({ error: 'Failed to create upload URL', details: signedErr.message })
    }

    await db.from('models').update({ storage_path: `models/${objectPath}` }).eq('id', model.id)

    const uploadUrl = signedData?.signedUrl ?? signedData?.path ?? signedData?.signed_url
    res.status(201).json({
      model_id: model.id,
      upload_url: uploadUrl,
      storage_path: `models/${objectPath}`,
    })
  } catch (err) {
    const msg = err.message || 'Unknown error'
    if (msg === 'Authentication required') return res.status(401).json({ error: msg })
    console.error('createModel:', err)
    res.status(500).json({ error: msg })
  }
}

/** POST /v1/models/:id/confirm - Confirm upload and mark model ready */
async function confirmModel(req, res) {
  try {
    const ownerId = requireUser(req)
    const { id } = req.params
    const db = getAdmin()
    const { data: model, error: fetchErr } = await db
      .from('models')
      .select('*')
      .eq('id', id)
      .eq('owner_id', ownerId)
      .single()
    if (fetchErr || !model) return res.status(404).json({ error: 'Model not found' })

    const folderPath = `${ownerId}/${id}`
    const { data: fileList } = await getAdmin().storage.from(BUCKET).list(folderPath)
    const found = Array.isArray(fileList) && fileList.some(
      (f) => f.name && (f.name.endsWith('.joblib') || f.name.endsWith('.pkl') || f.name.endsWith('.onnx'))
    )
    if (!found) {
      return res.status(400).json({ error: 'Model file not found in storage. Upload the file to the upload_url first.' })
    }

    res.json({ model_id: id, status: 'ready' })
  } catch (err) {
    if (err.message === 'Authentication required') return res.status(401).json({ error: err.message })
    console.error('confirmModel:', err)
    res.status(500).json({ error: err.message })
  }
}

/** GET /v1/models - List user's models */
async function listModels(req, res) {
  try {
    const ownerId = requireUser(req)
    const db = getAdmin()
    const { data: models, error } = await db
      .from('models')
      .select('id, name, format, storage_path, created_at, metadata')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    res.json({ models: models || [] })
  } catch (err) {
    if (err.message === 'Authentication required') return res.status(401).json({ error: err.message })
    console.error('listModels:', err)
    res.status(500).json({ error: err.message })
  }
}

/** POST /v1/models/upload - Direct file upload (multipart), creates model in one step */
async function uploadModel(req, res) {
  try {
    const ownerId = requireUser(req)
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const name = req.body?.name || req.file.originalname?.replace(/\.[^.]+$/, '') || 'model'
    const ext = (path.extname(req.file.originalname) || '').toLowerCase().slice(1)
    const fmt = ['joblib', 'pkl', 'pickle', 'onnx'].includes(ext) ? (ext === 'pkl' ? 'pickle' : ext) : 'joblib'
    const safeName = `model.${ext || 'joblib'}`.replace(/[^a-z0-9._-]/gi, '_')

    const db = getAdmin()
    const { data: model, error: insertErr } = await db
      .from('models')
      .insert({
        owner_id: ownerId,
        name: String(name).trim(),
        format: fmt,
        storage_path: `models/${ownerId}/pending`,
      })
      .select()
      .single()
    if (insertErr) return res.status(500).json({ error: insertErr.message })

    const objectPath = `${ownerId}/${model.id}/${safeName}`
    const fileBuffer = fs.readFileSync(req.file.path)
    const { error: uploadErr } = await getAdmin().storage
      .from(BUCKET)
      .upload(objectPath, fileBuffer, { upsert: true, contentType: 'application/octet-stream' })
    try { fs.unlinkSync(req.file.path) } catch (_) {}
    if (uploadErr) {
      await db.from('models').delete().eq('id', model.id)
      return res.status(500).json({ error: 'Failed to upload model', details: uploadErr.message })
    }
    await db.from('models').update({ storage_path: `models/${objectPath}` }).eq('id', model.id)

    res.status(201).json({ model_id: model.id, name: model.name, format: fmt, storage_path: `models/${objectPath}` })
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) try { fs.unlinkSync(req.file.path) } catch (_) {}
    if (err.message === 'Authentication required') return res.status(401).json({ error: err.message })
    console.error('uploadModel:', err)
    res.status(500).json({ error: err.message })
  }
}

module.exports = { createModel, confirmModel, listModels, uploadModel }
