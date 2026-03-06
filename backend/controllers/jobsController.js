/**
 * Analytics Jobs Controller - Execution API
 */
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { getSupabaseAdmin } = require('../utils/supabaseAdmin')
const { parse } = require('../services/sasProcParser')
const { exampleDatasets } = require('../data/exampleDatasets')

function getAdmin() {
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Database not configured')
  return admin
}

function getDatasetData(datasetId) {
  const ds = exampleDatasets[datasetId]
  if (!ds?.data?.length) return null
  return ds.data
}

function parseSasCode(code) {
  const result = parse(code)
  if (!result.success) return { ok: false, errors: result.errors }
  const spec = result.spec
  spec._source_code = code
  spec._source_lang = 'sas_proc'
  return { ok: true, spec }
}

async function createJob(req, res) {
  try {
    const { dataset_id, engine = 'python', spec: inputSpec, code, code_lang } = req.body
    if (!dataset_id) return res.status(400).json({ error: 'dataset_id is required' })
    let spec = inputSpec
    let mode = 'spec'
    if (code && code_lang === 'sas_proc') {
      const parsed = parseSasCode(code)
      if (!parsed.ok) return res.status(400).json({ error: 'SAS PROC parse failed', parseErrors: parsed.errors })
      spec = parsed.spec
      mode = 'sas_proc'
    }
    if (!spec || typeof spec !== 'object') return res.status(400).json({ error: 'spec or valid SAS code is required' })
    const data = getDatasetData(dataset_id)
    if (!data || !Array.isArray(data)) return res.status(400).json({ error: 'Dataset not found' })
    const db = getAdmin()
    const userId = req.user?.id || null
    const { data: job, error: jobErr } = await db.from('analytics_jobs').insert({ dataset_id, engine, status: 'pending', spec, mode, user_id: userId }).select().single()
    if (jobErr) return res.status(500).json({ error: jobErr.message })
    const workerPath = path.join(__dirname, '..', 'workers', 'analytics_worker.py')
    const dataPath = path.join(os.tmpdir(), 'analytics_' + job.id + '.json')
    fs.writeFileSync(dataPath, JSON.stringify(data), 'utf8')
    await db.from('analytics_jobs').update({ status: 'running' }).eq('id', job.id)
    const workerProc = spawn('python', [workerPath, '--spec', JSON.stringify(spec), '--data', dataPath], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    workerProc.stdout.on('data', (c) => { stdout += c.toString() })
    workerProc.stderr.on('data', (c) => { stderr += c.toString() })
    return new Promise((resolve) => {
      workerProc.on('close', async (code) => {
        try { fs.unlinkSync(dataPath) } catch (_) {}
        const logs = [stdout, stderr].filter(Boolean).join('\n')
        if (code !== 0) {
          await db.from('analytics_jobs').update({ status: 'failed', error_message: stderr || 'Worker error', logs }).eq('id', job.id)
          return resolve(res.status(500).json({ error: 'Job failed', jobId: job.id }))
        }
        let result
        try { result = JSON.parse(stdout.trim()) } catch {
          await db.from('analytics_jobs').update({ status: 'failed', error_message: 'Invalid output', logs }).eq('id', job.id)
          return resolve(res.status(500).json({ error: 'Invalid worker output' }))
        }
        const records = result.records || (Array.isArray(result.outputs) ? result.outputs.flatMap(o => o.records || []) : [])
        const preview = Array.isArray(records) ? records.slice(0, 50) : (result.outputs || result.records || [])
        await db.from('analytics_job_results').insert({ job_id: job.id, result, preview })
        const tokens = Math.max(1, result.tokens_used || 0)
        await db.from('analytics_jobs').update({ status: 'completed', tokens_used: tokens, logs }).eq('id', job.id)
        return resolve(res.status(201).json({ jobId: job.id, status: 'completed', result, preview, tokens_used: tokens, logs }))
      })
    })
  } catch (err) {
    console.error('createJob:', err)
    res.status(500).json({ error: err.message })
  }
}

async function getJob(req, res) {
  try {
    const db = getAdmin()
    const { data: job, error } = await db.from('analytics_jobs').select('*').eq('id', req.params.id).single()
    if (error || !job) return res.status(404).json({ error: 'Job not found' })
    const { data: results } = await db.from('analytics_job_results').select('result, preview').eq('job_id', job.id).order('created_at', { ascending: false }).limit(1)
    res.json({ ...job, result: results?.[0]?.result, preview: results?.[0]?.preview })
  } catch (err) {
    console.error('getJob:', err)
    res.status(500).json({ error: err.message })
  }
}

module.exports = { createJob, getJob }
