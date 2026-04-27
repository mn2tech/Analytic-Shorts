import apiClient from '../config/api'

export async function runResponsibleBankingCopilot(query) {
  const { data } = await apiClient.post('/api/ai/responsible-banking-copilot/query', { query })
  return data
}
