import DashboardRenderer from '../aiVisualBuilder/DashboardRenderer'

export default function DashboardMessage({ spec, data }) {
  if (!spec) return null

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">{spec.title || 'Claude Dashboard'}</p>
          <p className="text-xs text-gray-500">Rendered from the dashboard spec Claude created</p>
        </div>
      </div>
      <div className="max-h-[62vh] overflow-auto p-2 sm:p-3">
        <DashboardRenderer spec={spec} data={Array.isArray(data) ? data : []} />
      </div>
    </div>
  )
}
