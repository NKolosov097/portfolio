import { PropsWithChildren, Suspense } from 'react'
import { cookies, headers } from 'next/headers'
import { ToastContainer } from 'react-toastify'
import type { Metadata, Viewport } from 'next'

import '@gravity-ui/uikit/styles/fonts.css'
import '@gravity-ui/uikit/styles/styles.css'
import '@/styles/globals.css'

import { getRootClassName } from '@gravity-ui/uikit/server'
import { Providers } from '@/providers/Providers'

import { Aside } from '@/layout/Aside/Aside'
import { Header } from '@/layout/Header/Header'
import { Main } from '@/layout/Main/Main'
import { Footer } from '@/layout/Footer/Footer'

import { SkipToNavigationLink } from '@/components/SkipToNavigationLink/SkipToNavigationLink'
import { LoaderSection } from '@/home-sections/LoaderSection/LoaderSection'
import { LANG_COOKIE_KEY, resolveRequestLanguage } from '@/helpers/language'

import {
  AUTHOR_NAME,
  AUTHOR_TWITTER_HANDLE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  STRUCTURED_DATA,
} from '@/constants/seo.constants'

const theme = 'dark'
const rootClassName = getRootClassName({ theme })

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: AUTHOR_NAME, url: SITE_URL }],
  creator: AUTHOR_NAME,
  publisher: AUTHOR_NAME,
  category: 'technology',
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/?lang=en',
      'ru-RU': '/?lang=ru',
    },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_US',
    alternateLocale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    creator: AUTHOR_TWITTER_HANDLE,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  userScalable: true,
  themeColor: '#121212',
  colorScheme: 'dark',
  initialScale: 1,
  viewportFit: 'auto',
}

export default async function RootLayout({ children }: PropsWithChildren) {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()])

  /** Resolved once per request so the server render and the client's first render already agree. */
  const initialLanguage = resolveRequestLanguage(
    cookieStore.get(LANG_COOKIE_KEY)?.value,
    headerList.get('accept-language'),
  )

  return (
    <html lang={initialLanguage} suppressHydrationWarning>
      <body className={rootClassName} suppressHydrationWarning>
        <script
          id="structured-data"
          type="application/ld+json"
          // Static, fully-trusted data; `<` is escaped to keep the inline JSON HTML-safe.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, '\\u003c'),
          }}
        />
        <Suspense fallback={<LoaderSection />}>
          <Providers initialLanguage={initialLanguage}>
            <SkipToNavigationLink />
            <Header />
            <Aside />
            <Main>{children}</Main>
            <Footer />
            <ToastContainer />
          </Providers>
        </Suspense>
      </body>
    </html>
  )
}
