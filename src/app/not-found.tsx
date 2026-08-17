'use client'

import { useTranslation } from 'react-i18next'

import { NotFoundView } from '@/components/NotFoundView/NotFoundView'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <NotFoundView
      heading={t('notFound.title')}
      description={t('notFound.description')}
      linkHref="/"
      linkLabel={t('notFound.backBtn')}
      testId="not-found-link"
    />
  )
}
