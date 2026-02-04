import { useState } from 'react'

function DataRecommendations({ validation, onDismiss }) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (!validation || (!validation.errors?.length && !validation.warnings?.length && !validation.recommendations?.length)) {
    return null
  }

  const hasErrors = validation.errors && validation.errors.length > 0
  const hasWarnings = validation.warnings && validation.warnings.length > 0
  const hasRecommendations = validation.recommendations && validation.recommendations.length > 0

  return (
    <div className="mt-4 space-y-3">
      {/* Errors - Critical Issues */}
      {hasErrors && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-red-900 font-semibold mb-2">⚠️ Data Issues Found</h3>
                {validation.errors.map((error, index) => (
                  <div key={index} className="mb-3 last:mb-0">
                    <p className="text-red-800 font-medium">{error.message}</p>
                    <p className="text-red-700 text-sm mt-1">{error.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-red-600 hover:text-red-800 ml-4"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Warnings - Important Issues */}
      {hasWarnings && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start flex-1">
              <svg className="w-6 h-6 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full text-left"
                >
                  <h3 className="text-yellow-900 font-semibold mb-2 flex items-center">
                    ⚠️ Recommendations for Better Analysis
                    <svg
                      className={`w-5 h-5 ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </h3>
                </button>
                
                {isExpanded && (
                  <div className="space-y-4">
                    {validation.warnings.map((warning, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-yellow-200">
                        <p className="text-yellow-900 font-medium mb-2">{warning.message}</p>
                        <p className="text-yellow-800 text-sm mb-2">{warning.suggestion}</p>
                        
                        {warning.examples && warning.examples.length > 0 && (
                          <div className="mt-3">
                            <p className="text-yellow-800 text-xs font-medium mb-2">Examples:</p>
                            <div className="space-y-1">
                              {warning.examples.map((example, exIndex) => (
                                <div key={exIndex} className="text-xs bg-yellow-100 p-2 rounded">
                                  <span className="text-red-600 line-through">{example.before}</span>
                                  {' → '}
                                  <span className="text-green-600 font-medium">{example.after}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {warning.fixSteps && warning.fixSteps.length > 0 && (
                          <div className="mt-3">
                            <p className="text-yellow-800 text-xs font-medium mb-2">How to fix:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs text-yellow-800">
                              {warning.fixSteps.map((step, stepIndex) => (
                                <li key={stepIndex}>{step}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations - Optional Improvements */}
      {hasRecommendations && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-blue-900 font-semibold mb-2">💡 Optional Improvements</h3>
              <div className="space-y-2">
                {validation.recommendations.map((rec, index) => (
                  <div key={index} className="text-blue-800 text-sm">
                    <p className="font-medium">{rec.message}</p>
                    <p className="text-blue-700">{rec.suggestion}</p>
                    {rec.examples && rec.examples.length > 0 && (
                      <div className="mt-1 text-xs text-blue-600">
                        {rec.examples.map((ex, exIndex) => (
                          <span key={exIndex} className="inline-block mr-2">
                            {ex.format}: <code className="bg-blue-100 px-1 rounded">{ex.example}</code>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {validation.summary && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
          <p className="text-gray-700">
            <strong>Data Summary:</strong> {validation.summary.totalRows} rows, {validation.summary.totalColumns} columns
            {validation.summary.numericColumns > 0 && ` • ${validation.summary.numericColumns} numeric`}
            {validation.summary.dateColumns > 0 && ` • ${validation.summary.dateColumns} date`}
            {validation.summary.categoricalColumns > 0 && ` • ${validation.summary.categoricalColumns} categorical`}
          </p>
        </div>
      )}
    </div>
  )
}

export default DataRecommendations

