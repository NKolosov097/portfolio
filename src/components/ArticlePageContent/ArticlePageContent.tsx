'use client'

import styles from './ArticlePageContent.module.css'

import { useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import { ELanguage } from '@/constants/header.constants'
import { IArticleMeta } from '@/constants/articles.constants'
import { ArticleContent } from '@/components/ArticleContent/ArticleContent'

interface IArticlePageContentProps {
  /** Metadata of the article being displayed, looked up by the page from the article registry. */
  article: IArticleMeta
}

export const ArticlePageContent = ({ article }: IArticlePageContentProps) => {
  const { t, i18n } = useTranslation()

  // The root layout's Suspense boundary briefly swaps in its loading fallback during
  // hydration, which unmounts this tree after the browser's native "scroll to URL
  // fragment" step already ran (and against a shorter, not-yet-laid-out page). Once this
  // component's real content is mounted for good, re-run that scroll ourselves —
  // `scrollIntoView` honors the `scroll-margin-top` set on headings in ArticleContent.module.css.
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) {
      return
    }

    document.getElementById(hash)?.scrollIntoView()
  }, [])

  const language: ELanguage = i18n.language === ELanguage.ru ? ELanguage.ru : ELanguage.en

  const formattedDate = new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(
    new Date(article.publishedDate),
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

      <ArticleContent slug={article.slug} />
    </article>
  )
}

export default ArticlePageContent
