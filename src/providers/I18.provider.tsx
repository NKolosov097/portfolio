'use client'

import { PropsWithChildren, useState } from 'react'

import { I18nContext } from '@/contexts/i18'
import { ELanguage } from '@/constants/header.constants'
import i18n from '@/configs/i18n'
import { useGetLanguage } from '@/hooks/useGetLanguage'

export const I18nProvider = ({ children }: PropsWithChildren) => {
  const lang = useGetLanguage()

  const [language, setLanguage] = useState<ELanguage>(lang)

  return (
    <I18nContext.Provider value={{ language, setLanguage, i18n }}>{children}</I18nContext.Provider>
  )
}
