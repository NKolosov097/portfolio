import { beforeEach, describe, expect, it } from 'vitest'

import { ELanguage } from '@/constants/header.constants'
import { storeLanguage } from '@/helpers/language'

/** Removes the persisted language cookie so each case starts from a clean slate. */
const clearLanguageCookie = () => {
  document.cookie = 'app-lang=;path=/;max-age=0'
}

describe('storeLanguage', () => {
  beforeEach(() => {
    clearLanguageCookie()
  })

  it('persists the language to a first-party cookie', () => {
    storeLanguage(ELanguage.ru)

    expect(document.cookie).toContain('app-lang=ru')
  })

  it('overwrites a previously persisted language', () => {
    storeLanguage(ELanguage.ru)
    storeLanguage(ELanguage.en)

    expect(document.cookie).toContain('app-lang=en')
    expect(document.cookie).not.toContain('app-lang=ru')
  })

  it('coexists with other cookies', () => {
    document.cookie = 'other=value;path=/'
    storeLanguage(ELanguage.ru)

    expect(document.cookie).toContain('other=value')
    expect(document.cookie).toContain('app-lang=ru')
  })
})
