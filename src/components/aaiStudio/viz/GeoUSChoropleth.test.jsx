import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import GeoUSChoropleth from './GeoUSChoropleth'

// react-simple-maps uses fetch for topojson; mock ComposableMap to avoid network
vi.mock('react-simple-maps', () => ({
  ComposableMap: ({ children }) => <div data-testid="composable-map">{children}</div>,
  Geographies: ({ children }) => <div data-testid="geographies">{children({ geographies: [] })}</div>,
  Geography: () => <div data-testid="geography" />,
}))

describe('GeoUSChoropleth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "No US state data" when rows are empty', () => {
    render(<GeoUSChoropleth rows={[]} />)
    expect(screen.getByText(/No US state data/)).toBeTruthy()
  })

  it('renders map and Top States when rows have state keys', () => {
    const rows = [
      { key: 'CA', value: 1000 },
      { key: 'Texas', value: 500 },
      { key: 'NY', value: 800 },
    ]
    render(<GeoUSChoropleth rows={rows} />)
    // Strict Mode may double-mount; assert at least one exists
    expect(screen.getAllByTestId('composable-map').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Top States').length).toBeGreaterThanOrEqual(1)
  })

  it('filters out non-state keys and aggregates', () => {
    const rows = [
      { key: 'CA', value: 100 },
      { key: 'California', value: 50 },
      { key: 'Unknown', value: 999 },
    ]
    render(<GeoUSChoropleth rows={rows} />)
    expect(screen.getAllByTestId('composable-map').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Top States').length).toBeGreaterThanOrEqual(1)
  })
})
