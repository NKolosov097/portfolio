'use client'

import { PropsWithChildren, useState } from 'react'

import { I18nContext } from '@/contexts/i18'
import { ELanguage } from '@/constants/header.constants'
import i18n from '@/configs/i18n'

export const I18nProvider = ({ children }: PropsWithChildren) => {
  const [language, setLanguage] = useState<ELanguage>(
    (navigator.language.slice(0, 2) as ELanguage) || ELanguage.en,
  )

  return (
    <I18nContext.Provider value={{ language, setLanguage, i18n }}>{children}</I18nContext.Provider>
  )
}
