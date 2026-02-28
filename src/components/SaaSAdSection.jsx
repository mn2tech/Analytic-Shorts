import { Link } from 'react-router-dom'

/**
 * Promo section for advertising SaaS / Advanced Analytics.
 * Used in Feed sidebar (and can be reused elsewhere).
 */
export default function SaaSAdSection({ className = '' }) {
  return (
    <div className={`rounded-lg bg-white border border-gray-200/80 overflow-hidden ${className}`}>
      <div className="px-3 py-2.5 border-b border-gray-100 bg-gradient-to-r from-indigo-50/80 to-white">
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Sponsored</span>
      </div>
      <div className="p-3 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Advanced Analytics (SaaS)</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          Unlock custom reports, API access, team collaboration, and enterprise features. Built for teams that move fast.
        </p>
        <Link
          to="/advanced-analytics"
          className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Learn more
        </Link>
      </div>
    </div>
  )
}
