import { useState } from 'react'

const TIME_OFF_TYPES = ['Unpaid leave', 'Personal day', 'Medical', 'Other']

export default function TimeOffPanel({ supabase, userId, userEmail }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [type, setType] = useState(TIME_OFF_TYPES[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!startDate || !endDate) {
      setError('Start and end dates are required.')
      return
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be on or after start date.')
      return
    }
    if (!type) {
      setError('Please select a type.')
      return
    }
    const email = (userEmail || '').trim()
    if (!email) {
      setError('Missing email on your session. Sign out and sign in again.')
      return
    }

    setLoading(true)
    try {
      const { error: insErr } = await supabase.from('time_off_requests').insert({
        user_id: userId,
        email,
        start_date: startDate,
        end_date: endDate,
        type,
        notes: notes.trim() || null,
        status: 'pending',
      })
      if (insErr) throw insErr
      setMessage('Your time-off request was submitted successfully. NM2TECH will review it.')
      setStartDate('')
      setEndDate('')
      setType(TIME_OFF_TYPES[0])
      setNotes('')
    } catch (err) {
      console.error(err)
      setError(
        err?.message ||
          'Could not submit. Run database/migration_time_off_requests.sql in Supabase and confirm RLS allows insert for your account.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900">Time off</h1>
      <p className="mt-1 text-sm text-slate-600">Submit a request for NM2TECH to review.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
        )}
        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="to-start" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Start date
            </label>
            <input
              id="to-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0078D4] focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
            />
          </div>
          <div>
            <label htmlFor="to-end" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              End date
            </label>
            <input
              id="to-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0078D4] focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="to-type" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Type
          </label>
          <select
            id="to-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0078D4] focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
          >
            {TIME_OFF_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="to-notes" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </label>
          <textarea
            id="to-notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any details that help NM2TECH process your request…"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0078D4] focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#0078D4] py-2.5 text-sm font-semibold text-white shadow hover:bg-[#006cbd] disabled:opacity-50"
        >
          {loading ? 'Submitting…' : 'Submit request'}
        </button>
      </form>
    </div>
  )
}

