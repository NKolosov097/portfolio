'use client'

import { PropsWithChildren } from 'react'

import { LanguageProvider } from './Language.provider.tsx'
import { I18nProvider } from './I18.provider'
import { ThemeProvider } from './Theme.provider'
import { AsideStoreProvider } from './stores/AsideStore.provider'
import { HeaderStoreProvider } from './stores/HeaderStore.provider'

export const Providers = ({ children }: PropsWithChildren) => {
  return (
    <LanguageProvider>
      <I18nProvider>
        <ThemeProvider>
          <AsideStoreProvider>
            <HeaderStoreProvider>{children}</HeaderStoreProvider>
          </AsideStoreProvider>
        </ThemeProvider>
      </I18nProvider>
    </LanguageProvider>
  )
}
