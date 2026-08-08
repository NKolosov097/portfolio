import { beforeEach, describe, expect, it } from 'vitest'

import { ELanguage } from '@/constants/header.constants'
import { getStoredLanguage, storeLanguage } from '@/helpers/language'

/** Removes the persisted language cookie so each case starts from a clean slate. */
const clearLanguageCookie = () => {
  document.cookie = 'app-lang=;path=/;max-age=0'
}

/** Overrides the read-only `navigator.language` getter for the duration of a case. */
const setNavigatorLanguage = (value: string) => {
  Object.defineProperty(window.navigator, 'language', { value, configurable: true })
}

describe('getStoredLanguage', () => {
  beforeEach(() => {
    clearLanguageCookie()
    setNavigatorLanguage('en-US')
  })

  it('prefers the persisted cookie over the browser locale', () => {
    setNavigatorLanguage('en-US')
    storeLanguage(ELanguage.ru)

    expect(getStoredLanguage()).toBe(ELanguage.ru)
  })

  it('falls back to the browser locale when no cookie is set', () => {
    setNavigatorLanguage('ru-RU')

    expect(getStoredLanguage()).toBe(ELanguage.ru)
  })

  it('normalises a regional browser locale down to its language code', () => {
    setNavigatorLanguage('EN-GB')

    expect(getStoredLanguage()).toBe(ELanguage.en)
  })

  it('falls back to English for an unsupported browser locale', () => {
    setNavigatorLanguage('de-DE')

    expect(getStoredLanguage()).toBe(ELanguage.en)
  })

  it('ignores an unsupported cookie value and uses the browser locale', () => {
    document.cookie = 'app-lang=fr;path=/'
    setNavigatorLanguage('ru-RU')

    expect(getStoredLanguage()).toBe(ELanguage.ru)
  })

  it('decodes a percent-encoded cookie value', () => {
    document.cookie = `app-lang=${encodeURIComponent('ru-RU')};path=/`

    expect(getStoredLanguage()).toBe(ELanguage.ru)
  })

  it('falls back to English when neither cookie nor browser locale is supported', () => {
    document.cookie = 'app-lang=zz;path=/'
    setNavigatorLanguage('ja-JP')

    expect(getStoredLanguage()).toBe(ELanguage.en)
  })

  it('reads the language back after a cookie written alongside other cookies', () => {
    document.cookie = 'other=value;path=/'
    storeLanguage(ELanguage.ru)

    expect(document.cookie).toContain('app-lang=ru')
    expect(getStoredLanguage()).toBe(ELanguage.ru)
  })
})
