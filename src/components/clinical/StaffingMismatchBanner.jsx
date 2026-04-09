export default function StaffingMismatchBanner({ unitMetrics = [] }) {
  const mismatchUnits = unitMetrics.filter((u) => u.acuityStaffMismatch)
  if (!mismatchUnits.length) return null
  return (
    <div className="rounded-xl border border-orange-400/40 bg-orange-500/10 px-3 py-2">
      <p className="text-xs font-semibold text-orange-200">Acuity-Staffing Mismatch</p>
      <p className="text-sm text-orange-100 mt-1">
        {mismatchUnits.map((u) => `${u.unitName} acuity-capacity mismatch`).join(' • ')}
      </p>
    </div>
  )
}
