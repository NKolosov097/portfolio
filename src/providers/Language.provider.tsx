'use client'

import { PropsWithChildren } from 'react'
import { Jura } from 'next/font/google'
import Head from 'next/head'

import { useGetLanguage } from '@/hooks/useGetLanguage'

const jura = Jura({
  weight: ['400', '600', '700'],
  style: ['normal'],
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
})

export const LanguageProvider = ({ children }: PropsWithChildren) => {
  const lang = useGetLanguage()

  return (
    <html lang={lang} className={jura.className}>
      <Head>
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />

        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {children}
    </html>
  )
}
