import { ILanguageItem } from '@/layout/Header/types/header.type'

/** Viewport width threshold below which header tabs switch to compact size. */
export const tabsCompactBreakpoint = 500

export const enum ELanguage {
  en = 'en',
  ru = 'ru',
}

export const enum ETabID {
  home = 'home',
  portfolio = 'portfolio',
  aboutMe = 'aboutMe',
  resume = 'resume',
  writing = 'writing',
  contact = 'contact',
}

export const languages: ILanguageItem[] = [
  {
    title: 'English',
    value: ELanguage.en,
  },
  {
    title: 'Русский',
    value: ELanguage.ru,
  },
]
