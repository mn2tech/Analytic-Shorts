import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../config/api'

function AdminAnalytics() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [visitorStats, setVisitorStats] = useState(null)
  const [usageStats, setUsageStats] = useState(null)
  const [apiReports, setApiReports] = useState([])
  const [updatingReportId, setUpdatingReportId] = useState(null)
  const [error, setError] = useState(null)
  const [days, setDays] = useState(7)

  useEffect(() => {
    fetchStats()
  }, [days])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // apiClient automatically adds auth token via interceptor.
      // Use allSettled so one optional panel failure doesn't block the entire page.
      const [visitorsResult, usageResult, reportsResult] = await Promise.allSettled([
        apiClient.get(`/api/analytics/visitors?days=${days}`),
        apiClient.get('/api/analytics/usage'),
        apiClient.get('/api/example/api-reports')
      ])

      if (visitorsResult.status === 'rejected' || usageResult.status === 'rejected') {
        const analyticsError = visitorsResult.status === 'rejected'
          ? visitorsResult.reason
          : usageResult.reason
        throw analyticsError
      }

      setVisitorStats(visitorsResult.value.data)
      setUsageStats(usageResult.value.data)

      if (reportsResult.status === 'fulfilled') {
        setApiReports(Array.isArray(reportsResult.value?.data?.reports) ? reportsResult.value.data.reports : [])
      } else {
        console.warn('API report visibility panel unavailable:', reportsResult.reason)
        setApiReports([])
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
      if (err.response?.status === 403) {
        setError('Admin access required. You must be an admin to view analytics.')
      } else {
        setError('Failed to load analytics. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleReportVisibility = async (report) => {
    const nextHidden = !report.isHidden
    setUpdatingReportId(report.id)
    try {
      await apiClient.put(`/api/example/api-reports/${report.id}/visibility`, {
        hidden: nextHidden
      })
      setApiReports((prev) =>
        prev.map((item) => (item.id === report.id ? { ...item, isHidden: nextHidden } : item))
      )
    } catch (err) {
      console.error('Failed to update report visibility:', err)
      alert(err?.response?.data?.error || 'Failed to update report visibility')
    } finally {
      setUpdatingReportId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">Loading analytics...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Admin Analytics</h1>
          <div className="flex items-center gap-4">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Visitor Statistics */}
        {visitorStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Visits</h3>
              <p className="text-3xl font-bold text-gray-900">{visitorStats.total_visits}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Unique Visitors</h3>
              <p className="text-3xl font-bold text-gray-900">{visitorStats.unique_visitors}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Logged In Users</h3>
              <p className="text-3xl font-bold text-gray-900">{visitorStats.unique_logged_in}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Response Time</h3>
              <p className="text-3xl font-bold text-gray-900">{visitorStats.average_response_time}ms</p>
            </div>
          </div>
        )}

        {/* Usage Statistics */}
        {usageStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-gray-900">{usageStats.total_users}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">New signups (7 days)</h3>
              <p className="text-3xl font-bold text-gray-900">{usageStats.new_signups_7d ?? 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">New signups (30 days)</h3>
              <p className="text-3xl font-bold text-gray-900">{usageStats.new_signups_30d ?? 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Active This Month</h3>
              <p className="text-3xl font-bold text-gray-900">{usageStats.active_users_this_month}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Uploads This Month</h3>
              <p className="text-3xl font-bold text-gray-900">{usageStats.total_uploads_this_month}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">AI Insights This Month</h3>
              <p className="text-3xl font-bold text-gray-900">{usageStats.total_insights_this_month}</p>
            </div>
          </div>
        )}

        {/* Recent signups (who joined) */}
        {usageStats?.recent_signups && usageStats.recent_signups.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent signups (who joined)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usageStats.recent_signups.map((u, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-sm text-gray-900">{u.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top Paths */}
        {visitorStats?.top_paths && visitorStats.top_paths.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Most Visited Pages</h2>
            <div className="space-y-2">
              {visitorStats.top_paths.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-700">{item.path}</span>
                  <span className="font-semibold text-gray-900">{item.count} visits</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Users */}
        {visitorStats?.top_users && visitorStats.top_users.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Most Active Users</h2>
            <div className="space-y-2">
              {visitorStats.top_users.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-700">{item.email}</span>
                  <span className="font-semibold text-gray-900">{item.count} requests</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">API Report Visibility</h2>
          <p className="text-sm text-gray-600 mb-4">
            Hide API reports from regular users while keeping admin access.
          </p>
          <div className="space-y-3">
            {apiReports.map((report) => (
              <div key={report.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{report.name}</p>
                    <span className={`text-xs px-2 py-1 rounded ${report.isHidden ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {report.isHidden ? 'Hidden' : 'Visible'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{report.description}</p>
                  <p className="text-xs text-gray-500 mt-1 font-mono">{report.endpoint}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleReportVisibility(report)}
                  disabled={updatingReportId === report.id}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    report.isHidden
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {updatingReportId === report.id
                    ? 'Saving...'
                    : report.isHidden
                    ? 'Show to users'
                    : 'Hide from users'}
                </button>
              </div>
            ))}
            {apiReports.length === 0 && (
              <p className="text-sm text-gray-500">No API reports found.</p>
            )}
          </div>
        </div>

        {/* Recent Visits */}
        {visitorStats?.recent_visits && visitorStats.recent_visits.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Path</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Response Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visitorStats.recent_visits.map((visit, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(visit.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{visit.user_email}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-mono">{visit.path}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded ${
                          visit.status_code >= 200 && visit.status_code < 300
                            ? 'bg-green-100 text-green-800'
                            : visit.status_code >= 400
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {visit.status_code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{visit.response_time_ms}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminAnalytics

