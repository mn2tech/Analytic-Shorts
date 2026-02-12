/**
 * ReportChatView – Tabbed view: Data | Report Chat | Preview.
 * Data tab: DataView. Chat tab: conversation UI. Preview tab: PreviewPanel + StyleDock or empty state.
 */

import { useRef, useEffect, useMemo, useState } from 'react'
import DataView from './DataView'
import PreviewPanel from './components/PreviewPanel'
import StyleDock from './components/StyleDock'
import { hasSpecContent } from '../../studio/utils/schemaUtils'

const DEFAULT_SUGGESTION_CHIPS = [
  'Executive summary of this dataset',
  'Monthly trend with forecast',
  'Top 5 categories by value',
  '2-tab report: Summary and Charts',
  '3-tab report: Overview, Analysis, Data'
]

function buildSuggestionChips(schema, uploadedSchema) {
  const fields = schema?.fields ?? uploadedSchema?.fields ?? []
  if (!fields.length) return DEFAULT_SUGGESTION_CHIPS
  const byType = (t) => fields.filter((f) => (f.type || '').toLowerCase() === t)
  const numeric = byType('number').map((f) => f.name)
  const dates = byType('date').map((f) => f.name)
  const categorical = fields.filter((f) => ['string', 'text'].includes((f.type || '').toLowerCase())).map((f) => f.name)
  const dim = categorical[0] || numeric[0] || fields[0]?.name
  const dateCol = dates[0]
  const chips = ['Executive summary of this dataset']
  if (dateCol) chips.push(`Monthly trend by ${dateCol}`)
  else chips.push('Monthly trend with forecast')
  if (dim) chips.push(`Top 5 ${dim} by value`)
  else chips.push('Top 5 categories by value')
  chips.push('2-tab report: Summary and Charts')
  chips.push('3-tab report: Overview, Analysis, Data')
  return chips
}

export default function ReportChatView({
  chatTab,
  setChatTab,
  chatMessages,
  pendingConversationMessage,
  loading,
  error,
  conversationInputValue,
  setConversationInputValue,
  sendConversationMessage,
  onSuggestionClick,
  spec,
  setSpec,
  data,
  uploadedData,
  dataByDatasetId,
  defaultDatasetId,
  onTabDatasetChange,
  availableDatasetIds,
  schema,
  uploadedSchema,
  filterValues,
  setFilterValues,
  dashboardTitle,
  datasetId,
  hasData,
  onGoToData,
  onLoadSampleData,
  onUploadClick,
  setDatasetId,
  dataLoadError,
  uploadedFileName,
  uploadLoading,
  uploadError,
  uploadInputRef,
  onFileUpload,
  onClearUploadedData,
  dataLakeListLoading,
  dataLakeList,
  saveToLakeName,
  setSaveToLakeName,
  saveToLakeLoading,
  saveToLakeDisabled,
  onSaveToDataLake,
  onDeleteFromDataLake,
  userDashboards,
  exampleDatasetIds,
  uploadDatasetId
}) {
  const conversationScrollRef = useRef(null)
  const [selectedWidget, setSelectedWidget] = useState(null)

  useEffect(() => {
    conversationScrollRef.current?.scrollTo({ top: conversationScrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatMessages, pendingConversationMessage, error, loading])

  const previewTitle = dashboardTitle || spec?.title || 'Executive Summary'
  const hasContent = spec && hasSpecContent(spec)
  const hasSomethingToPreview = hasData && hasContent
  const suggestionChips = useMemo(() => buildSuggestionChips(schema, uploadedSchema), [schema, uploadedSchema])

  const renderChatContent = () => (
    <div className="flex flex-col flex-1 min-h-0 border border-gray-200 bg-white rounded-lg overflow-hidden" style={{ minHeight: 320 }}>
      <div className="flex flex-col min-h-0 flex-1 border-t border-gray-100 bg-gray-50/50 px-4 py-4">
        <div ref={conversationScrollRef} className="flex-1 overflow-y-auto space-y-3 min-h-0 mb-3">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-gray-700 font-medium mb-2">Please select your data</p>
              <p className="text-sm text-gray-500 mb-4">Choose a dataset or upload a file in the Data tab to build a report.</p>
              <button
                type="button"
                onClick={() => setChatTab('data')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Go to Data
              </button>
            </div>
          ) : chatMessages.length === 0 && !pendingConversationMessage ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-gray-700 font-medium mb-2">What report do you want to build?</p>
              <p className="text-sm text-gray-500 mb-4">Send a message or pick a suggestion below.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestionChips.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onSuggestionClick(label)}
                    disabled={loading}
                    className="px-3 py-1.5 text-sm rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {chatMessages.map((msg) => (
                <div key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    {msg.role === 'assistant' ? (
                      <div className="whitespace-pre-wrap">
                        {msg.content.split(/\n/).map((line, i) => {
                          const segments = line.split(/\*\*(.+?)\*\*/g)
                          const els = segments.map((s, j) => (j % 2 === 1 ? <strong key={j} className="font-semibold">{s}</strong> : s))
                          return (
                            <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
                              {els}
                            </p>
                          )
                        })}
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {pendingConversationMessage && (
                <>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg bg-blue-600 text-white px-3 py-2 text-sm">{pendingConversationMessage}</div>
                  </div>
                  {loading && (
                    <div className="flex justify-start">
                      <div className="rounded-lg bg-gray-100 text-gray-600 px-3 py-2 text-sm flex items-center gap-1">
                        <span className="inline-flex gap-0.5">
                          <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                        </span>
                        <span className="ml-0.5">typing…</span>
                      </div>
                    </div>
                  )}
                  {error && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-lg bg-red-50 text-red-800 border border-red-200 px-3 py-2 text-sm">{error}</div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
        {hasData && (
          <div className="flex-shrink-0 flex gap-2 border-t border-gray-200 pt-3">
            <textarea
              value={conversationInputValue}
              onChange={(e) => setConversationInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendConversationMessage()
                }
              }}
              placeholder="Describe the report you want…"
              rows={2}
              disabled={loading}
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
            />
            <button
              type="button"
              onClick={sendConversationMessage}
              disabled={loading || !conversationInputValue.trim() || !datasetId}
              className="self-end px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shrink-0"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const renderPreviewContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8 min-h-[320px]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
          <p className="mt-4 text-gray-600 text-sm">Generating…</p>
        </div>
      )
    }
    if (!hasSomethingToPreview) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/80 p-8 text-center min-h-[320px]">
          <p className="text-gray-700 font-medium">Nothing to preview yet.</p>
          <p className="text-sm text-gray-500 mt-1">Start by chatting or selecting data.</p>
          <button
            type="button"
            onClick={() => setChatTab('chat')}
            className="mt-6 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Go to Report Chat
          </button>
        </div>
      )
    }
    return (
      <div className="flex-1 flex min-h-0 gap-0 rounded-lg border border-gray-200 bg-white overflow-hidden" style={{ minHeight: 320 }}>
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <PreviewPanel
            spec={spec}
            setSpec={setSpec}
            data={data}
            uploadedData={uploadedData}
            dataByDatasetId={dataByDatasetId}
            defaultDatasetId={defaultDatasetId}
            onTabDatasetChange={onTabDatasetChange}
            availableDatasetIds={availableDatasetIds}
            schema={schema}
            uploadedSchema={uploadedSchema}
            filterValues={filterValues}
            setFilterValues={setFilterValues}
            selectedWidget={selectedWidget}
            onSelectWidget={setSelectedWidget}
            loading={loading}
            title={previewTitle}
            showTitleBar={false}
            onLoadSampleData={onLoadSampleData}
            onUploadClick={onUploadClick}
          />
        </div>
        <StyleDock
          spec={spec}
          onSpecChange={setSpec}
          selectedWidget={selectedWidget}
          onClearSelection={() => setSelectedWidget(null)}
        />
      </div>
    )
  }

  const renderDataContent = () => (
    <DataView
      datasetId={datasetId}
      setDatasetId={setDatasetId}
      schema={schema}
      data={data}
      dataLoadError={dataLoadError}
      uploadedData={uploadedData}
      uploadedFileName={uploadedFileName}
      uploadLoading={uploadLoading}
      uploadError={uploadError}
      uploadInputRef={uploadInputRef}
      onFileUpload={onFileUpload}
      onClearUploadedData={onClearUploadedData}
      dataLakeListLoading={dataLakeListLoading}
      dataLakeList={dataLakeList}
      saveToLakeName={saveToLakeName}
      setSaveToLakeName={setSaveToLakeName}
      saveToLakeLoading={saveToLakeLoading}
      saveToLakeDisabled={saveToLakeDisabled}
      onSaveToDataLake={onSaveToDataLake}
      onDeleteFromDataLake={onDeleteFromDataLake}
      userDashboards={userDashboards}
      exampleDatasetIds={exampleDatasetIds}
      uploadDatasetId={uploadDatasetId}
      onNext={() => setChatTab('chat')}
    />
  )

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      <div className="border-b border-gray-200 flex gap-4 mb-3 shrink-0">
        <button
          type="button"
          onClick={() => setChatTab('data')}
          className={`px-1 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            chatTab === 'data'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Data
        </button>
        <button
          type="button"
          onClick={() => setChatTab('chat')}
          className={`px-1 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            chatTab === 'chat'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Report Chat
        </button>
        <button
          type="button"
          onClick={() => setChatTab('preview')}
          className={`px-1 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            chatTab === 'preview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Preview
        </button>
      </div>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {chatTab === 'data' && renderDataContent()}
        {chatTab === 'chat' && renderChatContent()}
        {chatTab === 'preview' && renderPreviewContent()}
      </div>
    </div>
  )
}
