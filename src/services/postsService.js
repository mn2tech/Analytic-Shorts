import apiClient from '../config/api'

export async function getFeed(scope = 'public') {
  const { data } = await apiClient.get('/api/feed', { params: { scope } })
  return data
}

export async function getPost(id) {
  const { data } = await apiClient.get(`/api/posts/${id}`)
  return data
}

export async function getPostDashboard(id) {
  const { data } = await apiClient.get(`/api/posts/${id}/dashboard`, {
    timeout: 60000,
    maxContentLength: 100 * 1024 * 1024,
    maxBodyLength: 100 * 1024 * 1024
  })
  return data
}

export async function createPost(body) {
  const payload = { ...body }
  if (payload.thumbnailUrl !== undefined) {
    payload.thumbnailUrl = payload.thumbnailUrl || null
  }
  const { data } = await apiClient.post('/api/posts', payload)
  return data
}

export async function updatePost(id, body) {
  const payload = { ...body }
  if (payload.thumbnailUrl !== undefined) {
    payload.thumbnailUrl = payload.thumbnailUrl || null
  }
  const { data } = await apiClient.patch(`/api/posts/${id}`, payload)
  return data
}

export async function deletePost(id) {
  const res = await apiClient.delete(`/api/posts/${id}`)
  return res.data
}

export async function toggleLike(postId) {
  const { data } = await apiClient.post(`/api/posts/${postId}/like`)
  return data
}

export async function toggleSave(postId) {
  const { data } = await apiClient.post(`/api/posts/${postId}/save`)
  return data
}

export async function getPostActiveSession(postId) {
  const { data } = await apiClient.get(`/api/posts/${postId}/active-session`)
  return data
}

export async function getComments(postId) {
  const { data } = await apiClient.get(`/api/posts/${postId}/comments`)
  return data
}

export async function addComment(postId, comment) {
  const { data } = await apiClient.post(`/api/posts/${postId}/comments`, { comment })
  return data
}

export async function createOrGetLiveSession(postId) {
  const { data } = await apiClient.post(`/api/posts/${postId}/live-sessions`)
  return data
}

export async function getLiveSession(sessionId) {
  const { data } = await apiClient.get(`/api/live/${sessionId}`)
  return data
}

export async function endLiveSession(sessionId) {
  const { data } = await apiClient.post(`/api/live/${sessionId}/end`)
  return data
}
