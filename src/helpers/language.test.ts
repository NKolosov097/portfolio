import { describe, expect, it } from 'vitest'

import { ELanguage } from '@/constants/header.constants'
import { normalizeLanguage, resolveRequestLanguage } from '@/helpers/language'

describe('normalizeLanguage', () => {
  it('normalises a regional locale down to its language code', () => {
    expect(normalizeLanguage('en-US')).toBe(ELanguage.en)
    expect(normalizeLanguage('RU-ru')).toBe(ELanguage.ru)
  })

  it('returns null for an unsupported locale', () => {
    expect(normalizeLanguage('de-DE')).toBeNull()
  })

  it('returns null for a missing value', () => {
    expect(normalizeLanguage(null)).toBeNull()
    expect(normalizeLanguage(undefined)).toBeNull()
  })
})

describe('resolveRequestLanguage', () => {
  it('prefers the cookie over the Accept-Language header', () => {
    expect(resolveRequestLanguage('ru', 'en-US,en;q=0.9')).toBe(ELanguage.ru)
  })

  it('falls back to the header when no cookie is set', () => {
    expect(resolveRequestLanguage(null, 'ru-RU,ru;q=0.9,en;q=0.8')).toBe(ELanguage.ru)
  })

  it('ignores an unsupported cookie value and falls back to the header', () => {
    expect(resolveRequestLanguage('fr', 'ru-RU,ru;q=0.9')).toBe(ELanguage.ru)
  })

  it('falls back to English when neither the cookie nor the header is supported', () => {
    expect(resolveRequestLanguage('fr', 'de-DE,de;q=0.9')).toBe(ELanguage.en)
  })

  it('falls back to English when neither the cookie nor the header is present', () => {
    expect(resolveRequestLanguage(null, null)).toBe(ELanguage.en)
  })
})
