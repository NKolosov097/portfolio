import i18n from 'i18next'

import { ELanguage } from '@/constants/header.constants'

export interface I18nContextType {
  language: ELanguage
  setLanguage: (_language: ELanguage) => void
  i18n: typeof i18n
}
