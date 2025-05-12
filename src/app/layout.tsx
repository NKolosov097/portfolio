import { PropsWithChildren, Suspense } from 'react'
import type { Metadata, Viewport } from 'next'

import { ToastContainer } from 'react-toastify'

import '@gravity-ui/uikit/styles/fonts.css'
import '@gravity-ui/uikit/styles/styles.css'
import '@/styles/globals.css'

import { getRootClassName } from '@gravity-ui/uikit/server'
import { Providers } from '@/providers/Providers'

import { Aside } from '@/layout/Aside/Aside'
import { Header } from '@/layout/Header/Header'
import { Main } from '@/layout/Main/Main'
import { Footer } from '@/layout/Footer/Footer'

const theme = 'dark'
const rootClassName = getRootClassName({ theme })

export const metadata: Metadata = {
  title: 'Portfolio NKolosov097',
  description: 'Portfolio about super developer @NKolosov097!',
  metadataBase: new URL('https://nkolosov.com'),

  // Open Graph - for social network
  openGraph: {
    title: 'Portfolio NKolosov097',
    description: 'Portfolio about super developer @NKolosov097!',
    url: 'https://nkolosov.com',
    siteName: 'NKolosov097 Portfolio',
    images: [
      {
        url: '/og-image.jpg', // или { url: "...", width: 1200, height: 630 }
        width: 800,
        height: 600,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  userScalable: true,
  themeColor: '#121212',
  colorScheme: 'dark',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  viewportFit: 'auto',
}

export default async function RootLayout({ children }: PropsWithChildren) {
  return (
    <Suspense>
      <Providers>
        <body className={rootClassName} suppressHydrationWarning={true}>
          {/* <SkipToNavigationLink /> */}

          <Aside />
          <Header />
          <Main>{children}</Main>
          <Footer />

          <ToastContainer />
        </body>
      </Providers>
    </Suspense>
  )
}
