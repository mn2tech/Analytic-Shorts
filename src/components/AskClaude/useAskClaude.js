import { useCallback, useMemo, useState } from 'react'
import apiClient from '../../config/api'

const WELCOME_MESSAGE = {
  id: 'ask-claude-welcome',
  role: 'assistant',
  content: 'Ask me about this dataset, or tell me what dashboard you want to build.',
  toolUsed: null,
  dashboardSpec: null,
  createdAt: new Date().toISOString(),
}

function createMessage(role, content, extras = {}) {
  return {
    id: `ask-claude-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    ...extras,
  }
}

function getResponseText(payload) {
  const raw = payload?.response ?? payload?.text ?? payload?.reply ?? ''
  if (typeof raw === 'string') return raw
  if (raw == null) return ''
  try {
    return JSON.stringify(raw, null, 2)
  } catch (_) {
    return String(raw)
  }
}

function toHistory(messages) {
  return messages
    .filter((message) => message.id !== WELCOME_MESSAGE.id)
    .map((message) => ({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.content || '',
      toolUsed: message.toolUsed || null,
    }))
    .slice(-12)
}

export default function useAskClaude(dataContext) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const [toolStatus, setToolStatus] = useState('')

  const canAsk = useMemo(() => {
    return Array.isArray(dataContext?.data) && dataContext.data.length > 0
  }, [dataContext?.data])

  const askClaude = useCallback(async (rawMessage) => {
    const message = String(rawMessage || '').trim()
    if (!message || isLoading) return

    const userMessage = createMessage('user', message)
    const pendingHistory = [...messages, userMessage]
    setMessages(pendingHistory)
    setIsLoading(true)
    setToolStatus('Reading your data...')

    try {
      const response = await apiClient.post('/api/ask-claude', {
        message,
        dataContext,
        conversationHistory: toHistory(messages),
      })

      const payload = response.data || {}
      if (import.meta.env.DEV) console.log('[AskClaude] raw API response:', payload)
      const responseText = getResponseText(payload)
      const assistantMessage = createMessage('assistant', responseText || 'I found an answer, but the response was empty.', {
        toolUsed: payload.toolUsed || null,
        dashboardSpec: payload.dashboardSpec || null,
        exampleDataset: payload.exampleDataset || null,
        federalReport: payload.federalReport || null,
        upgradeRequired: !!payload.upgradeRequired,
      })
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const status = error?.response?.data
      const assistantMessage = createMessage(
        'assistant',
        status?.message || status?.error || 'Claude is having trouble right now. Please try again in a moment.',
        {
          toolUsed: null,
          upgradeRequired: !!status?.upgradeRequired,
        }
      )
      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
      setToolStatus('')
    }
  }, [dataContext, isLoading, messages])

  const resetConversation = useCallback(() => {
    setMessages([WELCOME_MESSAGE])
    setToolStatus('')
  }, [])

  return {
    messages,
    isLoading,
    toolStatus,
    canAsk,
    askClaude,
    resetConversation,
  }
}
