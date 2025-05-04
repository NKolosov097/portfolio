import { createContext } from 'react'

import { I18nContextType } from '@/types/i18.type'
import { ELanguage } from '@/constants/header.constants'
import i18n from '@/configs/i18n'

export const I18nContext = createContext<I18nContextType>({
  language: ELanguage.en,
  setLanguage: () => {},
  i18n: i18n,
})
