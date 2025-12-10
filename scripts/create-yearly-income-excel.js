const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

// Data from the image
const data = [
  { Year: 2020, Income: '$0' },
  { Year: 2021, Income: '$1,200' },
  { Year: 2022, Income: '$5,600' },
  { Year: 2023, Income: '$63,000' },
  { Year: 2024, Income: '$554,000' },
  { Year: 2025, Income: '$930,000' }
]

// Create a new workbook
const workbook = XLSX.utils.book_new()

// Convert data to worksheet
const worksheet = XLSX.utils.json_to_sheet(data)

// Set column widths for better readability
worksheet['!cols'] = [
  { wch: 10 }, // Year column
  { wch: 15 }  // Income column
]

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Yearly Income')

// Create public/examples directory if it doesn't exist
const outputDir = path.join(__dirname, '..', 'public', 'examples')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Write file
const outputPath = path.join(outputDir, 'yearly-income-data.xlsx')
XLSX.writeFile(workbook, outputPath)

console.log(`✅ Excel file created successfully at: ${outputPath}`)
console.log(`📊 File contains ${data.length} rows of data`)

