import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'

/**
 * AppShell - Top navigation, page tabs, Save/Publish controls, mode indicator
 * @param {Object} props
 * @param {Object} props.schema - App schema
 * @param {string} props.currentPageId - Current page ID
 * @param {Function} props.onPageChange - Callback when page changes
 * @param {Function} props.onSave - Callback to save app
 * @param {Function} props.onPublish - Callback to publish app
 * @param {Function} props.onOpenDataSource - Callback to open Data Source settings (optional)
 * @param {Function} props.onOpenDataMetadata - Callback to open Data & Metadata viewer (optional)
 * @param {Function} props.onOpenAiPrompt - Callback to open AI add filters/widgets (optional)
 * @param {Function} props.onStartFromScratch - Callback to discard and open new app (optional)
 * @param {boolean} props.isPublished - Whether app is in published (view-only) mode
 * @param {boolean} props.isSaving - Whether save is in progress
 */
export default function AppShell({
  schema,
  currentPageId,
  onPageChange,
  onSave,
  onPublish,
  onDuplicate,
  onSaveAsTemplate,
  onOpenDataSource,
  onOpenDataMetadata,
  onOpenAiPrompt,
  onStartFromScratch,
  isPublished = false,
  isSaving = false,
  children
}) {
  const navigate = useNavigate()
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)

  const appMetadata = schema?.metadata || {}
  const appTitle = schema?.app_title || appMetadata.name || 'Untitled App'
  const pages = schema?.pages || []

  const handlePublish = () => {
    if (onPublish) {
      setShowPublishConfirm(true)
    }
  }

  const confirmPublish = () => {
    if (onPublish) {
      onPublish()
      setShowPublishConfirm(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      
      {/* App Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* App Title and Mode */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/studio')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Back to Studio"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {onStartFromScratch && (
                <button
                  type="button"
                  onClick={onStartFromScratch}
                  className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                  title="Discard and start a new app"
                >
                  Start from scratch
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{appTitle}</h1>
                {isPublished && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Published
                    </span>
                    {appMetadata.version && (
                      <span className="text-xs text-gray-500">v{appMetadata.version}</span>
                    )}
                  </div>
                )}
                {!isPublished && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                    Draft Mode
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isPublished && (
              <div className="flex items-center gap-2">
                {onOpenDataSource && (
                  <button
                    type="button"
                    onClick={onOpenDataSource}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                    title="Configure data source / API"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                    Data source
                  </button>
                )}
                {onOpenDataMetadata && (
                  <button
                    type="button"
                    onClick={onOpenDataMetadata}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                    title="View source data and metadata"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Data &amp; Metadata
                  </button>
                )}
                {onOpenAiPrompt && (
                  <button
                    type="button"
                    onClick={onOpenAiPrompt}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 transition-colors font-medium text-sm"
                    title="Add filters and widgets using natural language"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Add with AI
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onClick={onDuplicate}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Duplicate this app"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Duplicate
                  </button>
                )}
                {onSaveAsTemplate && (
                  <button
                    onClick={onSaveAsTemplate}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save as reusable template"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Save as Template
                  </button>
                )}
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save
                    </>
                  )}
                </button>
                <button
                  onClick={handlePublish}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Publish
                </button>
              </div>
            )}
          </div>

          {/* Page Navigation Tabs */}
          {pages.length > 1 && (
            <div className="flex items-center gap-1 border-t border-gray-200">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => onPageChange(page.id)}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                    currentPageId === page.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {page.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Page Content */}
      {children}

      {/* Publish Confirmation Modal */}
      {showPublishConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Publish App</h3>
            <p className="text-gray-600 mb-6">
              Publishing this app will make it view-only and lock the current version. 
              You can still create a new draft from this published version.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowPublishConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPublish}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Confirm Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
