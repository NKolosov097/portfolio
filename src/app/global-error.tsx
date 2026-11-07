'use client'

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'

import { Button } from '@gravity-ui/uikit'

import { EAppearance } from '@/constants/theme.constants'
import { WinterGarland } from '@/layout/WinterGarland/WinterGarland'

interface IErrorBoundaryProps {
  error: Error & { digest?: string }
}

const ErrorBoundary = ({ error }: IErrorBoundaryProps) => {
  const router = useRouter()
  const { t, i18n } = useTranslation()

  useEffect(() => {
    console.error('Global handling error: \n', error)
  }, [error])

  // Rendered outside the root layout, so this document stamps the season itself.
  return (
    <html lang={i18n.language} data-appearance={EAppearance.winter}>
      <body className="error-body">
        <WinterGarland />
        <section className="error-section">
          <h2 className="error-header">{t('error.wentWrong')}</h2>

          {typeof error?.message === 'string' && error?.message?.trim()?.length > 0 && (
            <p className="error-description">
              {t('error.description')}: {error?.message}
            </p>
          )}

          <Button size="l" className="error-body-btn" onClick={() => router.refresh()}>
            {t('error.reloadPage')}
          </Button>
        </section>
      </body>
    </html>
  )
}

export default ErrorBoundary
