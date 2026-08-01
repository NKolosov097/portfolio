import { IArticle } from '@/home-sections/Writing/types/writing.type'

/**
 * TODO(publications): add articles, notes and talks here to surface the Writing section.
 *
 * The Writing section and its header tab stay hidden while this array is empty, so
 * appending entries is all that is required to publish them. Each entry needs:
 * a lowercase kebab-case `id` (React key + `data-testid`), a `title`, a one-line
 * `description`, an absolute `href`, and a `source` label (e.g. "Habr", "Medium").
 */
export const writingArticles: IArticle[] = []
