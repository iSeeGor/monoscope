import { describe, expect, it } from 'vitest'
import { defaultStatementRange, validateStatementRange } from './dateRange'

describe('account statement date range', () => {
  it('defaults to exactly 30 inclusive Kyiv calendar days', () => {
    expect(defaultStatementRange(new Date('2026-10-18T21:30:00Z'))).toEqual({
      dateFrom: '2026-09-20',
      dateTo: '2026-10-19',
    })
  })

  it('allows 31 inclusive days and rejects a longer range', () => {
    expect(validateStatementRange('2026-09-18', '2026-10-18')).toBeNull()
    expect(validateStatementRange('2026-09-17', '2026-10-18')).toBe('Період виписки не може перевищувати 31 день.')
  })
})
