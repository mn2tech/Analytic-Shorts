import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getUsage } from '../services/subscriptionService'
import { getSubscription } from '../services/subscriptionService'
import { PLANS, checkLimit } from '../config/pricing'
import { useAuth } from '../contexts/AuthContext'

function UsageStats() {
  const { user } = useAuth()
  const [usage, setUsage] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadUsage()
    } else {
      setLoading(false)
    }
  }, [user])

  const loadUsage = async () => {
    try {
      setLoading(true)
      const [usageData, subData] = await Promise.all([
        getUsage(),
        getSubscription()
      ])
      setUsage(usageData)
      setSubscription(subData)
    } catch (error) {
      console.error('Error loading usage:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user || loading) {
    return null
  }

  if (!usage || !subscription) {
    return null
  }

  const plan = PLANS[subscription.plan || 'free']
  const planLimits = plan.limits

  const getUsagePercentage = (current, limit) => {
    if (limit === -1) return 0 // unlimited
    return Math.min(100, (current / limit) * 100)
  }

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Usage & Limits</h3>
        <span className="text-sm text-gray-600 capitalize">
          {plan.name} Plan
        </span>
      </div>

      <div className="space-y-4">
        {/* Dashboards */}
        {planLimits.dashboards !== -1 && (
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Dashboards</span>
              <span className="font-semibold text-gray-900">
                {usage.usage.dashboards} / {planLimits.dashboards}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`${getUsageColor(getUsagePercentage(usage.usage.dashboards, planLimits.dashboards))} h-2 rounded-full transition-all`}
                style={{ width: `${getUsagePercentage(usage.usage.dashboards, planLimits.dashboards)}%` }}
              ></div>
            </div>
            {usage.usage.dashboards >= planLimits.dashboards && (
              <p className="text-xs text-red-600 mt-1">
                Limit reached. <Link to="/pricing" className="underline">Upgrade</Link> to create more.
              </p>
            )}
          </div>
        )}

        {/* Uploads */}
        {planLimits.uploadsPerMonth !== -1 && (
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Uploads (this month)</span>
              <span className="font-semibold text-gray-900">
                {usage.usage.uploads} / {planLimits.uploadsPerMonth}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`${getUsageColor(getUsagePercentage(usage.usage.uploads, planLimits.uploadsPerMonth))} h-2 rounded-full transition-all`}
                style={{ width: `${getUsagePercentage(usage.usage.uploads, planLimits.uploadsPerMonth)}%` }}
              ></div>
            </div>
            {usage.usage.uploads >= planLimits.uploadsPerMonth && (
              <p className="text-xs text-red-600 mt-1">
                Limit reached. <Link to="/pricing" className="underline">Upgrade</Link> for more uploads.
              </p>
            )}
          </div>
        )}

        {/* AI Insights */}
        {planLimits.aiInsights !== -1 && (
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">AI Insights (this month)</span>
              <span className="font-semibold text-gray-900">
                {usage.usage.insights} / {planLimits.aiInsights}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`${getUsageColor(getUsagePercentage(usage.usage.insights, planLimits.aiInsights))} h-2 rounded-full transition-all`}
                style={{ width: `${getUsagePercentage(usage.usage.insights, planLimits.aiInsights)}%` }}
              ></div>
            </div>
            {usage.usage.insights >= planLimits.aiInsights && (
              <p className="text-xs text-red-600 mt-1">
                Limit reached. <Link to="/pricing" className="underline">Upgrade</Link> for more insights.
              </p>
            )}
          </div>
        )}

        {/* File Size Limit */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Max File Size</span>
            <span className="font-semibold text-gray-900">
              {planLimits.fileSizeMB === -1 ? 'Unlimited' : `${planLimits.fileSizeMB}MB`}
            </span>
          </div>
        </div>

        {/* Forecasting */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Forecasting</span>
            <span className={`font-semibold ${planLimits.forecasting ? 'text-green-600' : 'text-gray-400'}`}>
              {planLimits.forecasting ? 'Available' : 'Not Available'}
            </span>
          </div>
        </div>
      </div>

      {(usage.usage.dashboards >= planLimits.dashboards || 
        usage.usage.uploads >= planLimits.uploadsPerMonth ||
        usage.usage.insights >= planLimits.aiInsights) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link
            to="/pricing"
            className="w-full block text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Upgrade Plan
          </Link>
        </div>
      )}
    </div>
  )
}

export default UsageStats


