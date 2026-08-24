import { IArticle } from '@/home-sections/Writing/types/writing.type'

import { ARTICLES } from '@/constants/articles.constants'

/** Derived from the self-hosted article registry so every new article shows up here automatically. Section and header tab stay hidden while this array is empty. */
export const WRITING_ARTICLES: IArticle[] = ARTICLES.map((article) => ({
  id: article.slug,
  title: article.title,
  description: article.description,
  href: `/articles/${article.slug}`,
  sourceKey: 'writing.myBlog',
  isExternal: false,
}))
