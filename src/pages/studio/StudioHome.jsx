import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { listDashboards, deleteDashboard, saveDashboard } from '../../studio/api/studioClient'

/**
 * Studio Home - Minimal entry point.
 * "New app" starts a clean slate; list shows saved apps (all open in /studio/app/:id).
 */
/** DashboardSpec used by Studio (same as AI Visual Builder). Create with AI uses this. */
function getCreateWithAiSchema(promptText) {
  const name = promptText && promptText.trim().length > 0
    ? promptText.trim().slice(0, 50) + (promptText.trim().length > 50 ? '…' : '')
    : 'AI App'
  return {
    title: name,
    filters: [],
    kpis: [],
    charts: [],
    layout: [],
    style: { theme: 'executive_clean' },
    warnings: [],
    datasetId: 'sales',
    metadata: {
      name,
      description: 'Created with AI',
      status: 'draft',
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
}

export default function StudioHome() {
  const navigate = useNavigate()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [createWithAiPrompt, setCreateWithAiPrompt] = useState('')
  const [creatingWithAi, setCreatingWithAi] = useState(false)
  const [createWithAiError, setCreateWithAiError] = useState(null)

  useEffect(() => {
    loadApps()
  }, [])

  async function loadApps() {
    try {
      setLoading(true)
      setError(null)
      const data = await listDashboards()
      const list = (data || []).map((d) => {
        let schema = d.schema
        if (typeof schema === 'string') {
          try {
            schema = JSON.parse(schema)
          } catch {
            schema = null
          }
        }
        return {
          id: d.id,
          name: d.name || schema?.title || schema?.app_title || schema?.metadata?.name || 'Untitled App',
          schema,
          updated_at: d.updated_at || d.created_at
        }
      })
      setApps(list)
    } catch (err) {
      console.error('Studio loadApps:', err)
      setError(err.message || 'Failed to load apps')
      if (err.message?.includes('Authentication')) setApps([])
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(e, appId) {
    e.stopPropagation()
    if (!window.confirm('Delete this app? This cannot be undone.')) return
    try {
      await deleteDashboard(appId)
      await loadApps()
    } catch (err) {
      alert(err.message || 'Failed to delete')
    }
  }

  async function handleCreateWithAi() {
    const prompt = (createWithAiPrompt || '').trim()
    if (!prompt) {
      setCreateWithAiError('Describe what you want (e.g. a Data tab and a Graph tab with charts).')
      return
    }
    setCreatingWithAi(true)
    setCreateWithAiError(null)
    try {
      const schema = getCreateWithAiSchema(prompt)
      const saved = await saveDashboard(schema, null)
      const appId = saved?.id
      if (!appId) throw new Error('No app ID returned')
      navigate(`/studio/app/${appId}`, { state: { createWithAiPrompt: prompt }, replace: false })
    } catch (err) {
      setCreateWithAiError(err.message || 'Failed to create app')
    } finally {
      setCreatingWithAi(false)
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '—'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Studio</h1>
          <p className="text-gray-600">Build analytics apps from a clean slate.</p>
        </div>

        {/* Create with AI - prompt box */}
        <div className="mb-8 p-5 rounded-xl border border-emerald-200 bg-white shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Create with AI</h2>
          <p className="text-sm text-gray-600 mb-3">
            Describe your app in plain language. We’ll create an app with sample data and open the editor to generate tabs and charts (e.g. Data tab + Graph tab like Tableau).
          </p>
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <textarea
                value={createWithAiPrompt}
                onChange={e => { setCreateWithAiPrompt(e.target.value); setCreateWithAiError(null) }}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleCreateWithAi())}
                placeholder="e.g. Create a Data tab with a table and a Graph tab with bar chart and pie chart like Tableau"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm placeholder-gray-400 resize-none"
                disabled={creatingWithAi}
              />
              {createWithAiError && (
                <p className="mt-1.5 text-sm text-red-600">{createWithAiError}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleCreateWithAi}
              disabled={creatingWithAi || !createWithAiPrompt.trim()}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {creatingWithAi ? (
                <>
                  <span className="inline-block w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Create with AI
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-4 items-center">
          <button
            onClick={() => navigate('/studio/app/new')}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            New app
          </button>
          <Link
            to="/"
            className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
          >
            Back to Analytics Shorts
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : apps.length === 0 ? (
          <div className="text-center py-12 rounded-lg border border-gray-200 bg-white">
            <p className="text-gray-500 mb-4">No apps yet.</p>
            <button
              onClick={() => navigate('/studio/app/new')}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              New app
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {apps.map((app) => (
              <li
                key={app.id}
                className="flex items-center justify-between gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/studio/app/${app.id}`)}
                  className="flex-1 text-left"
                >
                  <span className="font-medium text-gray-900">{app.name}</span>
                  <span className="ml-2 text-sm text-gray-400">
                    {formatDate(app.updated_at)}
                  </span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/studio/app/${app.id}`)}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, app.id)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Footer />
    </div>
  )
}
