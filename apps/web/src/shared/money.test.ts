import { describe, expect, it } from 'vitest'
import { sumMoney } from './money'

describe('sumMoney', () => {
  it('returns a zero amount for an empty selection', () => {
    expect(sumMoney([])).toBe('0.00')
  })

  it('keeps two fractional digits for whole amounts', () => {
    expect(sumMoney(['640.00', '300.00'])).toBe('940.00')
  })

  it('does not accumulate binary floating point error', () => {
    expect(sumMoney(['0.10', '0.20'])).toBe('0.30')
    expect(sumMoney(['0.07', '0.07', '0.07'])).toBe('0.21')
    expect(sumMoney(Array.from({ length: 1000 }, () => '0.01'))).toBe('10.00')
  })

  it('matches the backend total for a realistic mixed selection', () => {
    expect(sumMoney(['1200.00', '1840.00', '900.00', '860.00', '520.00'])).toBe('5320.00')
    expect(sumMoney(['24.71', '37.89', '18.53', '17.71', '10.71'])).toBe('109.55')
  })
})
