/**
 * Header - NM2TECH FloorMap AI branding.
 * Healthcare operations styling.
 */
export default function Header() {
  return (
    <header className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-800">NM2TECH FloorMap AI</h1>
          <p className="text-xs text-slate-500">Floor plan room detection & ER bed map export</p>
        </div>
      </div>
    </header>
  )
}
