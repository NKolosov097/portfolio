'use client'

import { PropsWithChildren } from 'react'

import { ELanguage } from '@/constants/header.constants'

import { I18nProvider } from './I18.provider'
import { ThemeProvider } from './Theme.provider'
import { AsideStoreProvider } from './stores/AsideStore.provider'
import { HeaderStoreProvider } from './stores/HeaderStore.provider'

interface IProvidersProps extends PropsWithChildren {
  /** Language resolved server-side, forwarded to {@link I18nProvider}. */
  initialLanguage: ELanguage
}

export const Providers = ({ initialLanguage, children }: IProvidersProps) => {
  return (
    <I18nProvider initialLanguage={initialLanguage}>
      <ThemeProvider>
        <AsideStoreProvider>
          <HeaderStoreProvider>{children}</HeaderStoreProvider>
        </AsideStoreProvider>
      </ThemeProvider>
    </I18nProvider>
  )
}
