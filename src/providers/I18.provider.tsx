'use client'

import { PropsWithChildren, useEffect, useState } from 'react'
import { I18nextProvider } from 'react-i18next'

import { I18nContext } from '@/contexts/i18'
import { ELanguage } from '@/constants/header.constants'
import { createI18nInstance } from '@/configs/i18n/i18n'

interface II18nProviderProps extends PropsWithChildren {
  /** Language resolved server-side; see {@link import('@/helpers/language').resolveRequestLanguage}. */
  initialLanguage: ELanguage
}

export const I18nProvider = ({ initialLanguage, children }: II18nProviderProps) => {
  const [language, setLanguage] = useState<ELanguage>(initialLanguage)

  /** Lazy init so `createI18nInstance` runs once per mount, not on every re-render. */
  const [i18n] = useState(() => createI18nInstance(initialLanguage))

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return (
    <I18nextProvider i18n={i18n}>
      <I18nContext.Provider value={{ language, setLanguage, i18n }}>
        {children}
      </I18nContext.Provider>
    </I18nextProvider>
  )
}
