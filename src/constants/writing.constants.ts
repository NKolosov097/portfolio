import { IArticle } from '@/home-sections/Writing/types/writing.type'

import { aiBoilerplateSeniorEngineersArticle } from '@/constants/articles.constants'

/** Section and header tab stay hidden while this array is empty. */
export const WRITING_ARTICLES: IArticle[] = [
  {
    id: aiBoilerplateSeniorEngineersArticle.slug,
    title: aiBoilerplateSeniorEngineersArticle.title,
    description: aiBoilerplateSeniorEngineersArticle.description,
    href: `/articles/${aiBoilerplateSeniorEngineersArticle.slug}`,
    sourceKey: 'writing.myBlog',
    isExternal: false,
  },
]
