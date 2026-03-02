/**
 * Fiscal year helpers for US federal government.
 * FY YYYY = Oct 1 (YYYY-1) to Sep 30 (YYYY).
 * Example: fiscal_year=2025 => 2024-10-01 to 2025-09-30
 */
function fyToDateRange(fiscalYear) {
  const year = parseInt(String(fiscalYear).trim(), 10)
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return null
  return {
    start_date: `${year - 1}-10-01`,
    end_date: `${year}-09-30`,
  }
}

function fyToTimePeriod(fiscalYear) {
  const range = fyToDateRange(fiscalYear)
  return range ? { start_date: range.start_date, end_date: range.end_date } : null
}

module.exports = {
  fyToDateRange,
  fyToTimePeriod,
}
