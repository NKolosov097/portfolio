import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { ELanguage } from '@/constants/header.constants'

import en from '@public/locales/en.json'
import ru from '@public/locales/ru.json'

i18n.use(initReactI18next).init({
  resources: {
    [ELanguage.en]: {
      translation: en,
    },
    [ELanguage.ru]: {
      translation: ru,
    },
  },
  // Fixed 'en' on init so SSR and initial hydration always produce identical HTML.
  // The actual preferred language is applied client-side in I18nProvider after hydration.
  lng: ELanguage.en,
  fallbackLng: ELanguage.en,
  interpolation: {
    escapeValue: false,
  },
  lowerCaseLng: true,
})

export default i18n
