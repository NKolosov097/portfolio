import { ComponentType } from 'react'

import { aiBoilerplateSeniorEngineersArticle } from '@/constants/articles.constants'

import AiBoilerplateSeniorEngineersContent from './ai-boilerplate-senior-engineers/Content'

/** Maps every article slug to its body component. Each component resolves its own text via i18next, so one component serves every supported language. */
export const articleContentRegistry: Record<string, ComponentType> = {
  [aiBoilerplateSeniorEngineersArticle.slug]: AiBoilerplateSeniorEngineersContent,
}
