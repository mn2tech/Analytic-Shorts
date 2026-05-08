import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotification } from '../contexts/NotificationContext'
import { parseUploadedInnsoftFile } from '../utils/innsoft/importCore'

export default function InnSoftImporter() {
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [snapshotMode, setSnapshotMode] = useState(true)
  const navigate = useNavigate()
  const { notify } = useNotification()

  const accept = useMemo(
    () => '.zip,.dta,application/zip,application/octet-stream',
    []
  )

  const handleFileSelect = async (event) => {
    const file = event.target?.files?.[0]
    if (!file) return

    try {
      setParsing(true)
      setLastResult(null)
      const preview = await parseUploadedInnsoftFile(file)
      if (!preview.rooms.length) {
        setPreviewData(null)
        setSelectedFile(null)
        notify('No room records found in uploaded file.', 'warning')
        return
      }
      setPreviewData(preview)
      setSelectedFile(file)
      notify('File parsed. Review preview and click Import to Supabase.', 'info')
    } catch (error) {
      notify(`InnSoft import failed: ${error?.message || 'Unknown error'}`, 'error')
    } finally {
      setParsing(false)
      if (event.target) event.target.value = ''
    }
  }

  const handleImportToSupabase = async () => {
    if (!previewData || !selectedFile) return
    try {
      setImporting(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('snapshot_mode', snapshotMode ? 'true' : 'false')

      const response = await fetch('/api/innsoft/auto-import', {
        method: 'POST',
        body: formData,
      })
      const rawBody = await response.text()
      let payload = {}
      try {
        payload = rawBody ? JSON.parse(rawBody) : {}
      } catch {
        payload = {}
      }
      if (!response.ok) {
        throw new Error(
          payload?.message ||
          payload?.error ||
          (rawBody && rawBody.slice(0, 240)) ||
          `InnSoft auto-import request failed (HTTP ${response.status}).`
        )
      }

      const summary = payload?.result || {}
      setLastResult({
        roomsUpserted: Number(summary.roomsUpserted || 0),
        guestsInserted: Number(summary.guestsInserted || 0),
        reservationsInserted: Number(summary.reservationsInserted || 0),
        roomsResetToAvailable: Number(summary.roomsResetToAvailable || 0),
        snapshotMode: payload?.snapshot_mode !== false,
        status: payload?.status || 'success',
      })
      if (payload?.status === 'skipped') {
        notify('InnSoft import skipped (duplicate file already loaded).', 'warning')
      } else {
        notify('InnSoft backup imported successfully.', 'success')
      }
      navigate('/motel-command-center')
    } catch (error) {
      notify(`Import to Supabase failed: ${error?.message || 'Unknown error'}`, 'error')
    } finally {
      setImporting(false)
    }
  }

  const statusClassName = (status) => {
    if (status === 'occupied') return 'text-red-300'
    if (status === 'available') return 'text-emerald-300'
    return 'text-slate-300'
  }

  return (
    <div className="min-h-[60vh] w-full flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-5xl space-y-6">
        <div className="w-full rounded-2xl border border-white/10 bg-slate-900 text-white p-6 shadow-xl">
        <h1 className="text-2xl font-bold tracking-tight">InnSoft PMS Import</h1>
        <p className="text-sm text-slate-300 mt-2">
          Upload your Innsoft Check-Inn daily backup ZIP file to instantly sync all rooms, guests, and reservations to your PMS system.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-300/30 bg-cyan-900/20 hover:bg-cyan-900/30 text-sm font-semibold transition-colors cursor-pointer">
            <span>Upload InnSoft File</span>
            <input
              type="file"
              accept={accept}
              className="hidden"
              onChange={handleFileSelect}
              disabled={parsing || importing}
            />
          </label>
          <span className="text-xs text-slate-400">
            {parsing ? 'Parsing file...' : importing ? 'Importing and syncing...' : 'Accepted: .ZIP backup, .DTA files'}
          </span>
        </div>

        {previewData && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleImportToSupabase}
              disabled={importing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-300/30 bg-emerald-900/20 hover:bg-emerald-900/30 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Import to Supabase
            </button>
            <label className="inline-flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={snapshotMode}
                onChange={(e) => setSnapshotMode(e.target.checked)}
                className="rounded border-white/20 bg-slate-800"
                disabled={importing}
              />
              Snapshot mode (testing): reset imported occupied/reserved rooms without guest rows to available
            </label>
            <span className="text-xs text-slate-400">Imports rooms, guests, and reservations, then redirects.</span>
          </div>
        )}

        {lastResult && (
          <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
            <p>Rooms upserted: {lastResult.roomsUpserted}</p>
            <p>Guests inserted: {lastResult.guestsInserted}</p>
            <p>Reservations inserted: {lastResult.reservationsInserted}</p>
            <p>Rooms reset to available: {lastResult.roomsResetToAvailable ?? 0}</p>
            <p>Snapshot mode: {lastResult.snapshotMode ? 'On' : 'Off'}</p>
          </div>
        )}
      </div>

      {previewData && (
        <div className="w-full rounded-2xl border border-white/10 bg-slate-900 text-white p-6 shadow-xl">
          <div className="flex flex-wrap gap-4 text-sm mb-4">
            <span className="px-3 py-1 rounded-lg bg-slate-800 border border-white/10">Total rooms: {previewData.summary.totalRooms}</span>
            <span className="px-3 py-1 rounded-lg bg-red-900/30 border border-red-700/40">Occupied: {previewData.summary.occupied}</span>
            <span className="px-3 py-1 rounded-lg bg-emerald-900/30 border border-emerald-700/40">Available: {previewData.summary.available}</span>
            <span className="px-3 py-1 rounded-lg bg-cyan-900/30 border border-cyan-700/40">Guests: {previewData.summary.guests}</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="text-left px-3 py-2">Room</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Guest</th>
                  <th className="text-left px-3 py-2">Check-In</th>
                  <th className="text-left px-3 py-2">Check-Out</th>
                  <th className="text-left px-3 py-2">Source</th>
                  <th className="text-left px-3 py-2">Rate</th>
                </tr>
              </thead>
              <tbody>
                {previewData.rooms.map((room) => (
                  <tr key={room.roomNumber} className="border-t border-white/5">
                    <td className="px-3 py-2">{room.roomNumber}</td>
                    <td className="px-3 py-2">{room.roomType || '—'}</td>
                    <td className={`px-3 py-2 font-semibold ${statusClassName(room.status)}`}>{room.status}</td>
                    <td className="px-3 py-2">{room.guest_name || '—'}</td>
                    <td className="px-3 py-2">{room.guest?.check_in || '—'}</td>
                    <td className="px-3 py-2">{room.checkOut || '—'}</td>
                    <td className="px-3 py-2">{room.guest?.source || '—'}</td>
                    <td className="px-3 py-2">{room.guest?.rate ? `$${room.guest.rate}/night` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
