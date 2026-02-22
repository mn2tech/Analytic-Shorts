import apiClient from '../config/api'

export async function getConversations() {
  const { data } = await apiClient.get('/api/messages')
  return data
}

export async function getThread(withUserId) {
  const { data } = await apiClient.get('/api/messages', { params: { with: withUserId } })
  return data
}

export async function sendMessage(toUserId, body) {
  const { data } = await apiClient.post('/api/messages', { to_user_id: toUserId, body })
  return data
}

export async function getUnreadCount() {
  const { data } = await apiClient.get('/api/messages/unread-count')
  return data?.unread_count ?? 0
}
