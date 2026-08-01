'use client'

import styles from './Article.module.css'

import { useTranslation } from 'react-i18next'

import { IArticle } from '@/home-sections/Writing/types/writing.type'

export const Article = ({ id, title, description, href, source }: IArticle) => {
  const { t } = useTranslation()

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
        <span className={styles.source}>{source}</span>
        <span className={styles.title}>{title}</span>
        <span className={styles.description}>{description}</span>
      </a>
    </li>
  )
}

export default Article
