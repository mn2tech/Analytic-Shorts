const axios = require('axios')

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

function ensureApiKey() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error('ANTHROPIC_API_KEY is not configured')
    err.statusCode = 503
    throw err
  }
}

async function callAnthropicJson({ system, userPrompt, maxTokens = 900, temperature = 0.2 }) {
  ensureApiKey()

  const response = await axios.post(
    ANTHROPIC_API_URL,
    {
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      timeout: 45000,
    }
  )

  const data = response.data || {}
  const contentBlocks = Array.isArray(data.content) ? data.content : []
  const text =
    contentBlocks.find(
      (b) => b.type === 'text'
    )?.text

  if (!text) {
    const err = new Error('Anthropic returned empty content')
    err.statusCode = 502
    throw err
  }

  try {
    const parsed = JSON.parse(text)
    return { parsed, rawText: text }
  } catch (error) {
    const err = new Error('Anthropic did not return valid JSON')
    err.statusCode = 502
    err.rawText = text
    throw err
  }
}

module.exports = {
  callAnthropicJson,
}
