'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <section className="not-found-section">
      <h2 className="not-found-header">{t('notFound.title')}</h2>
      <p className="not-found-description">{t('notFound.description')}</p>
      <Link href="/" className="g-link g-link_view_normal not-found-link">
        {t('notFound.backBtn')}
      </Link>
    </section>
  )
}
