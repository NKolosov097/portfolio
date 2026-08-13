'use client'

import styles from './ArticleContent.module.css'

import { useTranslation } from 'react-i18next'

import { ELanguage } from '@/constants/header.constants'
import { articleContentRegistry } from '@/content/articles/registry'

interface IArticleContentProps {
  /** Slug of the article whose body should render, keyed into {@link articleContentRegistry}. */
  slug: string
}

export const ArticleContent = ({ slug }: IArticleContentProps) => {
  const { i18n } = useTranslation()

  const language: ELanguage = i18n.language === ELanguage.ru ? ELanguage.ru : ELanguage.en
  const Content = articleContentRegistry[slug]?.[language]

  if (!Content) {
    return null
  }

  return (
    <div className={styles.content} data-testid={`article-content-${slug}`}>
      <Content />
    </div>
  )
}

export default ArticleContent
