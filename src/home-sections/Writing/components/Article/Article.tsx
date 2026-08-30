'use client'

import styles from './Article.module.css'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import { IArticle } from '@/home-sections/Writing/types/writing.type'
import { useResolvedLanguage } from '@/hooks/useResolvedLanguage'

export const Article = ({
  id,
  title,
  description,
  href,
  sourceKey,
  isExternal = true,
}: IArticle) => {
  const { t } = useTranslation()
  const language = useResolvedLanguage()

  const cardContent = (
    <>
      <span className={styles.source}>{t(sourceKey)}</span>
      <span className={styles.title}>{title[language]}</span>
      <span className={styles.description}>{description[language]}</span>
    </>
  )

  if (!isExternal) {
    return (
      <li className={styles.container}>
        <Link href={href} data-testid={`writing-article-${id}`} className={styles.card}>
          {cardContent}
        </Link>
      </li>
    )
  }

  return (
    <li className={styles.container}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${title[language]} - ${t('aside.opensInNewTab')}`}
        data-testid={`writing-article-${id}`}
        className={styles.card}
      >
        {cardContent}
      </a>
    </li>
  )
}

export default Article
