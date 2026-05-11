const express = require('express')
const { requireAuth } = require('../middleware/requireAuth')
const { getSupabaseAdmin } = require('../utils/supabaseAdmin')

let Anthropic = null
try {
  // eslint-disable-next-line global-require
  Anthropic = require('@anthropic-ai/sdk')
} catch (_) {
  Anthropic = null
}

const router = express.Router()
const AnthropicClient = Anthropic?.default || Anthropic

const CONTRACTOR_HR_SYSTEM =
  'You are an HR assistant for NM2TECH LLC. Help contractors with questions about timesheets, invoicing, time-off policies, and general HR matters. Be professional and concise.'

const MODEL = 'claude-sonnet-4-20250514'

function isContractorUser(profile) {
  if (!profile) return false
  const access = (profile.portal_access || '').trim().toLowerCase()
  if (access === 'contractor') return true
  const r = (profile.role || '').trim().toLowerCase()
  return r === 'contractor'
}

async function assertContractorAccess(userId) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return { ok: false, error: 'Server not configured' }
  const { data: profile, error } = await supabase
    .from('shorts_user_profiles')
    .select('portal_access, role')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!isContractorUser(profile)) return { ok: false, error: 'Contractor portal access required' }
  return { ok: true }
}

/**
 * POST /api/contractor-portal/chat
 * Body: { messages: [{ role: 'user'|'assistant', content: string }] }
 */
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const gate = await assertContractorAccess(req.user.id)
    if (!gate.ok) {
      return res.status(403).json({ error: gate.error || 'Forbidden' })
    }

    const { messages } = req.body || {}
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey || !AnthropicClient) {
      return res.status(503).json({
        error: 'AI assistant is not configured. Set ANTHROPIC_API_KEY on the server and ensure @anthropic-ai/sdk is installed.',
      })
    }

    const anthropic = new AnthropicClient({ apiKey })
    const cleaned = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content.trim() }))
      .filter((m) => m.content.length > 0)

    if (cleaned.length === 0) {
      return res.status(400).json({ error: 'No valid messages' })
    }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: CONTRACTOR_HR_SYSTEM,
      messages: cleaned,
    })

    const textBlock = response.content?.find((b) => b.type === 'text')
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    return res.json({ reply: text || 'No response generated.' })
  } catch (err) {
    console.error('[contractor-portal/chat]', err)
    const msg = err?.message || 'Chat failed'
    return res.status(500).json({ error: msg })
  }
})

module.exports = router
