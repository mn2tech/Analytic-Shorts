import { useState, useEffect } from 'react'
import Navbar from './Navbar'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// Studio Widget Components (copied from StudioDashboard.jsx)
function StudioKPIWidget({ widget, queryData, format }) {
  if (!queryData || queryData.value === undefined) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        No data
      </div>
    )
  }

  const formatValue = (value) => {
    if (format?.type === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: format.currency || 'USD',
        minimumFractionDigits: format.decimals || 0,
        maximumFractionDigits: format.decimals || 0
      }).format(value)
    }
    if (format?.type === 'percentage') {
      return `${value.toFixed(format.decimals || 1)}%`
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: format.decimals || 0,
      maximumFractionDigits: format.decimals || 0
    }).format(value)
  }

  return (
    <div className="h-full flex flex-col justify-center p-4">
      <div className="text-sm text-gray-600 mb-1">{widget.title}</div>
      <div className="text-3xl font-bold text-gray-900">{formatValue(queryData.value)}</div>
    </div>
  )
}

function StudioLineChartWidget({ widget, queryData, config, format }) {
  if (!queryData || !queryData.data || queryData.data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    )
  }

  const dataKey = config?.xAxis || 'x'
  const valueKey = config?.yAxis || 'value'

  return (
    <div className="h-full p-4">
      <div className="text-sm font-medium text-gray-700 mb-2">{widget.title}</div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={queryData.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={dataKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={valueKey} stroke="#3b82f6" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function StudioBarChartWidget({ widget, queryData, config, format }) {
  if (!queryData || !queryData.data || queryData.data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    )
  }

  const dataKey = config?.xAxis || 'x'
  const valueKey = config?.yAxis || 'value'

  return (
    <div className="h-full p-4">
      <div className="text-sm font-medium text-gray-700 mb-2">{widget.title}</div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={queryData.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={dataKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={valueKey} fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function StudioWidget({ widget, queryResults }) {
  const queryData = queryResults[widget.query_ref]

  const renderWidget = () => {
    switch (widget.type) {
      case 'kpi':
        return <StudioKPIWidget widget={widget} queryData={queryData} format={widget.format} />
      case 'line_chart':
        return <StudioLineChartWidget widget={widget} queryData={queryData} config={widget.config} format={widget.format} />
      case 'bar_chart':
        return <StudioBarChartWidget widget={widget} queryData={queryData} config={widget.config} format={widget.format} />
      default:
        return <div className="h-full flex items-center justify-center text-gray-400 text-sm">Unknown widget type: {widget.type}</div>
    }
  }

  const getWidgetHeight = () => {
    switch (widget.type) {
      case 'kpi':
        return 'h-32'
      case 'line_chart':
      case 'bar_chart':
        return 'h-80'
      default:
        return 'h-64'
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${getWidgetHeight()}`}>
      {renderWidget()}
    </div>
  )
}

export default function SharedStudioDashboardView({ sharedData }) {
  const dashboard = sharedData?.dashboard
  const filterValues = sharedData?.filterValues || {}
  const queryResults = sharedData?.queryResults || {}

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Dashboard Not Found</h2>
            <p className="text-red-700 mb-4">The shared Studio dashboard could not be loaded.</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  const dashboardName = dashboard.metadata?.name || 'Untitled Dashboard'
  const dashboardDescription = dashboard.metadata?.description || ''

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-800 text-sm">
              📊 <strong>Shared Studio Dashboard</strong> - This is a read-only view
            </p>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {dashboardName}
          </h1>
          {dashboardDescription && (
            <p className="text-gray-600 mt-1">{dashboardDescription}</p>
          )}
        </div>

        {/* Filters (Read-only) */}
        {dashboard.filters && dashboard.filters.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboard.filters.map(filter => (
                <div key={filter.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {filter.label}
                  </label>
                  {filter.type === 'time_range' ? (
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={filterValues[filter.id]?.start || ''}
                        disabled
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                      />
                      <input
                        type="date"
                        value={filterValues[filter.id]?.end || ''}
                        disabled
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={filterValues[filter.id] || filter.default || 'All'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sections */}
        {dashboard.sections && Array.isArray(dashboard.sections) && dashboard.sections.length > 0 ? (
          dashboard.sections.map(section => (
            <div key={section.id} className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{section.title || 'Section'}</h2>
              <div 
                className={`grid gap-6 ${
                  section.columns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                  section.columns === 2 ? 'grid-cols-1 md:grid-cols-2' :
                  'grid-cols-1'
                }`}
              >
                {section.widgets && Array.isArray(section.widgets) ? (
                  section.widgets.map(widget => (
                    <StudioWidget
                      key={widget.id}
                      widget={widget}
                      queryResults={queryResults}
                    />
                  ))
                ) : (
                  <div className="text-gray-400 text-sm">No widgets in this section</div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              No sections defined in this dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
