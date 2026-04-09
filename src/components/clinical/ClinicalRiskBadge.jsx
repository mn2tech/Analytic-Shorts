import { getRiskBandColorClass } from '../../utils/clinicalRiskEngine'

const BAND_LABELS = {
  green: 'Green',
  yellow: 'Yellow',
  orange: 'Orange',
  red: 'Red',
}

export default function ClinicalRiskBadge({ riskBand = 'green', riskScore = 0, statusLabel = null, compact = false }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 ${getRiskBandColorClass(riskBand)} ${compact ? 'text-[10px]' : 'text-xs'}`}>
      <span className="font-semibold">{BAND_LABELS[riskBand] || 'Green'}</span>
      <span className="opacity-90">{riskScore}</span>
      {statusLabel && !compact && <span className="opacity-90">• {statusLabel}</span>}
    </div>
  )
}
