import apiClient from '../config/api'

export async function profileValidationDatasets({ sourceData, targetData }) {
  const { data } = await apiClient.post('/api/validation/profile', {
    sourceData,
    targetData,
  })
  return data
}

export async function runDatasetValidation(payload) {
  const { data } = await apiClient.post('/api/validation/compare', payload, {
    timeout: 300000,
  })
  return data
}

export async function buildValidationReport(validationResult, format = 'json', metadata = {}) {
  const { data } = await apiClient.post('/api/validation/report', {
    validationResult,
    format,
    metadata,
  })
  return data
}
