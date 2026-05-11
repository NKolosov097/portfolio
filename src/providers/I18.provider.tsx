'use client'

import { PropsWithChildren, useEffect, useState } from 'react'

import { I18nContext } from '@/contexts/i18'
import { ELanguage } from '@/constants/header.constants'
import i18n from '@/configs/i18n/i18n'
import { getStoredLanguage } from '@/helpers/language'

export const I18nProvider = ({ children }: PropsWithChildren) => {
  /**
   * Initialised with English to match the server-rendered HTML.
   * Switches to the user's preferred language after hydration via useEffect below.
   */
  const [language, setLanguage] = useState<ELanguage>(ELanguage.en)

  useEffect(() => {
    /** User's preferred language resolved from cookie or browser locale after hydration. */
    const preferred = getStoredLanguage()
    void i18n.changeLanguage(preferred)
    setLanguage(preferred)
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return (
    <I18nContext.Provider value={{ language, setLanguage, i18n }}>{children}</I18nContext.Provider>
  )
}
