import apiClient from '../config/api'

export async function parseSasCode(sas_code) {
  const { data } = await apiClient.post('/api/migration/parse', { sas_code })
  return data
}

export async function convertSasCode(sas_code, mode = 'basic') {
  const { data } = await apiClient.post('/api/migration/convert', { sas_code, mode })
  return data
}

export async function explainSasConversion(sas_code, mode = 'basic') {
  const { data } = await apiClient.post('/api/migration/explain', { sas_code, mode })
  return data
}
