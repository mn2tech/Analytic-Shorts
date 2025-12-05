function TreemapChart({ data, selectedCategorical, selectedNumeric }) {
  if (!data || data.length === 0 || !selectedCategorical || !selectedNumeric) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Select columns to view chart
      </div>
    )
  }

  // Group data by category
  const grouped = {}
  data.forEach((row) => {
    const key = row[selectedCategorical] || 'Unknown'
    const value = parseFloat(row[selectedNumeric]) || 0
    grouped[key] = (grouped[key] || 0) + value
  })

  const chartData = Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  const total = chartData.reduce((sum, item) => sum + item.value, 0)
  const maxValue = Math.max(...chartData.map((d) => d.value))

  // Calculate sizes for treemap (simple grid layout)
  const colors = [
    '#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6',
    '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#06b6d4'
  ]

  return (
    <div className="h-full w-full p-4">
      <div className="grid grid-cols-2 gap-2 h-full">
        {chartData.map((item, index) => {
          const percentage = (item.value / total) * 100
          const height = Math.max(20, (item.value / maxValue) * 100)
          return (
            <div
              key={index}
              className="rounded-lg p-3 flex flex-col justify-between cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: colors[index % colors.length],
                minHeight: `${height}%`,
              }}
            >
              <div className="text-white font-semibold text-sm">{item.name}</div>
              <div className="text-white text-xs opacity-90">
                {item.value.toLocaleString()} ({percentage.toFixed(1)}%)
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TreemapChart





