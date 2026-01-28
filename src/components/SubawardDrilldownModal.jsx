import { useEffect, useMemo, useState } from 'react'
import apiClient from '../config/api'

function SubawardDrilldownModal({ isOpen, onClose, primeAwardIds, recipientName }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dataset, setDataset] = useState(null)

  const idsParam = useMemo(() => (primeAwardIds || []).filter(Boolean).slice(0, 10).join(','), [primeAwardIds])

  useEffect(() => {
    if (!isOpen) return
    if (!idsParam) {
      setDataset(null)
      setError('No Award IDs available for this recipient in the current filter window.')
      return
    }

    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const resp = await apiClient.get('/api/example/usaspending/subawards', {
          params: { award_ids: idsParam, limit: 200 },
          timeout: 30000,
        })
        if (!cancelled) setDataset(resp.data)
      } catch (e) {
        if (!cancelled) {
          const msg = e?.response?.data?.message || e?.message || 'Failed to load subcontractors'
          setError(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [isOpen, idsParam])

  if (!isOpen) return null

  const rows = dataset?.data || []

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Subcontractors / Subawards {recipientName ? `for ${recipientName}` : ''}
            </h3>
            <p className="text-xs text-gray-500">
              Showing subaward data for up to {Math.min((primeAwardIds || []).length, 10)} prime award IDs (coverage varies).
            </p>
          </div>
          <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-700" onClick={onClose} title="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading && <div className="text-sm text-gray-600">Loading subcontractors…</div>}
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div>}

          {!loading && !error && rows.length === 0 && (
            <div className="text-sm text-gray-600">
              No subawards returned for these awards. Some prime awards do not report subawards.
            </div>
          )}

          {!loading && !error && rows.length > 0 && (
            <div className="overflow-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="text-left font-semibold px-3 py-2">Subcontractor</th>
                    <th className="text-right font-semibold px-3 py-2">Subaward Amount</th>
                    <th className="text-left font-semibold px-3 py-2">Subaward Date</th>
                    <th className="text-left font-semibold px-3 py-2">Prime Award ID</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((r, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2">{r['Subcontractor Name']}</td>
                      <td className="px-3 py-2 text-right">{Number(r['Subaward Amount'] || 0).toLocaleString()}</td>
                      <td className="px-3 py-2">{r['Subaward Date'] || ''}</td>
                      <td className="px-3 py-2">{r['Prime Award ID']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SubawardDrilldownModal

