import { IArticle } from '@/home-sections/Writing/types/writing.type'

import { ELanguage } from '@/constants/header.constants'
import { aiBoilerplateSeniorEngineersArticle } from '@/constants/articles.constants'

/**
 * Publications surfaced in the Writing section: self-hosted articles (linked in-app via
 * `isExternal: false`) and, going forward, external ones (Habr, Medium, YouTube, etc.).
 * The section and its header tab stay hidden while this array is empty.
 */
export const writingArticles: IArticle[] = [
  {
    id: aiBoilerplateSeniorEngineersArticle.slug,
    title: aiBoilerplateSeniorEngineersArticle.title[ELanguage.en],
    description: aiBoilerplateSeniorEngineersArticle.description[ELanguage.en],
    href: `/articles/${aiBoilerplateSeniorEngineersArticle.slug}`,
    source: 'My blog',
    isExternal: false,
  },
]
