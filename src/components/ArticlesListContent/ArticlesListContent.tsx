'use client'

import styles from './ArticlesListContent.module.css'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import { ETabID } from '@/constants/header.constants'
import { articles } from '@/constants/articles.constants'
import { ArticleListItem } from '@/components/ArticleListItem/ArticleListItem'

export const ArticlesListContent = () => {
  const { t } = useTranslation()

  return (
    <section className={styles.section}>
      <Link href={`/#${ETabID.writing}`} className={styles.backLink}>
        ← {t('aside.backToHome')}
      </Link>

      <h1 className={styles.header}>{t('articles.pageTitle')}</h1>
      <p className={styles.description}>{t('articles.pageDescription')}</p>

      <ul className={styles.list}>
        {articles.map((article) => (
          <ArticleListItem key={article.slug} {...article} />
        ))}
      </ul>
    </section>
  )
}

export default ArticlesListContent
