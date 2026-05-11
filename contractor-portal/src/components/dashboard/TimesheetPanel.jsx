import { TIMESHEET_WEB_URL, TIMESHEET_PLAY_STORE_URL } from './constants'

function formatPayRatePerHour(value) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  const shown = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
  return `$${shown}/hr`
}

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${className}`}
    >
      {children}
    </div>
  )
}

export default function TimesheetPanel({ contractor, user }) {
  const sessionEmail = (user?.email || '').trim()
  const name = contractor?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || sessionEmail || '—'
  const role = contractor?.role || '—'
  const email = contractor?.email || sessionEmail || '—'
  const payRate = formatPayRatePerHour(contractor?.contractor_pay_rate)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Timesheet</h1>
        <p className="mt-1 text-sm text-slate-600">Submit hours and manage your NM2TECH assignments.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Web timesheet</h2>
          <p className="mt-1 text-sm text-slate-600">Full experience in your browser (same Google account).</p>
          <a
            href={TIMESHEET_WEB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-[44px] min-w-[10rem] items-center justify-center rounded-lg bg-[#0078D4] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#006cbd] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D4] focus-visible:ring-offset-2"
          >
            Open Timesheet ↗
          </a>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Mobile app</h2>
          <p className="mt-1 text-sm text-slate-600">Trusted Web Activity on Google Play — same site, app icon on your phone.</p>
          <a
            href={TIMESHEET_PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center rounded-lg border-2 border-[#0078D4] bg-white px-4 py-2.5 text-sm font-semibold text-[#0078D4] hover:bg-sky-50"
          >
            Google Play ↗
          </a>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Your contractor profile</h2>
        {!contractor ? (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            No row in <strong>contractors</strong> for <code className="text-xs">{sessionEmail || 'your email'}</code>.
            Ask NM2TECH to add or update your record so the <strong>email</strong> column matches this sign-in (case
            insensitive).
          </p>
        ) : (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">{name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Role</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">{role}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Your pay rate</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">{payRate}</dd>
              <p className="mt-0.5 text-[11px] text-slate-500">What NM2TECH pays you per hour.</p>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">{email}</dd>
            </div>
          </dl>
        )}
      </Card>
    </div>
  )
}
