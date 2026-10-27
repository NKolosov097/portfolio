'use client'

import { PropsWithChildren } from 'react'

import { ELanguage } from '@/constants/header.constants'
import { EAppearance } from '@/constants/theme.constants'

import { I18nProvider } from './I18.provider'
import { ThemeProvider } from './Theme.provider'
import { AsideStoreProvider } from './stores/AsideStore.provider'
import { HeaderStoreProvider } from './stores/HeaderStore.provider'

interface IProvidersProps extends PropsWithChildren {
  /** Language resolved server-side, forwarded to {@link I18nProvider}. */
  initialLanguage: ELanguage
  /** Appearance resolved server-side, forwarded to {@link ThemeProvider}. */
  initialAppearance: EAppearance
}

/** Composes the client-side i18n, theme and store providers that wrap the whole app. */
export const Providers = ({ initialLanguage, initialAppearance, children }: IProvidersProps) => {
  return (
    <I18nProvider initialLanguage={initialLanguage}>
      <ThemeProvider initialAppearance={initialAppearance}>
        <AsideStoreProvider>
          <HeaderStoreProvider>{children}</HeaderStoreProvider>
        </AsideStoreProvider>
      </ThemeProvider>
    </I18nProvider>
  )
}
