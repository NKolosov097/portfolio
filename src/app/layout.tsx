import { ToastContainer } from 'react-toastify'
import { Jura } from 'next/font/google'
import type { Metadata } from 'next'

import '@gravity-ui/uikit/styles/fonts.css'
import '@gravity-ui/uikit/styles/styles.css'
import '@/styles/globals.css'

import { getRootClassName } from '@gravity-ui/uikit/server'
import { Providers } from '@/providers/Providers'

import { Aside } from '@/components/Aside/Aside'
import { Header } from '@/components/Header/Header'
import { Main } from '@/components/Main/Main'
import { Footer } from '@/components/Footer/Footer'

import { ILayout } from '@/types/layout.type'

const theme = 'dark'
const rootClassName = getRootClassName({ theme })

export const metadata: Metadata = {
  title: 'Portfolio by NKolosov097',
  description: 'Portfolio about super developer @NKolosov097!',
}

const jura = Jura({
  weight: ['400', '600', '700'],
  style: ['normal'],
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
})

export async function generateStaticParams() {
  return [{ lang: 'en-US' }, { lang: 'ru' }]
}

const getLangFromParams = async (params: ILayout['params']) =>
  (
    await params.catch((err) => {
      console.error(`Error with getting params: \n${err}`)
      return err
    })
  )?.lang || 'en'

export default async function RootLayout({ params, children }: ILayout) {
  const lang = await getLangFromParams(params)

  return (
    <html lang={lang} className={jura.className}>
      <body className={rootClassName}>
        <Providers>
          {/* <SkipToNavigationLink /> */}

          <Aside />
          <Header />
          <Main>{children}</Main>
          <Footer />

          <ToastContainer />
        </Providers>
      </body>
    </html>
  )
}
