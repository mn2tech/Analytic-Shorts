const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function newRunId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function persistStudioRun({
  runId,
  sourceConfig,
  canonicalDataset,
  datasetProfile,
  semanticGraph,
  analysisPlan,
  insightBlocks,
  sceneGraph,
}) {
  const supabase = getSupabase()
  const id = runId || newRunId()
  if (!supabase) {
    return { runId: id, persisted: false, reason: 'Supabase not configured' }
  }

  try {
    const payload = {
      id,
      created_at: new Date().toISOString(),
      source_config: sourceConfig || null,
      canonical_metadata: canonicalDataset?.metadata || null,
      dataset_profile: datasetProfile || null,
      semantic_graph: semanticGraph || null,
      analysis_plan: analysisPlan || null,
      insight_blocks: insightBlocks || null,
      scene_graph: sceneGraph || null,
    }

    const { error } = await supabase.from('aai_studio_runs').insert(payload)
    if (error) {
      const isMissing = error.code === 'PGRST205' || /does not exist/i.test(String(error.message || ''))
      if (!isMissing) {
        console.error('[aai] persistStudioRun failed:', error.message)
      } else {
        console.warn('[aai] Supabase table aai_studio_runs missing; skipping persistence.')
      }
      return { runId: id, persisted: false, reason: error.message || 'Insert failed' }
    }
    return { runId: id, persisted: true }
  } catch (e) {
    console.error('[aai] persistStudioRun exception:', e?.message || e)
    return { runId: id, persisted: false, reason: e?.message || 'Exception' }
  }
}

module.exports = { persistStudioRun, newRunId }

