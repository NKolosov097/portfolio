'use client'

import styles from './Article.module.css'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import { IArticle } from '@/home-sections/Writing/types/writing.type'

export const Article = ({ id, title, description, href, source, isExternal = true }: IArticle) => {
  const { t } = useTranslation()

  const cardContent = (
    <>
      <span className={styles.source}>{source}</span>
      <span className={styles.title}>{title}</span>
      <span className={styles.description}>{description}</span>
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
        aria-label={`${title} — ${t('aside.opensInNewTab')}`}
        data-testid={`writing-article-${id}`}
        className={styles.card}
      >
        {cardContent}
      </a>
    </li>
  )
}

export default Article
