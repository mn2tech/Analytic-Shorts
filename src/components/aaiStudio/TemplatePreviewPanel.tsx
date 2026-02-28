import { getTemplateById } from '../../studio/templatesCatalog'

const accent = '#58a6ff'
const sidebarBorder = '#2d323b'
const sidebarText = '#e6edf3'
const sidebarMuted = '#8b949e'
const inputBg = '#21262d'

type TemplatePreviewPanelProps = {
  selectedCatalogId: string
  hasDataset: boolean
  loading: boolean
  onBuildDashboard: () => void
  onUploadData: () => void
}

export default function TemplatePreviewPanel({
  selectedCatalogId,
  hasDataset,
  loading,
  onBuildDashboard,
  onUploadData,
}: TemplatePreviewPanelProps) {
  const template = getTemplateById(selectedCatalogId || 'general')

  return (
    <div
      className="flex flex-col rounded-2xl border overflow-hidden shrink-0"
      style={{ background: 'rgba(26,29,35,0.95)', borderColor: sidebarBorder, minWidth: 280, maxWidth: 360 }}
    >
      <div className="p-5 border-b" style={{ borderColor: sidebarBorder }}>
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: sidebarMuted }}>
          {template.category}
        </span>
        <h2 className="text-lg font-semibold mt-1" style={{ color: sidebarText }}>{template.name}</h2>
        <p className="text-sm mt-2" style={{ color: sidebarMuted }}>{template.description}</p>
      </div>

      <div className="p-5 flex-1 overflow-auto">
        <ul className="space-y-2 text-sm" style={{ color: sidebarText }}>
          {(template.previewBullets || []).map((bullet, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0" style={{ color: accent }}>•</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-5 pt-0 space-y-2">
        <button
          type="button"
          onClick={onBuildDashboard}
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1d23]"
          style={{ background: accent, color: '#fff' }}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Building...
            </span>
          ) : hasDataset ? (
            'Build dashboard'
          ) : (
            'Use with sample data'
          )}
        </button>
        <button
          type="button"
          onClick={onUploadData}
          className="w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1d23]"
          style={{ background: inputBg, color: sidebarMuted, border: `1px solid ${sidebarBorder}` }}
        >
          Upload data
        </button>
      </div>
    </div>
  )
}
