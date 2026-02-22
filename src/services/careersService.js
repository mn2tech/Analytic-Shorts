import apiClient from '../config/api'

export async function getJobs() {
  const { data } = await apiClient.get('/api/jobs')
  return data?.jobs ?? []
}

export async function createJob(payload) {
  const { data } = await apiClient.post('/api/jobs', payload)
  return data
}

export async function updateJob(id, payload) {
  const { data } = await apiClient.patch(`/api/jobs/${id}`, payload)
  return data
}

export async function deleteJob(id) {
  const { data } = await apiClient.delete(`/api/jobs/${id}`)
  return data
}

export async function getResumes() {
  const { data } = await apiClient.get('/api/resumes')
  return data?.resumes ?? []
}

export async function getMyResume() {
  const { data } = await apiClient.get('/api/resumes/my')
  return data
}

export async function createResume(payload) {
  const { data } = await apiClient.post('/api/resumes', payload)
  return data
}

export async function updateResume(id, payload) {
  const { data } = await apiClient.patch(`/api/resumes/${id}`, payload)
  return data
}

export async function deleteResume(id) {
  const { data } = await apiClient.delete(`/api/resumes/${id}`)
  return data
}

export async function uploadResumeFile(file) {
  const form = new FormData()
  form.append('resume', file)
  const { data } = await apiClient.post('/api/resumes/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data?.url
}
