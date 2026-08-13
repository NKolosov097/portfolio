export interface IArticle {
  /** Stable identifier used as the React key and QA `data-testid` (lowercase, kebab-case). */
  id: string
  /** Article/talk title shown as the card heading. */
  title: string
  /** One-line summary of what the publication covers. */
  description: string
  /** Absolute URL the card links to (blog post, talk recording, video). */
  href: string
  /** Platform label shown as a small caption above the title (e.g. "Habr", "Medium", "YouTube"). */
  source: string
  /** False for self-hosted articles that navigate in-app instead of opening in a new tab. */
  isExternal?: boolean
}
