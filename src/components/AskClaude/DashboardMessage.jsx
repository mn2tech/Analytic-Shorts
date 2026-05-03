import DashboardRenderer from '../aiVisualBuilder/DashboardRenderer'
import { TD } from '../../constants/terminalDashboardPalette'

export default function DashboardMessage({ spec, data }) {
  if (!spec) return null

  return (
    <div
      className="mt-3 overflow-hidden rounded-xl shadow-sm"
      style={{
        border: `0.5px solid ${TD.CARD_BORDER}`,
        background: TD.PAGE_BG,
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: `0.5px solid ${TD.CARD_BORDER}`, background: TD.CARD_BG }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: TD.TEXT_1 }}>
            {spec.title || 'Claude Dashboard'}
          </p>
          <p className="text-xs" style={{ color: TD.TEXT_3 }}>
            Rendered from the dashboard spec Claude created
          </p>
        </div>
      </div>
      <div className="max-h-[62vh] overflow-auto p-2 sm:p-3" style={{ background: TD.PAGE_BG }}>
        <DashboardRenderer spec={spec} data={Array.isArray(data) ? data : []} />
      </div>
    </div>
  )
}
