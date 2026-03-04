/**
 * Rule-based NAICS suggestion from business description.
 * AI-ready: can be replaced with LLM later.
 */
const { industryNaicsMap } = require('./industryNaicsMap')

function suggestNaicsFromDescription(description = '') {
  const text = String(description).toLowerCase().trim()
  if (!text) return []

  if (text.includes('software') || text.includes('cloud') || text.includes(' it ') || text.includes('data analytics')) return industryNaicsMap.it_software
  if (text.includes('construction') || text.includes('electrical') || text.includes('building')) return industryNaicsMap.construction
  if (text.includes('staff') || text.includes('recruit') || text.includes('workforce')) return industryNaicsMap.staffing
  if (text.includes('clean') || text.includes('janitorial') || text.includes('facilities')) return industryNaicsMap.janitorial
  if (text.includes('medical') || text.includes('health') || text.includes('clinical')) return industryNaicsMap.healthcare
  if (text.includes('logistics') || text.includes('shipping') || text.includes('transport')) return industryNaicsMap.logistics
  if (text.includes('consulting') || text.includes('professional services')) return industryNaicsMap.professional_services
  if (text.includes('environment') || text.includes('remediation') || text.includes('waste')) return industryNaicsMap.environmental
  if (text.includes('security') || text.includes('guard')) return industryNaicsMap.security
  if (text.includes('manufacturing') || text.includes('fabrication')) return industryNaicsMap.manufacturing

  return []
}

module.exports = { suggestNaicsFromDescription }
