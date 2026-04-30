import { useState } from 'react'
import { importGoogleSheet } from '../services/googleSheetsService'

function GoogleSheetsIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" className="fill-emerald-500" />
      <rect x="7" y="8" width="10" height="9" rx="1" className="fill-white" />
      <path d="M7 11h10M7 14h10M10.5 8v9M14 8v9" className="stroke-emerald-500" strokeWidth="1" />
    </svg>
  )
}

function getSheetTitle(payload) {
  const firstRow = Array.isArray(payload?.data) ? payload.data[0] : null
  const firstColumn = Array.isArray(payload?.columns) ? payload.columns[0] : null
  const value = firstRow && firstColumn ? firstRow[firstColumn] : ''
  return value != null && String(value).trim() ? String(value).trim() : ''
}

export default function GoogleSheetsImport({ onDataLoaded, onError }) {
  const [url, setUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState('')
  const [successTitle, setSuccessTitle] = useState('')

  const handleImport = async (event) => {
    event.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) {
      setError('Please paste a Google Sheets link (docs.google.com/spreadsheets/...)')
      return
    }

    setIsImporting(true)
    setError('')
    setSuccessTitle('')

    try {
      const payload = await importGoogleSheet(trimmed)
      setSuccessTitle(getSheetTitle(payload))
      onDataLoaded?.(payload)
      setUrl('')
    } catch (err) {
      const message = err?.message || 'Could not import this Google Sheet. Please check the sharing settings and try again.'
      setError(message)
      onError?.(message)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <form onSubmit={handleImport} className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-left">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <GoogleSheetsIcon />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Import from Google Sheets</h3>
          <p className="text-xs text-gray-500">Paste a public sheet link shared as viewer.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value)
            if (error) setError('')
          }}
          disabled={isImporting}
          placeholder="Paste Google Sheets URL..."
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={isImporting || !url.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isImporting ? 'Importing sheet...' : 'Import'}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-700">
          {error}
        </p>
      )}
      {successTitle && !error && (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-sm text-emerald-700">
          Imported sheet starting with: <span className="font-medium">{successTitle}</span>
        </p>
      )}
    </form>
  )
}
