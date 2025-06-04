/* eslint-disable no-unused-vars */
import { ILanguageItem } from '@/layout/Header/types/header.type'

export const paddingFromTopAfterScroll = 85

export const enum ELanguage {
  en = 'en',
  ru = 'ru',
}

export const enum ETabID {
  home = 'home',
  portfolio = 'portfolio',
  aboutMe = 'aboutMe',
  resume = 'resume',
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
