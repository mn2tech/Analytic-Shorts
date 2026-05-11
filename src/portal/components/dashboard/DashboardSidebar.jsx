const NAV = [
  { id: 'timesheet', label: 'Timesheet' },
  { id: 'timeoff', label: 'Time Off' },
  { id: 'assistant', label: 'AI Assistant' },
]

function initialsFromUser(user) {
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '?'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return String(name).slice(0, 2).toUpperCase()
}

export default function DashboardSidebar({ user, activeTab, onSelectTab, onSignOut }) {
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Contractor'
  const email = user?.email || ''

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white md:h-screen md:w-72 md:border-b-0 md:border-r md:shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-nm2-accent text-lg font-bold text-white shadow-sm">
          N
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight text-slate-900">NM2TECH LLC</div>
          <div className="text-xs text-slate-500">Contractor portal</div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-5 py-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-12 w-12 rounded-full border border-slate-200 object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-nm2-accent text-sm font-semibold text-white">
            {initialsFromUser(user)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">{displayName}</div>
          <div className="truncate text-xs text-slate-500">{email}</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Navigate</p>
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            className={`rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
              activeTab === item.id
                ? 'border-l-[3px] border-nm2-accent bg-sky-50 text-nm2-accent'
                : 'border-l-[3px] border-transparent text-slate-700 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-100 p-4">
        <button
          type="button"
          onClick={onSignOut}
          className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-nm2-accent hover:text-nm2-accent"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}

