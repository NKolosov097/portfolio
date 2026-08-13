import { ELanguage } from '@/constants/header.constants'

export interface IArticleMeta {
  /** Stable identifier, used as the `/articles/[slug]` route param and QA `data-testid`. */
  slug: string
  /** Title shown on the list page, as the page `<title>`, and as the JSON-LD `headline`, per language. */
  title: Record<ELanguage, string>
  /** One-line summary shown on the list page and used as the meta/JSON-LD description, per language. */
  description: Record<ELanguage, string>
  /** ISO 8601 date the article was published, used for display and as the sitemap/JSON-LD `datePublished`. */
  publishedDate: string
  /** Manually estimated reading time in minutes, shown as "N min read". */
  readingTimeMinutes: number
}

/** Exported individually so consumers needing exactly this article skip a runtime `.find()`. */
export const aiBoilerplateSeniorEngineersArticle: IArticleMeta = {
  slug: 'ai-boilerplate-senior-engineers',
  title: {
    [ELanguage.en]:
      "Compiling Isn't Shipping: What AI Boilerplate Still Leaves for Senior Engineers",
    [ELanguage.ru]:
      'Компилируется — не значит готово: что ИИ-boilerplate оставляет senior-инженеру',
  },
  description: {
    [ELanguage.en]:
      'AI closes the distance on typing code. It never closed the distance on owning it — here is what still requires a senior engineer in 2026.',
    [ELanguage.ru]:
      'ИИ сократил путь от идеи до кода, но не путь до владения этим кодом — что в 2026 году по-прежнему требует senior-инженера.',
  },
  publishedDate: '2026-08-13',
  readingTimeMinutes: 5,
}

/** Every self-hosted article, in reverse-chronological display order. */
export const ARTICLES: IArticleMeta[] = [aiBoilerplateSeniorEngineersArticle]
