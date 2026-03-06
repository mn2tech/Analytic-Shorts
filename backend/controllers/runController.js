/**
 * Unified Compute API - POST /v1/run
 * JSON → JSON: program + inline data → results + usage
 * Spec: inline_json only, 10MB limit, creates job, persists to storage, webhook on completion
 */
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')
const axios = require('axios')
const { getSupabaseAdmin } = require('../utils/supabaseAdmin')
const { parse } = require('../services/sasProcParser')

const INLINE_JSON_LIMIT = 10 * 1024 * 1024 // 10MB
const PAYLOAD_TOO_LARGE_MSG = 'Inline JSON limited to 10MB. Upload as dataset for larger payloads.'

function getAdmin() {
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Database not configured')
  return admin
}

function parseSasCode(code) {
  const result = parse(code)
  if (!result.success) return { ok: false, errors: result.errors }
  const spec = result.spec
  spec._source_code = code
  spec._source_lang = 'sas_proc'
  return { ok: true, spec }
}

function computeTokens(runtimeSeconds, bytesScanned) {
  return Math.max(
    1,
    Math.ceil(runtimeSeconds / 2) + Math.ceil(bytesScanned / (100 * 1024 * 1024))
  )
}

function jsonError(res, message, status = 400) {
  return res.status(status).json({ status: 'error', message })
}

async function fireWebhook(callbackUrl, payload) {
  if (!callbackUrl) return
  try {
    await axios.post(callbackUrl, payload, { timeout: 10000 })
  } catch (err) {
    console.warn('[run] Webhook failed:', err.message)
  }
}

async function run(req, res) {
  const startTime = Date.now()
  try {
    const { program, input, options = {}, callback_url } = req.body

    if (!program || typeof program !== 'object') {
      return jsonError(res, "Missing required field 'program'")
    }
    if (program.language !== 'sas_proc') {
      return jsonError(res, "Unsupported program.language. Use 'sas_proc'")
    }
    const code = typeof program.code === 'string' ? program.code.trim() : ''
    if (!code) {
      return jsonError(res, "Missing or invalid program.code")
    }

    if (!input || typeof input !== 'object') {
      return jsonError(res, "Missing required field 'input'")
    }
    if (input.type !== 'inline_json') {
      return jsonError(res, "input.type must be 'inline_json'")
    }
    const data = input.data
    if (!Array.isArray(data)) {
      return jsonError(res, "input.data must be an array of objects")
    }
    for (let i = 0; i < data.length; i++) {
      if (!data[i] || typeof data[i] !== 'object' || Array.isArray(data[i])) {
        return jsonError(res, `input.data[${i}] must be an object`)
      }
    }

    const bytesScanned = JSON.stringify(data).length
    if (bytesScanned > INLINE_JSON_LIMIT) {
      return res.status(413).json({ status: 'error', message: PAYLOAD_TOO_LARGE_MSG })
    }

    const parsed = parseSasCode(code)
    if (!parsed.ok) {
      const msg = parsed.errors?.[0]?.message || 'SAS PROC parse failed'
      return jsonError(res, msg, 400)
    }
    const spec = parsed.spec
    const tasks = spec.tasks || [spec]

    const db = getAdmin()
    const userId = req.user?.id || null
    const userIdStr = userId || 'anonymous'

    const { data: job, error: jobErr } = await db
      .from('analytics_jobs')
      .insert({
        dataset_id: null,
        engine: 'python',
        status: 'running',
        spec: {
          tasks,
          _source_lang: 'sas_proc',
          _source_code: code,
          _input: { type: 'inline_json', storage_path: null, format: 'json' },
        },
        mode: 'sas_proc',
        user_id: userId,
        callback_url: callback_url || null,
      })
      .select()
      .single()
    if (jobErr) return jsonError(res, jobErr.message, 500)

    const inputStoragePath = `${userIdStr}/inline/${job.id}.json`
    const resultStoragePath = `${userIdStr}/${job.id}/result.json`
    spec._input = { type: 'inline_json', storage_path: `datasets/${inputStoragePath}`, format: 'json' }

    const dataPath = path.join(os.tmpdir(), `run_${job.id}.json`)
    fs.writeFileSync(dataPath, JSON.stringify(data), 'utf8')

    const supabase = getAdmin()
    try {
      await supabase.storage.from('datasets').upload(inputStoragePath, JSON.stringify(data), {
        upsert: true,
        contentType: 'application/json',
      })
    } catch (storageErr) {
      console.warn('[run] Failed to persist input to storage:', storageErr.message)
    }

    await db.from('analytics_jobs').update({ spec }).eq('id', job.id)

    const workerPath = path.join(__dirname, '..', 'workers', 'analytics_worker.py')
    const workerProc = spawn('python', [workerPath, '--spec', JSON.stringify({ tasks }), '--data', dataPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30000,
    })

    let stdout = ''
    let stderr = ''
    workerProc.stdout.on('data', (c) => { stdout += c.toString() })
    workerProc.stderr.on('data', (c) => { stderr += c.toString() })

    await new Promise((resolve) => workerProc.on('close', resolve))

    try { fs.unlinkSync(dataPath) } catch (_) {}

    const runtimeSeconds = (Date.now() - startTime) / 1000
    const logs = [stdout, stderr].filter(Boolean).join('\n')
    const finishedAt = new Date().toISOString()

    if (workerProc.exitCode !== 0) {
      const errMsg = stderr || 'Worker error'
      await db
        .from('analytics_jobs')
        .update({ status: 'failed', error_message: errMsg, logs, finished_at: new Date().toISOString() })
        .eq('id', job.id)
      if (callback_url) {
        fireWebhook(callback_url, {
          job_id: job.id,
          status: 'failed',
          result_preview: null,
          usage: { runtime_seconds: runtimeSeconds, bytes_scanned: bytesScanned, tokens_used: 1 },
        })
      }
      return jsonError(res, errMsg, 500)
    }

    let workerResult
    try {
      workerResult = JSON.parse(stdout.trim())
    } catch {
      await db
        .from('analytics_jobs')
        .update({ status: 'failed', error_message: 'Invalid output', logs, finished_at: finishedAt })
        .eq('id', job.id)
      if (callback_url) fireWebhook(callback_url, { job_id: job.id, status: 'failed', result_preview: null, usage: { tokens_used: 1 } })
      return jsonError(res, 'Invalid worker output', 500)
    }

    if (workerResult.error) {
      await db
        .from('analytics_jobs')
        .update({ status: 'failed', error_message: workerResult.error, logs, finished_at: finishedAt })
        .eq('id', job.id)
      if (callback_url) fireWebhook(callback_url, { job_id: job.id, status: 'failed', result_preview: null, usage: { tokens_used: 1 } })
      return jsonError(res, workerResult.error, 400)
    }

    const records = workerResult.records || (Array.isArray(workerResult.outputs) ? workerResult.outputs.flatMap((o) => o.records || []) : [])
    const tokensUsed = computeTokens(runtimeSeconds, bytesScanned)
    const usage = {
      runtime_seconds: Math.round(runtimeSeconds * 1000) / 1000,
      bytes_scanned: bytesScanned,
      tokens_used: tokensUsed,
    }

    const resultPayload = { type: 'table', records, records_count: records.length }
    try {
      await supabase.storage.from('results').upload(resultStoragePath, JSON.stringify(resultPayload), {
        upsert: true,
        contentType: 'application/json',
      })
    } catch (storageErr) {
      console.warn('[run] Failed to persist result to storage:', storageErr.message)
    }

    await db.from('analytics_job_results').insert({
      job_id: job.id,
      result: { records, outputs: workerResult.outputs },
      preview: records.slice(0, 50),
      storage_path: `results/${resultStoragePath}`,
    })
    await db
      .from('analytics_jobs')
      .update({
        status: 'completed',
        tokens_used: tokensUsed,
        logs,
        result_path: `results/${resultStoragePath}`,
        finished_at: finishedAt,
      })
      .eq('id', job.id)

    if (callback_url) {
      fireWebhook(callback_url, {
        job_id: job.id,
        status: 'completed',
        result_preview: records.slice(0, 50),
        usage,
      })
    }

    return res.status(200).json({
      status: 'completed',
      job_id: job.id,
      result: resultPayload,
      usage,
    })
  } catch (err) {
    console.error('run:', err)
    return jsonError(res, err.message || 'Internal error', 500)
  }
}

module.exports = { run }
