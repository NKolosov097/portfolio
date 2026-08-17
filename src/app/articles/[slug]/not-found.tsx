'use client'

import { useTranslation } from 'react-i18next'

import { NotFoundView } from '@/components/NotFoundView/NotFoundView'

export default function ArticleNotFoundPage() {
  const { t } = useTranslation()

  return (
    <NotFoundView
      heading={t('articleNotFound.title')}
      description={t('articleNotFound.description')}
      linkHref="/articles"
      linkLabel={t('articleNotFound.backBtn')}
      testId="not-found-link"
    />
  )
}
