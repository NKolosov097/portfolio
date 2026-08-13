'use client'

import styles from './ArticleListItem.module.css'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import { ELanguage } from '@/constants/header.constants'
import { IArticleMeta } from '@/constants/articles.constants'

export const ArticleListItem = ({
  slug,
  title,
  description,
  publishedDate,
  readingTimeMinutes,
}: IArticleMeta) => {
  const { t, i18n } = useTranslation()

  const language: ELanguage = i18n.language === ELanguage.ru ? ELanguage.ru : ELanguage.en

  const formattedDate = new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(
    new Date(publishedDate),
  )

  return (
    <li className={styles.container}>
      <Link
        href={`/articles/${slug}`}
        data-testid={`article-list-item-${slug}`}
        className={styles.card}
      >
        <span className={styles.meta}>
          <span>{formattedDate}</span>
          <span className={styles.readingTime}>
            {t('articles.minRead', { count: readingTimeMinutes })}
          </span>
        </span>
        <span className={styles.title}>{title[language]}</span>
        <span className={styles.description}>{description[language]}</span>
      </Link>
    </li>
  )
}

export default ArticleListItem
