import { PropsWithChildren, Suspense } from 'react'
import { ToastContainer } from 'react-toastify'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

import '@gravity-ui/uikit/styles/fonts.css'
import '@gravity-ui/uikit/styles/styles.css'
import '@/styles/globals.css'

import { getRootClassName } from '@gravity-ui/uikit/server'
import { Providers } from '@/providers/Providers'

import { Aside } from '@/layout/Aside/Aside'
import { Header } from '@/layout/Header/Header'
import { Main } from '@/layout/Main/Main'
import { Footer } from '@/layout/Footer/Footer'

import { LoaderSection } from '@/home-sections/LoaderSection/LoaderSection'

const inter = Inter({
  weight: ['400', '600', '700'],
  style: ['normal'],
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
})

const theme = 'dark'
const rootClassName = getRootClassName({ theme })

export const metadata: Metadata = {
  title: 'Portfolio NKolosov097',
  description: 'Portfolio about super developer @NKolosov097!',
  metadataBase: new URL('https://nkolosov.com'),
  openGraph: {
    title: 'Portfolio NKolosov097',
    description: 'Portfolio about super developer @NKolosov097!',
    url: 'https://nkolosov.com',
    siteName: 'NKolosov097 Portfolio',
    images: [
      {
        url: '/og-image.jpg',
        width: 800,
        height: 600,
      },
    ],
    locale: 'en_US',
    type: 'website',
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
  maximumScale: 1,
  minimumScale: 1,
  viewportFit: 'auto',
}

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className={rootClassName} suppressHydrationWarning>
        <Suspense fallback={<LoaderSection />}>
          <Providers>
            <Aside />
            <Header />
            <Main>{children}</Main>
            <Footer />
            <ToastContainer />
          </Providers>
        </Suspense>
      </body>
    </html>
  )
}
