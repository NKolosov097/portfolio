import { PropsWithChildren, Suspense } from 'react'
import type { Metadata } from 'next'

import { ToastContainer } from 'react-toastify'

import '@gravity-ui/uikit/styles/fonts.css'
import '@gravity-ui/uikit/styles/styles.css'
import '@/styles/globals.css'

import { getRootClassName } from '@gravity-ui/uikit/server'
import { Providers } from '@/providers/Providers'

import { Aside } from '@/components/Aside/Aside'
import { Header } from '@/components/Header/Header'
import { Main } from '@/components/Main/Main'
import { Footer } from '@/components/Footer/Footer'

const theme = 'dark'
const rootClassName = getRootClassName({ theme })

export const metadata: Metadata = {
  title: 'Portfolio by NKolosov097',
  description: 'Portfolio about super developer @NKolosov097!',
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
