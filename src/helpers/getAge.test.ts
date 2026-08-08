import { describe, expect, it } from 'vitest'

import { getAge } from '@/helpers/getAge'

describe('getAge', () => {
  it('counts a birthday that has already passed this year', () => {
    expect(getAge(new Date(1997, 0, 15), new Date(2026, 5, 1))).toBe(29)
  })

  it('counts the birthday on the day itself', () => {
    expect(getAge(new Date(1997, 5, 1), new Date(2026, 5, 1))).toBe(29)
  })

  it('does not count a birthday that is still one day away', () => {
    expect(getAge(new Date(1997, 5, 2), new Date(2026, 5, 1))).toBe(28)
  })

  it('does not count a birthday later in the same month', () => {
    expect(getAge(new Date(1997, 5, 28), new Date(2026, 5, 2))).toBe(28)
  })

  it('withholds a 29 February birthday until March in a non-leap year', () => {
    expect(getAge(new Date(2000, 1, 29), new Date(2025, 1, 28))).toBe(24)
    expect(getAge(new Date(2000, 1, 29), new Date(2025, 2, 1))).toBe(25)
  })

  it('returns 0 for someone born on the reference date', () => {
    expect(getAge(new Date(2026, 5, 1), new Date(2026, 5, 1))).toBe(0)
  })

  it('returns null for a birth date in the future', () => {
    expect(getAge(new Date(2030, 0, 1), new Date(2026, 5, 1))).toBeNull()
  })

  it('returns null for an invalid date', () => {
    expect(getAge(new Date('not-a-date'), new Date(2026, 5, 1))).toBeNull()
  })

  it('falls back to the current date when no reference date is given', () => {
    expect(getAge(new Date())).toBe(0)
  })
})
