import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDateTime, parseSqliteDate, summarizeItems } from './format'

describe('parseSqliteDate', () => {
  it('reads SQLite timestamps as UTC', () => {
    expect(parseSqliteDate('2026-09-28 19:45:16').toISOString()).toBe('2026-09-28T19:45:16.000Z')
  })

  it('returns null for missing or invalid values', () => {
    expect(parseSqliteDate(undefined)).toBeNull()
    expect(parseSqliteDate('not a date')).toBeNull()
  })
})

describe('formatDateTime', () => {
  it('formats in the requested time zone', () => {
    const options = { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' }
    const expected = new Intl.DateTimeFormat('en-US', options).format(new Date(Date.UTC(2026, 8, 28, 19, 45, 16)))
    expect(formatDateTime('2026-09-28 19:45:16', options)).toBe(expected)
  })

  it('falls back to the raw value when it cannot parse it', () => {
    expect(formatDateTime('soon')).toBe('soon')
  })
})

describe('formatCurrency and summarizeItems', () => {
  it('formats cents as dollars', () => {
    expect(formatCurrency(129900)).toBe('$1,299.00')
  })

  it('lists quantities and names', () => {
    expect(summarizeItems([{ quantity: 2, product_name: 'Dock' }, { quantity: 1, product_name: 'Hub' }])).toBe('2 × Dock, 1 × Hub')
    expect(summarizeItems()).toBe('')
  })
})
