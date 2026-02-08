/**
 * Fixed bottom watermark: "NM2TECH - Analytics Shorts"
 * Shown across the app (including full-screen and shared views).
 */
function BrandWatermark() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none flex justify-center py-1.5"
      aria-hidden
    >
      <span className="text-xs text-gray-400/70 font-medium tracking-wide">
        NM2TECH – Analytics Short
      </span>
    </div>
  )
}

export default BrandWatermark
