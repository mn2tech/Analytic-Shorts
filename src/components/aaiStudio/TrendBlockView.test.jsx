/**
 * TrendBlockView: chart-path rendering + click-to-filter + filter payload.
 * React 18 Strict Mode–proof (double-mount safe); no reliance on SVG in jsdom.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import TrendBlockView from './TrendBlockView'

afterEach(() => cleanup())

vi.mock('recharts', async (importOriginal) => {
  const mod = await importOriginal()
  return {
    ...mod,
    ResponsiveContainer: ({ children, width = '100%', height = 320 }) =>
      React.createElement('div', { style: { width, height }, 'data-testid': 'recharts-responsive-container' }, children),
  }
})

const blockWithSeries = {
  id: 'trend-01',
  type: 'TrendBlock',
  payload: {
    timeColumn: 'Date',
    grain: 'day',
    measure: 'Sales',
    series: [
      { t: '2026-01-01', count: 10, sum: 100 },
      { t: '2026-01-02', count: 12, sum: 120 },
      { t: '2026-01-03', count: 8, sum: 80 },
    ],
  },
}

describe('TrendBlockView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders chart container when block has series data', () => {
    const setEq = vi.fn()
    render(
      <TrendBlockView block={blockWithSeries} filterState={{ eq: {} }} onFilterChange={{ setEq }} />
    )
    const containers = screen.getAllByTestId('recharts-responsive-container')
    expect(containers[containers.length - 1]).toBeTruthy()
    expect(screen.queryByText(/No trend data/i)).toBeNull()
    const slider = screen.getByTestId('trend-period-slider')
    expect(slider).toBeTruthy()
    fireEvent.change(slider, { target: { value: '1' } })
    expect(setEq).toHaveBeenCalled()
    const last = setEq.mock.calls.at(-1)
    expect(last[0]).toBe('Date')
    expect(last[1]).toBe('2026-01-02')
  })

  it('exposes data-period-count, data-time-column, data-measure on wrapper', () => {
    render(
      <TrendBlockView block={blockWithSeries} filterState={{ eq: {} }} onFilterChange={{ setEq: () => {} }} />
    )
    const wrappers = screen.getAllByTestId('trend-chart')
    const wrapper = wrappers[wrappers.length - 1]
    expect(wrapper).toBeTruthy()
    expect(wrapper.getAttribute('data-period-count')).toBe('3')
    expect(wrapper.getAttribute('data-time-column')).toBe('Date')
    expect(wrapper.getAttribute('data-measure')).toBe('Sales')
  })

  it('calls onFilterChange.setEq with correct filter payload when slider is moved', () => {
    const setEq = vi.fn()
    render(
      <TrendBlockView block={blockWithSeries} filterState={{ eq: {} }} onFilterChange={{ setEq }} />
    )
    const slider = screen.getByTestId('trend-period-slider')
    fireEvent.change(slider, { target: { value: '1' } })
    expect(setEq).toHaveBeenCalled()
    const last = setEq.mock.calls.at(-1)
    expect(last).toEqual(['Date', '2026-01-02'])
  })

  it('calls setEq with null when Clear is clicked', () => {
    const setEq = vi.fn()
    render(
      <TrendBlockView block={blockWithSeries} filterState={{ eq: { Date: '2026-01-02' } }} onFilterChange={{ setEq }} />
    )
    const clearBtn = screen.getByText('Clear')
    fireEvent.click(clearBtn)
    expect(setEq).toHaveBeenCalled()
    const last = setEq.mock.calls.at(-1)
    expect(last).toEqual(['Date', null])
  })

  it('renders no-chart message when series is empty', () => {
    const block = {
      id: 'trend-02',
      type: 'TrendBlock',
      payload: { timeColumn: 'Date', grain: 'day', series: [] },
    }
    render(<TrendBlockView block={block} filterState={{}} onFilterChange={{}} />)
    const messages = screen.getAllByText(/No trend data/i)
    expect(messages.length).toBeGreaterThan(0)
  })

  it('when some series items have missing t, chart still renders and "No trend data" is not shown', () => {
    const block = {
      id: 'trend-03',
      type: 'TrendBlock',
      payload: {
        timeColumn: 'Date',
        grain: 'day',
        series: [
          { t: '2026-01-01', sum: 10 },
          { sum: 20 }, // missing t
        ],
      },
    }
    render(<TrendBlockView block={block} filterState={{}} onFilterChange={{}} />)
    expect(screen.queryByText(/No trend data/i)).toBeNull()
    const wrappers = screen.getAllByTestId('trend-chart')
    expect(wrappers.length).toBeGreaterThan(0)
    const badges = screen.getAllByTestId('trend-dropped-badges')
    expect(badges.length).toBeGreaterThan(0)
    const skipped = screen.getAllByText(/Skipped 1 rows with missing date/i)
    expect(skipped.length).toBeGreaterThan(0)
  })

  it('when all series items have missing t, shows No trend data', () => {
    const block = {
      id: 'trend-04',
      type: 'TrendBlock',
      payload: {
        timeColumn: 'Date',
        grain: 'day',
        series: [{ sum: 10 }, { sum: 20 }],
      },
    }
    const { container } = render(<TrendBlockView block={block} filterState={{}} onFilterChange={{}} />)
    const messages = screen.getAllByText(/No trend data/i)
    expect(messages.length).toBeGreaterThan(0)
    expect(container.querySelector('[data-testid="recharts-responsive-container"]')).toBeNull()
  })
})
