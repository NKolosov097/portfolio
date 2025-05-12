import i18n from 'i18next'
// import Backend from 'i18next-http-backend'
// import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import { ELanguage } from '@/constants/header.constants'

import en from '@public/locales/en.json'
import ru from '@public/locales/ru.json'

const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window?.location?.search : {})
const lng = urlParams?.get('lang') || ELanguage.en

i18n
  // .use(Backend)
  // .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      [ELanguage.en]: {
        translation: en,
      },
      [ELanguage.ru]: {
        translation: ru,
      },
    },
    lng,
    fallbackLng: ELanguage.en,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['queryString', 'cookie'],
      caches: ['cookie'],
      lookupQuerystring: 'lang',
    },
    lowerCaseLng: true,
  })

export default i18n
