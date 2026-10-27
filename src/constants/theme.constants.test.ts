import { describe, expect, it } from 'vitest'

import { EAppearance, resolveRequestAppearance } from '@/constants/theme.constants'

describe('resolveRequestAppearance', () => {
  it('honours an explicit original cookie', () => {
    expect(resolveRequestAppearance(EAppearance.original)).toBe(EAppearance.original)
  })

  it('honours an explicit halloween cookie', () => {
    expect(resolveRequestAppearance(EAppearance.halloween)).toBe(EAppearance.halloween)
  })

  it('defaults to halloween when the cookie is missing', () => {
    expect(resolveRequestAppearance(null)).toBe(EAppearance.halloween)
    expect(resolveRequestAppearance(undefined)).toBe(EAppearance.halloween)
  })

  it('defaults to halloween for an unrecognised cookie value', () => {
    expect(resolveRequestAppearance('spooky')).toBe(EAppearance.halloween)
  })
})
