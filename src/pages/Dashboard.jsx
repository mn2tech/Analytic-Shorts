import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { parseNumericValue } from '../utils/numberUtils'
import Navbar from '../components/Navbar'
import Loader from '../components/Loader'
import DashboardCharts from '../components/DashboardCharts'
import AdvancedDashboard from '../components/AdvancedDashboard'
import MetricCards from '../components/MetricCards'
import Filters from '../components/Filters'
import AIInsights from '../components/AIInsights'
import ForecastChart from '../components/ForecastChart'
import DataMetadataEditor from '../components/DataMetadataEditor'
import TimeSeriesReport from '../components/TimeSeriesReport'
import { saveAs } from 'file-saver'
import { generateShareId, saveSharedDashboard, getShareableUrl, copyToClipboard } from '../utils/shareUtils'
import { saveDashboard, updateDashboard } from '../services/dashboardService'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'

function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
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
  const [dashboardView, setDashboardView] = useState('advanced') // 'advanced', 'simple', 'data', or 'timeseries'
  const [dashboardTitle, setDashboardTitle] = useState('Analytics Dashboard')
  // Store the sidebar-filtered data separately
  const [sidebarFilteredData, setSidebarFilteredData] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [savedDashboardId, setSavedDashboardId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const hasInitialized = useRef(false)

  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current) return
    
    // First check if data was passed via navigation state (for large files that exceed storage quota)
    if (location.state?.analyticsData) {
      hasInitialized.current = true
      const analyticsData = location.state.analyticsData
      // Clear navigation state AFTER capturing the data
      navigate(location.pathname, { replace: true, state: {} })
      // Initialize with captured data
      initializeData(analyticsData)
      return
    }

    // Otherwise, try to get from sessionStorage
    const storedData = sessionStorage.getItem('analyticsData')
    if (!storedData) {
      navigate('/')
      return
    }

    try {
      hasInitialized.current = true
      const parsed = JSON.parse(storedData)
      if (!parsed || !parsed.data) {
        console.error('Invalid data in sessionStorage:', parsed)
        sessionStorage.removeItem('analyticsData')
        navigate('/')
        return
      }
      initializeData(parsed)
    } catch (error) {
      console.error('Error parsing stored data:', error)
      sessionStorage.removeItem('analyticsData')
      navigate('/')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount - location.state is checked but not in deps to prevent re-runs

  // Re-apply chart filter when it changes
  useEffect(() => {
    const baseData = sidebarFilteredData !== null ? sidebarFilteredData : data
    if (baseData) {
      const result = applyChartFilter(baseData)
      setFilteredData(result)
    }
  }, [chartFilter, selectedCategorical, selectedDate, sidebarFilteredData, data])

  const initializeData = (parsedData) => {
    try {
      console.log('Initializing data:', {
        dataLength: parsedData?.data?.length,
        columns: parsedData?.columns?.length,
        numericColumns: parsedData?.numericColumns,
        categoricalColumns: parsedData?.categoricalColumns,
        dateColumns: parsedData?.dateColumns,
      })
      
      // Validate parsedData
      if (!parsedData || !parsedData.data || !Array.isArray(parsedData.data)) {
        console.error('Invalid data format:', parsedData)
        setLoading(false)
        return
      }
      
      // For large datasets, aggressively sample the data for display
      // This ensures smooth performance and responsive UI
      const MAX_ROWS_FOR_DISPLAY = 10000 // Reduced from 100k for better performance
      let displayData = parsedData.data
      
      if (parsedData.data && parsedData.data.length > MAX_ROWS_FOR_DISPLAY) {
        console.warn(`Dataset has ${parsedData.data.length} rows. Sampling ${MAX_ROWS_FOR_DISPLAY} rows for display to ensure smooth performance.`)
        // Sample evenly across the dataset
        const step = Math.ceil(parsedData.data.length / MAX_ROWS_FOR_DISPLAY)
        displayData = parsedData.data.filter((_, index) => index % step === 0)
        console.log(`Sampled to ${displayData.length} rows for optimal performance`)
      }
      
      // Store full data and sampled data separately
      setData(displayData) // Use sampled data for display
      setFilteredData(displayData)
      setSidebarFilteredData(displayData)
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

      // Ensure loading is set to false after initialization
      console.log('Setting loading to false. Display data length:', displayData?.length)
      setLoading(false)
      console.log('Data initialization complete. Data length:', displayData?.length, 'Columns:', parsedData.columns?.length, 'Numeric columns:', parsedData.numericColumns?.length)
    } catch (error) {
      console.error('Error initializing data:', error)
      setLoading(false)
      // Show error message to user
      alert(`Error loading data: ${error.message}. Please try uploading again.`)
    }
  }

  const applyChartFilter = (baseData) => {
    if (!baseData) return baseData
    if (!chartFilter) return baseData
    
    // For large arrays, use slice instead of spread to avoid stack overflow
    let result = baseData.length > 50000 
      ? baseData.slice() 
      : [...baseData]
    
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
    // Use requestAnimationFrame to make filtering non-blocking
    requestAnimationFrame(() => {
      // Store sidebar-filtered data
      const sidebarFiltered = filtered || data
      setSidebarFilteredData(sidebarFiltered)
      
      // Apply chart filter on top of sidebar filters
      requestAnimationFrame(() => {
        const result = applyChartFilter(sidebarFiltered)
        setFilteredData(result)
      })
    })
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

  // Memoize stats calculation to prevent recalculation on every render
  const calculateStats = useMemo(() => {
    if (!filteredData || !selectedNumeric) return null

    // Sample data if too large for performance
    const sampleSize = 5000
    const sampledData = filteredData.length > sampleSize 
      ? filteredData.filter((_, i) => i % Math.ceil(filteredData.length / sampleSize) === 0)
      : filteredData

      const values = sampledData
        .map((row) => parseNumericValue(row[selectedNumeric]))
        .filter((val) => val !== 0 || row[selectedNumeric] === '0' || row[selectedNumeric] === '$0') // Keep zeros if they're valid

    if (values.length === 0) return null

    // Optimize min/max calculation for large arrays
    let min = Infinity
    let max = -Infinity
    let sum = 0
    
    for (let i = 0; i < values.length; i++) {
      const val = values[i]
      sum += val
      if (val < min) min = val
      if (val > max) max = val
    }

    const avg = sum / values.length

    // Calculate trend (compare first half vs second half) - sample if too large
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
  }, [filteredData, selectedNumeric])

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

  const downloadSummaryExcel = () => {
    if (!filteredData || filteredData.length === 0) return

    try {
      // Prepare data for Excel
      const excelData = filteredData.map(row => {
        const excelRow = {}
        columns.forEach(col => {
          excelRow[col] = row[col] || ''
        })
        return excelRow
      })

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics Data')

      // Generate Excel file
      XLSX.writeFile(workbook, 'analytics-summary.xlsx')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Error exporting to Excel. Please try again.')
    }
  }

  const downloadDashboardPDF = async (event) => {
    try {
      // Find the main dashboard container
      const dashboardElement = document.querySelector('.min-h-screen')
      if (!dashboardElement) {
        alert('Could not find dashboard content to export.')
        return
      }

      // Show loading state
      const originalButton = event?.target
      if (originalButton) {
        originalButton.disabled = true
        originalButton.textContent = 'Generating PDF...'
      }

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const canvas = await html2canvas(dashboardElement, {
        scale: 2,
        useCORS: true,
        logging: false
      })

      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Save PDF
      pdf.save('analytics-dashboard.pdf')

      // Restore button
      if (originalButton) {
        originalButton.disabled = false
        originalButton.textContent = 'Export PDF'
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      alert('Error exporting to PDF. Please try again.')
      if (event?.target) {
        event.target.disabled = false
        event.target.textContent = 'Export PDF'
      }
    }
  }

  const handleSaveDashboard = async () => {
    if (!data || data.length === 0) return

    setSaving(true)
    setSaveSuccess(false)

    try {
      const dashboardData = {
        name: dashboardTitle,
        data: data,
        columns: columns,
        numericColumns: numericColumns,
        categoricalColumns: categoricalColumns,
        dateColumns: dateColumns,
        selectedNumeric: selectedNumeric,
        selectedCategorical: selectedCategorical,
        selectedDate: selectedDate,
        dashboardView: dashboardView
      }

      let result
      if (savedDashboardId) {
        // Update existing dashboard
        result = await updateDashboard(savedDashboardId, dashboardData)
      } else {
        // Create new dashboard
        result = await saveDashboard(dashboardData)
        setSavedDashboardId(result.id)
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving dashboard:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save dashboard. Please try again.'
      alert(`Failed to save dashboard: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  const stats = calculateStats

  const handleMetadataUpdate = (newMetadata) => {
    try {
      // Validate new metadata
      if (!newMetadata || !newMetadata.numericColumns || !newMetadata.categoricalColumns || !newMetadata.dateColumns) {
        console.error('Invalid metadata update:', newMetadata)
        alert('Error: Invalid metadata format. Please try again.')
        return
      }

      // Update column type arrays
      setNumericColumns(newMetadata.numericColumns || [])
      setCategoricalColumns(newMetadata.categoricalColumns || [])
      setDateColumns(newMetadata.dateColumns || [])
      
      // Preserve selected columns if they still exist in their new type arrays
      // If a column was moved to a different type, try to find it in the new arrays
      let newSelectedNumeric = selectedNumeric
      let newSelectedDate = selectedDate
      let newSelectedCategorical = selectedCategorical

      // Check if current selected numeric column is still numeric
      if (selectedNumeric && !newMetadata.numericColumns.includes(selectedNumeric)) {
        // Check if it moved to date or categorical
        if (newMetadata.dateColumns.includes(selectedNumeric)) {
          newSelectedDate = selectedNumeric
          newSelectedNumeric = newMetadata.numericColumns[0] || ''
        } else if (newMetadata.categoricalColumns.includes(selectedNumeric)) {
          newSelectedCategorical = selectedNumeric
          newSelectedNumeric = newMetadata.numericColumns[0] || ''
        } else {
          newSelectedNumeric = newMetadata.numericColumns[0] || ''
        }
      }

      // Check if current selected date column is still date
      if (selectedDate && !newMetadata.dateColumns.includes(selectedDate)) {
        // Check if it moved to numeric or categorical
        if (newMetadata.numericColumns.includes(selectedDate)) {
          newSelectedNumeric = selectedDate
          newSelectedDate = newMetadata.dateColumns[0] || ''
        } else if (newMetadata.categoricalColumns.includes(selectedDate)) {
          newSelectedCategorical = selectedDate
          newSelectedDate = newMetadata.dateColumns[0] || ''
        } else {
          newSelectedDate = newMetadata.dateColumns[0] || ''
        }
      }

      // Check if current selected categorical column is still categorical
      if (selectedCategorical && !newMetadata.categoricalColumns.includes(selectedCategorical)) {
        // Check if it moved to numeric or date
        if (newMetadata.numericColumns.includes(selectedCategorical)) {
          newSelectedNumeric = selectedCategorical
          newSelectedCategorical = newMetadata.categoricalColumns[0] || ''
        } else if (newMetadata.dateColumns.includes(selectedCategorical)) {
          newSelectedDate = selectedCategorical
          newSelectedCategorical = newMetadata.categoricalColumns[0] || ''
        } else {
          newSelectedCategorical = newMetadata.categoricalColumns[0] || ''
        }
      }

      // Update selected columns
      setSelectedNumeric(newSelectedNumeric)
      setSelectedDate(newSelectedDate)
      setSelectedCategorical(newSelectedCategorical)
      
      // Show success message (use setTimeout to prevent blocking)
      setTimeout(() => {
        alert('Metadata updated successfully! Charts will now use the new column types.')
      }, 100)
    } catch (error) {
      console.error('Error updating metadata:', error)
      setTimeout(() => {
        alert('Error updating metadata. Please try again.')
      }, 100)
    }
  }

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
    console.log('Dashboard: Still loading. Data:', data, 'Has initialized:', hasInitialized.current)
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Loader />
      </div>
    )
  }
  
  console.log('Dashboard: Rendering. Data length:', data?.length, 'Filtered data length:', filteredData?.length, 'Columns:', columns?.length, 'Selected numeric:', selectedNumeric, 'Selected categorical:', selectedCategorical)
  
  // Check if data exists - but don't redirect if we're in the middle of a metadata update
  if (!data || data.length === 0) {
    console.warn('Dashboard: No data available. Data:', data, 'Loading:', loading, 'Has initialized:', hasInitialized.current)
    
    // Only redirect if we've actually initialized and there's truly no data
    // This prevents blank page during metadata updates
    if (hasInitialized.current) {
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
    // If not initialized yet, show loading
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Loader />
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
              <div className="flex items-center gap-2 relative">
                {/* Filters Button & Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
                    title="Filters"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filters
                    {showFilters && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </button>
                  
                  {/* Filters Dropdown Panel */}
                  {showFilters && (
                    <>
                      {/* Backdrop to close on outside click */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowFilters(false)}
                      ></div>
                      
                      {/* Dropdown Panel */}
                      <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-y-auto">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Filters & Columns</h3>
                            <button
                              onClick={() => setShowFilters(false)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
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
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setDashboardView('advanced')}
                    className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                      dashboardView === 'advanced'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Charts
                  </button>
                  <button
                    onClick={() => setDashboardView('timeseries')}
                    className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                      dashboardView === 'timeseries'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Time Series
                  </button>
                  <button
                    onClick={() => setDashboardView('data')}
                    className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                      dashboardView === 'data'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Data & Metadata
                  </button>
                </div>
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
          {dashboardView === 'data' ? (
            <DataMetadataEditor
              data={data}
              columns={columns}
              numericColumns={numericColumns}
              categoricalColumns={categoricalColumns}
              dateColumns={dateColumns}
              onMetadataUpdate={handleMetadataUpdate}
            />
          ) : dashboardView === 'advanced' ? (
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-purple-50 watermark-bg relative">
      {/* Analytics Watermark Pattern */}
      <div className="analytics-watermark"></div>
      <div className="analytics-watermark-icons"></div>
      <Navbar />

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
          <div className="flex items-center gap-2 mt-2 sm:mt-0 relative">
            {/* Filters Button & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
                title="Filters"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {showFilters && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                )}
              </button>
              
              {/* Filters Dropdown Panel */}
              {showFilters && (
                <>
                  {/* Backdrop to close on outside click */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowFilters(false)}
                  ></div>
                  
                  {/* Dropdown Panel */}
                  <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-y-auto">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Filters & Columns</h3>
                        <button
                          onClick={() => setShowFilters(false)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
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
                  </div>
                </>
              )}
            </div>
            
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
            <div className="flex gap-2">
              <button
                onClick={() => setDashboardView('advanced')}
                className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                  dashboardView === 'advanced'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                Charts
              </button>
              <button
                onClick={() => setDashboardView('data')}
                className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                  dashboardView === 'data'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                Data & Metadata
              </button>
            </div>
          </div>
        </div>

        {/* Save & Share Buttons */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDashboard}
              disabled={saving || !data}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {savedDashboardId ? 'Update Dashboard' : 'Save Dashboard'}
                </>
              )}
            </button>
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
        {dashboardView === 'data' ? (
          <DataMetadataEditor
            data={data}
            columns={columns}
            numericColumns={numericColumns}
            categoricalColumns={categoricalColumns}
            dateColumns={dateColumns}
            onMetadataUpdate={handleMetadataUpdate}
          />
        ) : dashboardView === 'advanced' ? (
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

        {/* AI Insights Section */}
        <div className="mt-6 space-y-4">
          <details className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <summary className="cursor-pointer font-semibold text-gray-900 mb-4">
              AI Insights & Export
            </summary>
            <div className="mt-4">
              <div className="flex gap-2 mb-4 flex-wrap">
                <button
                  onClick={downloadSummaryCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  Export CSV
                </button>
                <button
                  onClick={downloadSummaryExcel}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Export Excel
                </button>
                <button
                  onClick={downloadDashboardPDF}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                >
                  Export PDF
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
          </details>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

