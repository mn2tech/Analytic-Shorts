import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Loader from '../components/Loader'
import DashboardCharts from '../components/DashboardCharts'
import AdvancedDashboard from '../components/AdvancedDashboard'
import TabNavigation from '../components/TabNavigation'
import MetricCards from '../components/MetricCards'
import Filters from '../components/Filters'
import AIInsights from '../components/AIInsights'
import { saveAs } from 'file-saver'
import { generateShareId, saveSharedDashboard, getShareableUrl, copyToClipboard } from '../utils/shareUtils'

function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [filteredData, setFilteredData] = useState(null)
  const [columns, setColumns] = useState([])
  const [numericColumns, setNumericColumns] = useState([])
  const [categoricalColumns, setCategoricalColumns] = useState([])
  const [dateColumns, setDateColumns] = useState([])
  const [selectedNumeric, setSelectedNumeric] = useState('')
  const [selectedCategorical, setSelectedCategorical] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [chartFilter, setChartFilter] = useState(null) // { type: 'category' | 'date', value: string }
  const [shareId, setShareId] = useState(null)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('Overview')
  const [dashboardView, setDashboardView] = useState('advanced') // 'advanced' or 'simple'
  const [dashboardTitle, setDashboardTitle] = useState('Analytics Dashboard')
  // Store the sidebar-filtered data separately
  const [sidebarFilteredData, setSidebarFilteredData] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const storedData = sessionStorage.getItem('analyticsData')
    if (!storedData) {
      navigate('/')
      return
    }

    try {
      const parsed = JSON.parse(storedData)
      initializeData(parsed)
    } catch (error) {
      console.error('Error parsing stored data:', error)
      navigate('/')
    }
  }, [])

  // Re-apply chart filter when it changes
  useEffect(() => {
    const baseData = sidebarFilteredData !== null ? sidebarFilteredData : data
    if (baseData) {
      const result = applyChartFilter(baseData)
      setFilteredData(result)
    }
  }, [chartFilter, selectedCategorical, selectedDate, sidebarFilteredData, data])

  const initializeData = (parsedData) => {
    console.log('Initializing data:', {
      dataLength: parsedData.data?.length,
      columns: parsedData.columns?.length,
      numericColumns: parsedData.numericColumns,
      categoricalColumns: parsedData.categoricalColumns,
      dateColumns: parsedData.dateColumns,
    })
    
    setData(parsedData.data)
    setFilteredData(parsedData.data)
    setSidebarFilteredData(parsedData.data)
    setColumns(parsedData.columns || [])
    setNumericColumns(parsedData.numericColumns || [])
    setCategoricalColumns(parsedData.categoricalColumns || [])
    setDateColumns(parsedData.dateColumns || [])

    // Restore dashboard view if saved (for shared dashboards)
    if (parsedData.dashboardView) {
      setDashboardView(parsedData.dashboardView)
    }

    // Generate dashboard title based on data context
    const allColumns = parsedData.columns || []
    
    // Detect domain from column names
    const detectDomain = (columns) => {
      const lowerColumns = columns.map(col => col.toLowerCase())
      
      // Medical/Healthcare indicators
      if (lowerColumns.some(col => 
        col.includes('patient') || col.includes('diagnosis') || 
        col.includes('treatment') || col.includes('medication') ||
        col.includes('department') && (col.includes('cardiology') || col.includes('orthopedic'))
      )) {
        return 'Medical Data'
      }
      
      // Sales indicators
      if (lowerColumns.some(col => 
        col.includes('sales') || col.includes('revenue') || 
        col.includes('product') || col.includes('customer')
      )) {
        return 'Sales Data'
      }
      
      // Education indicators
      if (lowerColumns.some(col => 
        col.includes('student') || col.includes('school') || 
        col.includes('grade') || col.includes('attendance')
      )) {
        return 'Education Data'
      }
      
      // Financial indicators
      if (lowerColumns.some(col => 
        col.includes('donation') || col.includes('fund') || 
        col.includes('amount') && col.includes('$')
      )) {
        return 'Financial Data'
      }
      
      return null
    }
    
    const domain = detectDomain(allColumns)
    
    if (domain) {
      setDashboardTitle(`${domain} Analytics`)
    } else if (parsedData.categoricalColumns && parsedData.categoricalColumns.length > 0) {
      // Use first categorical column as fallback
      const firstCategory = parsedData.categoricalColumns[0]
      const formattedTitle = firstCategory
        .split(/[\s_]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
      setDashboardTitle(`${formattedTitle} Analytics`)
    } else {
      setDashboardTitle('Analytics Dashboard')
    }

    // Set initial tab to "Overview"
    setActiveTab('Overview')

    // Auto-select first columns
    if (parsedData.numericColumns && parsedData.numericColumns.length > 0) {
      setSelectedNumeric(parsedData.numericColumns[0])
    }
    if (parsedData.categoricalColumns && parsedData.categoricalColumns.length > 0) {
      setSelectedCategorical(parsedData.categoricalColumns[0])
    }
    if (parsedData.dateColumns && parsedData.dateColumns.length > 0) {
      setSelectedDate(parsedData.dateColumns[0])
    }

    setLoading(false)
  }

  const applyChartFilter = (baseData) => {
    if (!baseData) return baseData
    if (!chartFilter) return baseData
    
    let result = [...baseData]
    
    // Apply chart filter if exists
    if (chartFilter.type === 'category' && selectedCategorical) {
      result = result.filter((row) => row[selectedCategorical] === chartFilter.value)
    } else if (chartFilter.type === 'date' && selectedDate) {
      result = result.filter((row) => {
        const rowDate = new Date(row[selectedDate])
        const filterDate = new Date(chartFilter.value)
        return rowDate.toDateString() === filterDate.toDateString()
      })
    }
    
    return result
  }

  const handleFilterChange = (filters, filtered) => {
    // Store sidebar-filtered data
    const sidebarFiltered = filtered || data
    setSidebarFilteredData(sidebarFiltered)
    
    // Apply chart filter on top of sidebar filters
    const result = applyChartFilter(sidebarFiltered)
    setFilteredData(result)
  }

  const handleChartFilter = (filter) => {
    setChartFilter(filter)
  }

  const clearChartFilter = () => {
    setChartFilter(null)
  }

  const handleColumnChange = (type, value) => {
    if (type === 'numeric') {
      setSelectedNumeric(value)
    } else if (type === 'categorical') {
      setSelectedCategorical(value)
    } else if (type === 'date') {
      setSelectedDate(value)
    }
  }

  const calculateStats = () => {
    if (!filteredData || !selectedNumeric) return null

    const values = filteredData
      .map((row) => parseFloat(row[selectedNumeric]))
      .filter((val) => !isNaN(val) && isFinite(val))

    if (values.length === 0) return null

    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)

    // Calculate trend (compare first half vs second half)
    const mid = Math.floor(values.length / 2)
    let trend = 0
    if (mid > 0) {
      const firstHalf = values.slice(0, mid)
      const secondHalf = values.slice(mid)
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      trend = firstAvg !== 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0
    }

    return { sum, avg, min, max, trend, column: selectedNumeric }
  }

  const downloadSummaryCSV = () => {
    if (!filteredData || filteredData.length === 0) return

    const headers = columns.join(',')
    const rows = filteredData.map((row) =>
      columns.map((col) => {
        const value = row[col] || ''
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    )

    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, 'analytics-summary.csv')
  }

  const stats = calculateStats()

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isFullscreen])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Loader />
      </div>
    )
  }

  // Check if data exists
  if (!data || data.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-yellow-900 mb-2">No Data Available</h2>
            <p className="text-yellow-700 mb-4">No data was found. Please upload a file or load an example dataset.</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Get current date for header
  const currentDate = new Date()
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Fullscreen content
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-white z-50 overflow-auto">
        {/* Fullscreen Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {dashboardTitle}
                </h1>
                <p className="text-sm text-gray-600">
                  {filteredData?.length || 0} records • {columns.length} columns
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDashboardView(dashboardView === 'advanced' ? 'simple' : 'advanced')}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                >
                  {dashboardView === 'advanced' ? 'Simple View' : 'Advanced View'}
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm flex items-center gap-2"
                  title="Exit Fullscreen (ESC)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Exit Fullscreen
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Active Filter Indicator */}
          {chartFilter && (
            <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-blue-900">
                  Filtered by: <span className="font-semibold">
                    {chartFilter.type === 'category' ? chartFilter.value : 
                     chartFilter.type === 'date' ? new Date(chartFilter.value).toLocaleDateString() : ''}
                  </span>
                </span>
              </div>
              <button
                onClick={clearChartFilter}
                className="text-sm text-blue-700 hover:text-blue-900 font-medium px-3 py-1 rounded hover:bg-blue-100 transition-colors"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* Charts Section */}
          {dashboardView === 'advanced' ? (
            <AdvancedDashboard
              data={data}
              filteredData={filteredData}
              selectedNumeric={selectedNumeric}
              selectedCategorical={selectedCategorical}
              selectedDate={selectedDate}
              onChartFilter={handleChartFilter}
              chartFilter={chartFilter}
              categoricalColumns={categoricalColumns}
            />
          ) : (
            <>
              <DashboardCharts
                data={data}
                filteredData={filteredData}
                selectedNumeric={selectedNumeric}
                selectedCategorical={selectedCategorical}
                selectedDate={selectedDate}
                onChartFilter={handleChartFilter}
                chartFilter={chartFilter}
              />
              {/* Metric Cards - Only in simple view */}
              {dashboardView === 'simple' && (
                <MetricCards
                  data={filteredData}
                  numericColumns={numericColumns}
                  selectedNumeric={selectedNumeric}
                  stats={stats}
                />
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Tab Navigation */}
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        tabs={['Overview']}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {dashboardTitle}
            </h1>
            <p className="text-sm text-gray-600">
              {filteredData?.length || 0} records • {columns.length} columns
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
              title="Enter Fullscreen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Fullscreen
            </button>
            <button
              onClick={() => setDashboardView(dashboardView === 'advanced' ? 'simple' : 'advanced')}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
            >
              {dashboardView === 'advanced' ? 'Simple View' : 'Advanced View'}
            </button>
          </div>
        </div>

        {/* Share Button */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!shareId) {
                  const newShareId = generateShareId()
                  const dashboardData = {
                    data: data,
                    columns: columns,
                    numericColumns: numericColumns,
                    categoricalColumns: categoricalColumns,
                    dateColumns: dateColumns,
                    selectedNumeric: selectedNumeric,
                    selectedCategorical: selectedCategorical,
                    selectedDate: selectedDate,
                    dashboardView: dashboardView, // Save the current view (advanced/simple)
                  }
                  if (saveSharedDashboard(newShareId, dashboardData)) {
                    setShareId(newShareId)
                    const shareUrl = getShareableUrl(newShareId)
                    const copied = await copyToClipboard(shareUrl)
                    if (copied) {
                      setShareLinkCopied(true)
                      setTimeout(() => setShareLinkCopied(false), 3000)
                    }
                  }
                } else {
                  const shareUrl = getShareableUrl(shareId)
                  const copied = await copyToClipboard(shareUrl)
                  if (copied) {
                    setShareLinkCopied(true)
                    setTimeout(() => setShareLinkCopied(false), 3000)
                  }
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {shareLinkCopied ? 'Link Copied!' : shareId ? 'Copy Share Link' : 'Share Dashboard'}
            </button>
            {shareId && (
              <span className="text-xs text-gray-500">
                Share ID: {shareId.split('_')[1]}
              </span>
            )}
          </div>
        </div>

        {/* Active Filter Indicator */}
        {chartFilter && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 animate-slide-up">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-blue-900">
                Filtered by: <span className="font-semibold">
                  {chartFilter.type === 'category' ? chartFilter.value : 
                   chartFilter.type === 'date' ? new Date(chartFilter.value).toLocaleDateString() : ''}
                </span>
              </span>
            </div>
            <button
              onClick={clearChartFilter}
              className="text-sm text-blue-700 hover:text-blue-900 font-medium px-3 py-1 rounded hover:bg-blue-100 transition-colors"
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* Charts Section */}
        {dashboardView === 'advanced' ? (
          <AdvancedDashboard
            data={data}
            filteredData={filteredData}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDate}
            onChartFilter={handleChartFilter}
            chartFilter={chartFilter}
            categoricalColumns={categoricalColumns}
          />
        ) : (
          <DashboardCharts
            data={data}
            filteredData={filteredData}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDate}
            onChartFilter={handleChartFilter}
            chartFilter={chartFilter}
          />
        )}

        {/* Metric Cards - Only in simple view */}
        {dashboardView === 'simple' && (
          <MetricCards
            data={filteredData}
            numericColumns={numericColumns}
            selectedNumeric={selectedNumeric}
            stats={stats}
          />
        )}

        {/* Filters and AI Insights - Collapsible Section */}
        <div className="mt-6 space-y-4">
          <details className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <summary className="cursor-pointer font-semibold text-gray-900 mb-4">
              Filters & AI Insights
            </summary>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
              <div className="lg:col-span-1">
                <Filters
                  data={data}
                  numericColumns={numericColumns}
                  categoricalColumns={categoricalColumns}
                  dateColumns={dateColumns}
                  onFilterChange={handleFilterChange}
                  selectedNumeric={selectedNumeric}
                  selectedCategorical={selectedCategorical}
                  selectedDate={selectedDate}
                  onColumnChange={handleColumnChange}
                />
              </div>
              <div className="lg:col-span-2">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={downloadSummaryCSV}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                  >
                    New Upload
                  </button>
                </div>
                <AIInsights 
                  data={filteredData} 
                  columns={columns} 
                  totalRows={data?.length || 0}
                  stats={stats}
                />
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

