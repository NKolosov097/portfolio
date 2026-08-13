'use client'

import styles from './ArticleContent.module.css'

import { articleContentRegistry } from '@/content/articles/registry'

interface IArticleContentProps {
  /** Slug of the article whose body should render, keyed into {@link articleContentRegistry}. */
  slug: string
}

export const ArticleContent = ({ slug }: IArticleContentProps) => {
  const Content = articleContentRegistry[slug]

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
