let Anthropic = null
try {
  // eslint-disable-next-line global-require
  Anthropic = require('@anthropic-ai/sdk')
} catch (_) {
  Anthropic = null
}

const AnthropicClient = Anthropic?.default || Anthropic

const MODEL = 'claude-sonnet-4-20250514'
const SYSTEM_PROMPT =
  'You are an HR assistant for NM2TECH LLC. Help contractors with questions about timesheets, invoicing, time-off policies, pay rates, and general HR matters. Be professional, friendly, and concise.'

function anthropicMessagesForApi(cleaned) {
  return cleaned.map((m) => ({
    role: m.role,
    content: [{ type: 'text', text: m.content }],
  }))
}

function extractAnthropicErrorMessage(err) {
  if (!err) return 'Chat failed'
  const nested =
    err?.error?.error?.message ||
    err?.error?.message ||
    (typeof err?.error === 'string' ? err.error : null)
  if (nested && String(nested).trim()) return String(nested).trim()
  if (typeof err.message === 'string' && err.message.trim()) return err.message.trim()
  try {
    const s = JSON.stringify(err.error || err)
    if (s && s !== '{}') return s
  } catch (_) {
    /* ignore */
  }
  return 'Chat failed'
}

/**
 * POST /api/ai/chat — body: { messages, contractorName? }; req.user from requireAuth.
 */
async function postContractorAiChat(req, res) {
  const { messages, contractorName } = req.body || {}

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' })
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey || !AnthropicClient) {
    return res.status(503).json({
      error:
        'AI chat is not configured. Set ANTHROPIC_API_KEY in backend/.env and ensure @anthropic-ai/sdk is installed.',
    })
  }

  const cleaned = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.trim() }))
    .filter((m) => m.content.length > 0)

  if (cleaned.length === 0) {
    return res.status(400).json({ error: 'No valid messages' })
  }

  if (cleaned[0].role !== 'user') {
    return res.status(400).json({ error: 'First message must be from the user' })
  }

  for (let i = 1; i < cleaned.length; i += 1) {
    const prev = cleaned[i - 1].role
    const cur = cleaned[i].role
    if (prev === cur) {
      return res.status(400).json({
        error: `Invalid message sequence: two consecutive "${cur}" messages. Send alternating user and assistant messages.`,
      })
    }
  }

  const name =
    typeof contractorName === 'string' ? contractorName.trim().slice(0, 200) : ''
  if (name) {
    // eslint-disable-next-line no-console
    console.log('[api/ai/chat]', { userId: req.user?.id, contractorName: name })
  }

  try {
    const anthropic = new AnthropicClient({ apiKey })
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: anthropicMessagesForApi(cleaned),
    })

    const textBlock = response.content?.find((b) => b.type === 'text')
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    return res.json({ reply: text || 'No response generated.' })
  } catch (err) {
    console.error('[api/ai/chat]', err)
    const msg = extractAnthropicErrorMessage(err) || 'Anthropic request failed'
    const upstreamStatus = typeof err?.status === 'number' ? err.status : null
    if (upstreamStatus === 401 || /authentication|invalid x-api-key|api[_ ]?key/i.test(msg)) {
      return res.status(503).json({
        error:
          'Anthropic rejected the API key. Set a valid Anthropic secret key as ANTHROPIC_API_KEY in backend/.env (not Supabase keys).',
        details: msg,
      })
    }
    const status =
      upstreamStatus && upstreamStatus >= 400 && upstreamStatus < 600 ? upstreamStatus : 500
    return res.status(status).json({ error: msg })
  }
}

module.exports = { postContractorAiChat }
