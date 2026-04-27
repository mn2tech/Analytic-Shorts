import apiClient from '../config/api'

export async function fetchMhParityDemoDataset() {
  const { data } = await apiClient.get('/api/example/mental-health-parity-mco')
  return data?.data || []
}
