/**
 * Score Controller - Model Scoring as a Service
 * POST /v1/score - Sync (<=5000 rows) or Async (job)
 */
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { getSupabaseAdmin } = require('../utils/supabaseAdmin')
const { getPythonCommand, getPythonPrefixArgs } = require('../utils/python')

const SYNC_ROW_LIMIT = 5000
const INLINE_PAYLOAD_LIMIT_BYTES = 10 * 1024 * 1024 // 10MB

function getAdmin() {
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Database not configured')
  return admin
}

function requireUser(req) {
  if (!req.user?.id) throw new Error('Authentication required')
  return req.user.id
}

/** POST /v1/score */
async function score(req, res) {
  try {
    const userId = requireUser(req)
    const { model_id, input, options = {}, callback_url } = req.body

    if (!model_id) return res.status(400).json({ error: 'model_id is required' })
    if (!input || typeof input !== 'object') {
      return res.status(400).json({ error: 'input is required', hint: 'Use { type: "inline_json", data: [...] }' })
    }
    const inputType = input.type || 'inline_json'
    if (inputType !== 'inline_json') {
      return res.status(400).json({ error: 'Only inline_json input type is supported' })
    }
    const data = input.data
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'input.data must be an array of objects' })
    }

    for (let i = 0; i < data.length; i++) {
      if (!data[i] || typeof data[i] !== 'object' || Array.isArray(data[i])) {
        return res.status(400).json({ error: `input.data[${i}] must be an object` })
      }
    }

    const payloadSize = JSON.stringify(data).length
    if (payloadSize > INLINE_PAYLOAD_LIMIT_BYTES) {
      return res.status(400).json({
        error: 'Input payload too large',
        max_bytes: INLINE_PAYLOAD_LIMIT_BYTES,
        hint: 'Use async mode with uploaded dataset or reduce row count',
      })
    }

    const db = getAdmin()
    const { data: model, error: modelErr } = await db
      .from('models')
      .select('id, owner_id, format, storage_path')
      .eq('id', model_id)
      .single()
    if (modelErr || !model) return res.status(404).json({ error: 'Model not found' })
    if (model.owner_id !== userId) return res.status(403).json({ error: 'Model access denied' })

    const useSync = data.length <= SYNC_ROW_LIMIT
    const spec = {
      task: 'score',
      model_id,
      options: {
        return_proba: !!options.return_proba,
        id_field: options.id_field || null,
      },
      _input: { type: 'inline_json', format: 'json' },
    }

    const jobPayload = {
      dataset_id: null,
      engine: 'python',
      status: useSync ? 'running' : 'queued',
      spec,
      mode: 'score',
      user_id: userId,
      callback_url: callback_url || null,
    }

    const { data: job, error: jobErr } = await db
      .from('analytics_jobs')
      .insert(jobPayload)
      .select()
      .single()
    if (jobErr) return res.status(500).json({ error: jobErr.message })

    const dataPath = path.join(os.tmpdir(), `score_${job.id}.json`)
    fs.writeFileSync(dataPath, JSON.stringify(data), 'utf8')

    if (useSync) {
      await db.from('analytics_jobs').update({ status: 'running' }).eq('id', job.id)
      const objectPath = model.storage_path.replace(/^models\/+/, '')
      const { data: modelData, error: dlErr } = await getAdmin().storage
        .from('models')
        .download(objectPath)
      if (dlErr || !modelData) {
        await db.from('analytics_jobs').update({ status: 'failed', error_message: 'Failed to download model' }).eq('id', job.id)
        try { fs.unlinkSync(dataPath) } catch (_) {}
        return res.status(500).json({ error: 'Failed to download model', details: dlErr?.message })
      }
      let modelBuffer
      if (Buffer.isBuffer(modelData)) {
        modelBuffer = modelData
      } else if (typeof modelData?.arrayBuffer === 'function') {
        modelBuffer = Buffer.from(await modelData.arrayBuffer())
      } else {
        modelBuffer = Buffer.from(modelData)
      }
      const ext = model.storage_path.match(/\.(joblib|pkl|onnx)$/i)?.[1] || 'joblib'
      const modelPath = path.join(os.tmpdir(), `model_${job.id}.${ext}`)
      fs.writeFileSync(modelPath, modelBuffer, 'binary')

      const workerPath = path.join(__dirname, '..', 'workers', 'score_worker.py')
      const pyCmd = getPythonCommand()
      const pyArgs = [...getPythonPrefixArgs(), workerPath, '--spec', JSON.stringify(spec), '--data', dataPath, '--model-path', modelPath]
      const proc = spawn(pyCmd, pyArgs, { stdio: ['ignore', 'pipe', 'pipe'] })

      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', (c) => { stdout += c.toString() })
      proc.stderr.on('data', (c) => { stderr += c.toString() })

      proc.on('error', async (err) => {
        const msg = err.code === 'ENOENT' ? `Python not found. Install Python 3 and ensure '${pyCmd}' is in PATH, or set PYTHON_CMD in .env` : err.message
        await db.from('analytics_jobs').update({ status: 'failed', error_message: msg }).eq('id', job.id)
        try { fs.unlinkSync(dataPath) } catch (_) {}
        try { fs.unlinkSync(modelPath) } catch (_) {}
        return res.status(500).json({ error: 'Scoring failed', details: msg })
      })

      return new Promise((resolve) => {
        proc.on('close', async (code) => {
          try { fs.unlinkSync(dataPath) } catch (_) {}
          try { fs.unlinkSync(modelPath) } catch (_) {}
          const logs = [stdout, stderr].filter(Boolean).join('\n')
          if (code !== 0) {
            await db.from('analytics_jobs').update({ status: 'failed', error_message: stderr || 'Worker error', logs }).eq('id', job.id)
            return resolve(res.status(500).json({ error: 'Scoring failed', jobId: job.id, details: stderr }))
          }
          let result
          try { result = JSON.parse(stdout.trim()) } catch {
            await db.from('analytics_jobs').update({ status: 'failed', error_message: 'Invalid output', logs }).eq('id', job.id)
            return resolve(res.status(500).json({ error: 'Invalid worker output' }))
          }
          const predictions = result.predictions || []
          const tokensUsed = Math.max(1, result.tokens_used || Math.ceil(data.length / 5000))
          const preview = predictions.slice(0, 50)
          await db.from('analytics_job_results').insert({
            job_id: job.id,
            result: { predictions, usage: result.usage },
            preview,
          })
          await db.from('analytics_jobs').update({
            status: 'completed',
            tokens_used: tokensUsed,
            logs,
          }).eq('id', job.id)

          const usage = result.usage || { tokens_used: tokensUsed, runtime_seconds: 0, bytes_scanned: payloadSize }

          if (callback_url) {
            try {
              const axios = require('axios')
              await axios.post(callback_url, {
                job_id: job.id,
                status: 'completed',
                predictions,
                preview,
                usage,
              }, { timeout: 10000 })
            } catch (cbErr) {
              console.warn('Callback failed:', cbErr.message)
            }
          }

          return resolve(res.status(201).json({
            status: 'completed',
            job_id: job.id,
            predictions,
            preview,
            usage: { tokens_used: tokensUsed, ...usage },
          }))
        })
      })
    }

    await db.from('analytics_jobs').update({ status: 'queued', spec: { ...spec, _input: { ...spec._input, _temp_path: dataPath } } }).eq('id', job.id)
    res.status(202).json({ status: 'queued', job_id: job.id })
  } catch (err) {
    const msg = err.message || 'Unknown error'
    if (msg === 'Authentication required') return res.status(401).json({ error: msg })
    console.error('score:', err)
    res.status(500).json({ error: msg })
  }
}

module.exports = { score }
