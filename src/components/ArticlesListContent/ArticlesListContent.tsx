'use client'

import styles from './ArticlesListContent.module.css'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import { ARTICLES } from '@/constants/articles.constants'
import { ArticleListItem } from '@/components/ArticleListItem/ArticleListItem'

export const ArticlesListContent = () => {
  const { t } = useTranslation()

  return (
    <section className={styles.section}>
      <Link href="/" className={styles.backLink}>
        ← {t('aside.backToHome')}
      </Link>

      <h1 className={styles.header}>{t('articles.pageTitle')}</h1>
      <p className={styles.description}>{t('articles.pageDescription')}</p>

      <ul className={styles.list}>
        {ARTICLES.map((article) => (
          <ArticleListItem key={article.slug} {...article} />
        ))}
      </ul>
    </section>
  )
}

export default ArticlesListContent
