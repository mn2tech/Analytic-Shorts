/**
 * SAM.gov API response transforms and normalizers.
 */
function getSamgovUpdatedDateValue(o) {
  return (
    o?.modifiedDate ||
    o?.modified_date ||
    o?.lastModifiedDate ||
    o?.last_modified_date ||
    o?.updatedDate ||
    o?.updated_date ||
    o?.postedDate ||
    ''
  )
}

function normalizeSamgovState(val) {
  if (val == null) return ''
  if (typeof val === 'string') return val.trim()
  if (typeof val === 'object') {
    const code = val.code ?? val.stateCode ?? val.state ?? val.abbreviation ?? val.name
    return typeof code === 'string' ? code.trim() : ''
  }
  return String(val).trim()
}

function shortenSamgovOrganization(fullParentPathName, organizationName) {
  const full = (fullParentPathName || organizationName || '').toString().trim()
  if (!full) return ''
  const segments = full.split(/\.\s*|\s*>\s*/).map((s) => s.trim()).filter(Boolean)
  const lastSegment = segments.length > 1 ? segments[segments.length - 1] : full
  const alt = (organizationName || '').toString().trim()
  const candidates = [lastSegment, alt, full].filter(Boolean)
  const best = candidates.reduce((a, b) => (a.length <= b.length ? a : b))
  return best || full
}

module.exports = {
  getSamgovUpdatedDateValue,
  normalizeSamgovState,
  shortenSamgovOrganization,
}
