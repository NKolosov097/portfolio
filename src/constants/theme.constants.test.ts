import { describe, expect, it } from 'vitest'

import { EAppearance, resolveRequestAppearance } from '@/constants/theme.constants'

describe('resolveRequestAppearance', () => {
  it('honours an explicit original cookie', () => {
    expect(resolveRequestAppearance(EAppearance.original)).toBe(EAppearance.original)
  })

  it('defaults to winter when the cookie is missing', () => {
    expect(resolveRequestAppearance(null)).toBe(EAppearance.winter)
    expect(resolveRequestAppearance(undefined)).toBe(EAppearance.winter)
  })

  it('defaults to winter for an unrecognised cookie value', () => {
    expect(resolveRequestAppearance('spooky')).toBe(EAppearance.winter)
    expect(resolveRequestAppearance('')).toBe(EAppearance.winter)
    expect(resolveRequestAppearance(EAppearance.winter)).toBe(EAppearance.winter)
  })

  it('retires a cookie left over from the archived halloween season', () => {
    expect(resolveRequestAppearance(EAppearance.halloween)).toBe(EAppearance.winter)
  })
})
