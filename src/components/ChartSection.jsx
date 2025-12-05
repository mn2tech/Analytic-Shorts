import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useRef } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444']

function ChartSection({ data, numericColumns, categoricalColumns, dateColumns, selectedNumeric, selectedCategorical, selectedDate }) {
  const chartRef = useRef(null)

  const downloadChartAsPNG = async (chartId) => {
    const chartElement = document.getElementById(chartId)
    if (!chartElement) return

    try {
      const canvas = await html2canvas(chartElement)
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `${chartId}-chart.png`
      link.href = url
      link.click()
    } catch (error) {
      console.error('Error downloading chart:', error)
    }
  }

  const downloadChartAsPDF = async (chartId) => {
    const chartElement = document.getElementById(chartId)
    if (!chartElement) return

    try {
      const canvas = await html2canvas(chartElement, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF('landscape', 'mm', 'a4')
      const imgWidth = 297 // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      // Center the image
      const xOffset = 0
      const yOffset = (210 - imgHeight) / 2 // Center vertically
      
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight)
      pdf.save(`${chartId}-chart.pdf`)
    } catch (error) {
      console.error('Error exporting chart to PDF:', error)
      alert('Error exporting chart to PDF. Please try again.')
    }
  }

  const prepareChartData = () => {
    if (!data || data.length === 0) return []

    // Group by categorical column if selected
    if (selectedCategorical && selectedNumeric) {
      const grouped = {}
      data.forEach((row) => {
        const key = row[selectedCategorical] || 'Unknown'
        const value = parseFloat(row[selectedNumeric]) || 0
        grouped[key] = (grouped[key] || 0) + value
      })
      return Object.entries(grouped).map(([name, value]) => ({ name, value }))
    }

    // Time series if date column selected
    if (selectedDate && selectedNumeric) {
      return data
        .map((row) => ({
          date: row[selectedDate] || '',
          value: parseFloat(row[selectedNumeric]) || 0,
        }))
        .filter((item) => item.date)
        .slice(0, 50) // Limit to 50 points for performance
    }

    // Default: aggregate by first numeric column
    if (selectedNumeric) {
      return data
        .slice(0, 20)
        .map((row, index) => ({
          name: `Item ${index + 1}`,
          value: parseFloat(row[selectedNumeric]) || 0,
        }))
    }

    return []
  }

  const chartData = prepareChartData()

  if (chartData.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Select columns to generate charts</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Bar Chart */}
      <div className="bg-white rounded-lg shadow-md p-6" id="bar-chart" ref={chartRef}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Bar Chart</h3>
          <div className="flex gap-2">
            <button
              onClick={() => downloadChartAsPNG('bar-chart')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              PNG
            </button>
            <button
              onClick={() => downloadChartAsPDF('bar-chart')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              PDF
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line Chart */}
      <div className="bg-white rounded-lg shadow-md p-6" id="line-chart">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Line Chart</h3>
          <div className="flex gap-2">
            <button
              onClick={() => downloadChartAsPNG('line-chart')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              PNG
            </button>
            <button
              onClick={() => downloadChartAsPDF('line-chart')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              PDF
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      {selectedCategorical && (
        <div className="bg-white rounded-lg shadow-md p-6" id="pie-chart">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pie Chart</h3>
            <div className="flex gap-2">
              <button
                onClick={() => downloadChartAsPNG('pie-chart')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                PNG
              </button>
              <button
                onClick={() => downloadChartAsPDF('pie-chart')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                PDF
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default ChartSection





