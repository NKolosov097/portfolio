'use client'

import styles from './ArticlePageContent.module.css'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import { IArticleMeta } from '@/constants/articles.constants'
import { ArticleContent } from '@/components/ArticleContent/ArticleContent'
import { ReadingProgressNav } from '@/components/ReadingProgressNav/ReadingProgressNav'
import { articleHeadingsRegistry } from '@/content/articles/registry'
import { useResolvedLanguage } from '@/hooks/useResolvedLanguage'
import { scrollToLocationHash } from '@/helpers/scrollTo'

interface IArticlePageContentProps {
  /** Metadata of the article being displayed, looked up by the page from the article registry. */
  article: IArticleMeta
}

export const ArticlePageContent = ({ article }: IArticlePageContentProps) => {
  const { t } = useTranslation()
  const language = useResolvedLanguage()

  // Re-run the URL-fragment scroll after mount; the Suspense fallback flash during
  // hydration can undo the browser's own attempt at it.
  useEffect(() => {
    scrollToLocationHash()
  }, [])

  const formattedDate = new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(
    new Date(article.publishedDate),
  )

  const headings = useMemo(
    () =>
      (articleHeadingsRegistry[article.slug] ?? []).map(({ id, labelKey }) => ({
        id,
        label: t(labelKey),
      })),
    [article.slug, t],
  )

  return (
    <article className={styles.article}>
      <nav className={styles.breadcrumb} aria-label={t('articles.backToList')}>
        <Link href="/">{t('aside.backToHome')}</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/articles">{t('articles.backToList')}</Link>
      </nav>

      <h1 className={styles.title}>{article.title[language]}</h1>

      <p className={styles.meta}>
        {t('articles.publishedOn', { date: formattedDate })} ·{' '}
        {t('articles.minRead', { count: article.readingTimeMinutes })}
      </p>

      <div className={styles.body}>
        <ArticleContent slug={article.slug} />
        <ReadingProgressNav headings={headings} />
      </div>
    </article>
  )
}

export default ArticlePageContent
