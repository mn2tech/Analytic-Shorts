import apiClient from '../config/api'

export async function followUser(userId) {
  const { data } = await apiClient.post(`/api/follow/${userId}`)
  return data
}

export async function unfollowUser(userId) {
  const { data } = await apiClient.delete(`/api/follow/${userId}`)
  return data
}

export async function checkFollow(userId) {
  const { data } = await apiClient.get('/api/follow/check', { params: { user_id: userId } })
  return data?.following ?? false
}
