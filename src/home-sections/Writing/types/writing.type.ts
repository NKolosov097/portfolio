import { ELanguage } from '@/constants/header.constants'

export interface IArticle {
  /** Stable identifier used as the React key and QA `data-testid` (lowercase, kebab-case). */
  id: string
  /** Article/talk title shown as the card heading, per language. */
  title: Record<ELanguage, string>
  /** One-line summary of what the publication covers, per language. */
  description: Record<ELanguage, string>
  /** Absolute URL the card links to (blog post, talk recording, video). */
  href: string
  /** i18n key for the small caption above the title (e.g. "writing.myBlog"). */
  sourceKey: string
  /** False for self-hosted articles that navigate in-app instead of opening in a new tab. */
  isExternal?: boolean
}
