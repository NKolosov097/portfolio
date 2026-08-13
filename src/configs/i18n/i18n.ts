import i18next from 'i18next'
import type { Resource } from 'i18next'
import { initReactI18next } from 'react-i18next'

import { ELanguage } from '@/constants/header.constants'

import en from '@public/locales/en.json'
import ru from '@public/locales/ru.json'

const RESOURCES: Resource = {
  [ELanguage.en]: { translation: en },
  [ELanguage.ru]: { translation: ru },
}

/** Fresh instance per call — never share/mutate one across requests, or one visitor's language leaks into another's concurrent response. */
export function createI18nInstance(language: ELanguage) {
  const instance = i18next.createInstance()

  void instance.use(initReactI18next).init({
    resources: RESOURCES,
    lng: language,
    fallbackLng: ELanguage.en,
    interpolation: {
      escapeValue: false,
    },
    lowerCaseLng: true,
  })

  return instance
}

/** Fallback instance for the context's default value only; real rendering always goes through an instance created via {@link createI18nInstance}. */
const i18n = createI18nInstance(ELanguage.en)

export default i18n
