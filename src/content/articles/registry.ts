import { ComponentType } from 'react'

import { aiBoilerplateSeniorEngineersArticle } from '@/constants/articles.constants'

import AiBoilerplateSeniorEngineersContent, {
  HEADINGS as aiBoilerplateSeniorEngineersHeadings,
} from './ai-boilerplate-senior-engineers/Content'

/** A body component's section heading: a stable scroll-target id and its locale key. */
export interface IArticleHeadingEntry {
  id: string
  labelKey: string
}

/** Maps every article slug to its body component. Each component resolves its own text via i18next, so one component serves every supported language. */
export const articleContentRegistry: Record<string, ComponentType> = {
  [aiBoilerplateSeniorEngineersArticle.slug]: AiBoilerplateSeniorEngineersContent,
}

/** Maps every article slug to its section headings, in document order, for the reading-progress rail. */
export const articleHeadingsRegistry: Record<string, IArticleHeadingEntry[]> = {
  [aiBoilerplateSeniorEngineersArticle.slug]: aiBoilerplateSeniorEngineersHeadings,
}
