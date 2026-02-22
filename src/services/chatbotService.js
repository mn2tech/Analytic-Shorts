import apiClient from '../config/api'

/**
 * Send conversation to app chatbot. messages: [{ role: 'user'|'assistant', content: string }]
 * Returns { reply: string }
 */
export async function sendChatMessage(messages) {
  const { data } = await apiClient.post('/api/ai/chat', { messages })
  return data
}
