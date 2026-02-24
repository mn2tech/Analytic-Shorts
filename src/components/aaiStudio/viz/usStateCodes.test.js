import { describe, it, expect } from 'vitest'
import { normalizeStateKey, isUSStateKey, aggregateByState, US_STATE_CODES } from './usStateCodes'

describe('usStateCodes', () => {
  it('normalizes 2-letter codes to uppercase', () => {
    expect(normalizeStateKey('ca')).toBe('CA')
    expect(normalizeStateKey('CA')).toBe('CA')
    expect(normalizeStateKey('Ny')).toBe('NY')
  })

  it('normalizes full state names to code', () => {
    expect(normalizeStateKey('California')).toBe('CA')
    expect(normalizeStateKey('new york')).toBe('NY')
    expect(normalizeStateKey('District of Columbia')).toBe('DC')
  })

  it('returns null for non-state strings', () => {
    expect(normalizeStateKey('Canada')).toBeNull()
    expect(normalizeStateKey('XX')).toBeNull()
    expect(normalizeStateKey('')).toBeNull()
    expect(normalizeStateKey(null)).toBeNull()
  })

  it('isUSStateKey returns true for valid state keys', () => {
    expect(isUSStateKey('CA')).toBe(true)
    expect(isUSStateKey('Texas')).toBe(true)
    expect(isUSStateKey('  fl  ')).toBe(true)
  })

  it('isUSStateKey returns false for invalid keys', () => {
    expect(isUSStateKey('XX')).toBe(false)
    expect(isUSStateKey('')).toBe(false)
  })

  it('US_STATE_CODES contains 51 (50 states + DC)', () => {
    expect(US_STATE_CODES.size).toBe(51)
    expect(US_STATE_CODES.has('DC')).toBe(true)
  })

  it('aggregateByState aggregates and normalizes', () => {
    const rows = [
      { key: 'California', value: 100 },
      { key: 'CA', value: 50 },
      { key: 'Texas', value: 75 },
      { key: 'Canada', value: 200 },
    ]
    const result = aggregateByState(rows)
    expect(result.length).toBe(2)
    const ca = result.find((r) => r.stateCode === 'CA')
    const tx = result.find((r) => r.stateCode === 'TX')
    expect(ca).toBeDefined()
    expect(ca.value).toBe(150)
    expect(tx).toBeDefined()
    expect(tx.value).toBe(75)
  })
})
