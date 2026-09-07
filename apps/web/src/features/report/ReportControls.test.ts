import { describe, expect, it } from 'vitest'
import { validateDateRange } from './dateRange'

describe('validateDateRange', () => {
  it('accepts 31 inclusive days and rejects 32', () => {
    expect(validateDateRange('2026-08-01', '2026-08-31')).toBeNull()
    expect(validateDateRange('2026-08-01', '2026-09-01')).toBe(
      'Період не може перевищувати 31 день.',
    )
  })
})
