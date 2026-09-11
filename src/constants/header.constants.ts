import { ILanguageItem } from '@/layout/Header/types/header.type'

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
