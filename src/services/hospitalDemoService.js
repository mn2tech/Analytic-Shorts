import apiClient from '../config/api'

export async function submitHospitalDemoRequest(payload) {
  const response = await apiClient.post('/api/hospital/demo-requests', payload)
  return response.data
}

