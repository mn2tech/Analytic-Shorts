import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function AdvancedAnalytics() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleGetStarted = () => {
    if (user) {
      navigate('/pricing')
    } else {
      navigate('/signup')
    }
  }

  const features = [
    {
      icon: '📊',
      title: 'Custom reports & exports',
      description: 'Build and schedule reports, export to PDF/Excel, and share with stakeholders.',
    },
    {
      icon: '🔗',
      title: 'API & integrations',
      description: 'Connect your data to BI tools, CRMs, and automation with our API.',
    },
    {
      icon: '📈',
      title: 'Deeper dashboards',
      description: 'More widgets, filters, and drill-downs for advanced analysis.',
    },
    {
      icon: '👥',
      title: 'Team & collaboration',
      description: 'Shared workspaces, roles, and comments so teams stay aligned.',
    },
    {
      icon: '🔒',
      title: 'Enterprise security',
      description: 'SSO, audit logs, and compliance-ready controls for sensitive data.',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
            Analytics Shorts Pro
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Advanced analytics for teams that move fast
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Go beyond the feed. Unlock custom reports, exports, API access, and collaboration so you can turn data into decisions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleGetStarted}
              className="w-full sm:w-auto px-8 py-3.5 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
            >
              {user ? 'View plans & upgrade' : 'Get started'}
            </button>
            <Link
              to="/pricing"
              className="w-full sm:w-auto px-8 py-3.5 rounded-lg font-semibold text-gray-700 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-center"
            >
              See pricing
            </Link>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-blue-100 transition-all"
            >
              <span className="text-2xl mb-3 block" aria-hidden="true">
                {f.icon}
              </span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center p-8 sm:p-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Ready for advanced analytics?
          </h2>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            Join teams using Analytics Shorts to build reports, share insights, and automate their analytics.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg font-semibold text-blue-600 bg-white hover:bg-blue-50 transition-colors shadow-lg"
          >
            Compare plans
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdvancedAnalytics
