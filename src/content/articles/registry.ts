import { ComponentType } from 'react'

import { ELanguage } from '@/constants/header.constants'
import { aiBoilerplateSeniorEngineersArticle } from '@/constants/articles.constants'

import AiBoilerplateSeniorEngineersEn from './ai-boilerplate-senior-engineers/en'
import AiBoilerplateSeniorEngineersRu from './ai-boilerplate-senior-engineers/ru'

/** An article's body, as a per-language TSX component with no props. */
type ArticleContentComponent = ComponentType

/** Maps every article slug to its body component in each supported language. */
export const articleContentRegistry: Record<string, Record<ELanguage, ArticleContentComponent>> =
  {
    [aiBoilerplateSeniorEngineersArticle.slug]: {
      [ELanguage.en]: AiBoilerplateSeniorEngineersEn,
      [ELanguage.ru]: AiBoilerplateSeniorEngineersRu,
    },
  }
