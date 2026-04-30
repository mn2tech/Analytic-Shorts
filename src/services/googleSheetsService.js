import apiClient from '../config/api'

function friendlyGoogleSheetsError(error) {
  const payload = error?.response?.data || {}
  const code = payload.error
  const message = payload.message || payload.error || error?.message || ''

  if (code === 'INVALID_GOOGLE_SHEETS_URL') {
    return 'Please paste a Google Sheets link (docs.google.com/spreadsheets/...)'
  }
  if (code === 'PRIVATE_SHEET') {
    return 'This sheet is private. In Google Sheets, click Share > Anyone with the link > Viewer, then try again.'
  }
  if (code === 'EMPTY_SHEET') {
    return 'This sheet appears to be empty.'
  }
  if (code === 'GOOGLE_SHEETS_TIMEOUT' || error?.code === 'ECONNABORTED' || /timeout/i.test(message)) {
    return 'Could not reach Google Sheets. Please try again.'
  }
  if (code === 'NO_HEADERS') {
    return 'Your sheet needs column headers in the first row.'
  }
  return message || 'Could not import this Google Sheet. Please check the sharing settings and try again.'
}

export async function importGoogleSheet(url) {
  try {
    const response = await apiClient.post('/api/import/google-sheets', { url }, { timeout: 20000 })
    return response.data
  } catch (error) {
    const friendly = new Error(friendlyGoogleSheetsError(error))
    friendly.cause = error
    throw friendly
  }
}
