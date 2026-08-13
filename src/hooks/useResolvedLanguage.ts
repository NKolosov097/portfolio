'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ELanguage } from '@/constants/header.constants'

/** Normalises i18next's current language to a supported {@link ELanguage}; add a `case` here for each new language. */
export function useResolvedLanguage(): ELanguage {
  const { i18n } = useTranslation()

  return useMemo(() => {
    switch (i18n.language) {
      case ELanguage.ru:
        return ELanguage.ru
      case ELanguage.en:
        return ELanguage.en
      default:
        return ELanguage.en
    }
  }, [i18n.language])
}
