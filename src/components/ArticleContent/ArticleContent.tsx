'use client'

import styles from './ArticleContent.module.css'

import { useTranslation } from 'react-i18next'

import { articleContentRegistry } from '@/content/articles/registry'

interface IArticleContentProps {
  /** Slug of the article whose body should render, keyed into {@link articleContentRegistry}. */
  slug: string
}

export const ArticleContent = ({ slug }: IArticleContentProps) => {
  const { t } = useTranslation()
  const Content = articleContentRegistry[slug]

  if (!Content) {
    return (
      <p className={styles.missing} data-testid={`article-content-${slug}`}>
        {t('articles.missingContent')}
      </p>
    )
  }

  return (
    <div className={styles.content} data-testid={`article-content-${slug}`}>
      <Content />
    </div>
  )
}

export default ArticleContent
