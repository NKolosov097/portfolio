# Self-Hosted Articles Design

## Goal

Host original long-form articles on the portfolio itself (not just link out to Habr/Medium), so each article has its own shareable, deep-linkable page with readable typography, in English and Russian.

## Scope

First article: "Compiling Isn't Shipping: What AI Boilerplate Still Leaves for Senior Engineers" (slug `ai-boilerplate-senior-engineers`). The architecture must support adding further articles the same way, but no article-authoring tooling (CMS, MDX pipeline) is in scope — content is authored directly as TSX.

## Routing

Two new App Router routes, additive to the existing single-page `/`:

- `src/app/articles/page.tsx` — list of all self-hosted articles.
- `src/app/articles/[slug]/page.tsx` — a single article, statically generated via `generateStaticParams` from the article registry.

Deep-linking to a section within an article uses a plain URL fragment (`/articles/ai-boilerplate-senior-engineers#three-decisions-ai-wont-make-for-you`) resolved by the browser's native anchor scrolling — no client-side scroll JS needed. Section headings get stable, hand-assigned `id`s. Because the site header is sticky, heading elements get `scroll-margin-top` in the article CSS module so an anchor jump doesn't hide the heading behind it.

`HeaderTabs` already renders an empty placeholder on any pathname other than `/` (see `pathname === '/' ? <Tabs .../> : <div className={styles.tabs} />`), so the tab bar correctly disappears on `/articles` routes with no changes needed there. `Aside` is route-agnostic and stays as-is.

## Content authoring format

Each article's body is a single TSX component, not Markdown/MDX and not a pair of per-language files:

```
src/content/articles/ai-boilerplate-senior-engineers/
  Content.tsx   -- export default function Content(): the article's markup — <h2>/<p>/<strong>
                   with hand-set heading ids — sourcing every piece of text via useTranslation()
```

Rationale: the project has no Markdown/MDX pipeline today (no `@next/mdx`, `remark`, or `rehype`), and none of its content is currently rendered from raw strings via `dangerouslySetInnerHTML`. Introducing an MDX toolchain for a single article is more infrastructure than the current scope justifies. Plain TSX needs no new dependency and is fully covered by the project's existing strict-TypeScript/ESLint/Prettier setup.

An earlier version of this spec used a _pair_ of TSX files per article (`en.tsx`/`ru.tsx`), each holding its own copy of the full markup. That was rejected during implementation: it means every heading, paragraph, and inline `<strong>`/`<em>` exists twice, so a structural change (reordering a section, adding a paragraph) has to be repeated correctly in both files, and a third language would mean a third full copy of the markup. Instead, the markup lives in exactly one file, and every text string is a key resolved via `t('articleContent.<slug>.<key>')`, with the translated values living in `public/locales/en.json` / `ru.json` — the same locale files (and the same parity test, `src/configs/i18n/locales.test.ts`) already used for every other piece of UI copy in the app. Adding a language later means adding one more locale file's worth of translated strings, not a new component. Heading `id`s stay as literal strings in the single component (not translated), so a fragment link resolves identically regardless of the active language.

Inline emphasis inside a paragraph (e.g. the italicized "when" in the second section) is expressed by splitting that paragraph into multiple adjacent `t()` calls — a "before" key, the emphasized word as its own key, and an "after" key — rather than embedding markup inside a translation string. This avoids introducing `react-i18next`'s `<Trans>` component, which no other file in the project uses; plain `t()` calls stay consistent with the rest of the codebase's i18n usage.

## Article registry

New `src/constants/articles.constants.ts`, following the existing `IWorkExperience`/`resume.constants.tsx` pattern:

```ts
export interface IArticleMeta {
  /** Stable identifier, used as the route slug and QA data-testid. */
  slug: string
  /** Title shown on the list page and as the page <title>, per language. */
  title: Record<ELanguage, string>
  /** One-line summary shown on the list page and used as the meta description, per language. */
  description: Record<ELanguage, string>
  /** ISO date string, used for display and sitemap lastModified. */
  publishedDate: string
  /** Manually estimated reading time in minutes, shown as "N min read". */
  readingTimeMinutes: number
}

export const articles: IArticleMeta[] = [
  /* the one entry */
]
```

This registry is the single source of truth consumed by: the `/articles` list page, `generateStaticParams` + `generateMetadata` on `/articles/[slug]`, and the Writing section (below).

## Integration with the existing Writing section

Per-article cards in the existing "Writing" list (`writingArticles` / `IArticle` / `Article.tsx`) currently always render an external `<a target="_blank">`. Self-hosted articles are added to that same list rather than a separate one, so `IArticle` gets one new optional field:

```ts
/** False for self-hosted articles that should open as an in-app route via next/link, not a new tab. Defaults to true (external) when omitted, preserving current behavior for existing entries. */
isExternal?: boolean
```

`Article.tsx` renders `next/link` (no `target`/`rel`) when `isExternal === false`, and keeps the current external-anchor markup otherwise. This is the only change to existing Writing code; `Writing.tsx`'s "hide section when empty" check is unaffected.

## Readability ("reading mode")

No separate reader-mode toggle. The article page itself is the reading experience:

- Body copy constrained to ~65–75ch measure, generous `line-height`, spacing scale tuned for long-form prose — a dedicated CSS module (e.g. `ArticleContent.module.css`), not the compact styles used by the homepage's card-based sections.
- Heading hierarchy limited to `h1` (article title, rendered once by the page, not by the content component) and `h2`/`h3` inside content.
- No sidebar widgets or homepage chrome injected into the content column; `Aside` remains in its usual place outside the content column, unchanged.

## Rendering & performance

Both routes are fully static: no request-time data fetching, `generateStaticParams` on `/articles/[slug]` pre-renders every slug from the registry at build time, so both routes ship as plain pre-rendered HTML (same deployment model the rest of the site already uses on Vercel). The article body component is a client component only because it calls `useTranslation()` to resolve its strings — the same mechanism the rest of the app's i18n already relies on — not because of any per-language file switch. This keeps first paint of the article text as fast as the rest of the site.

## SEO

- `/articles/[slug]/page.tsx` exports `generateMetadata` (title, description, canonical, `alternates.languages` for en/ru, OpenGraph) sourced from the article registry, following the pattern already used in `layout.tsx`/`seo.constants.ts`.
- Per-article Open Graph image via `src/app/articles/[slug]/opengraph-image.tsx`, reusing the visual style of the existing root `opengraph-image.tsx` but rendering the article's own title instead of the author banner.
- Per-article JSON-LD: a `BlogPosting` node (headline, description, datePublished, author `@id` pointing at the existing `Person` node, url) embedded the same way `STRUCTURED_DATA` is embedded in `layout.tsx` today, so the article is machine-readable as structured data, not just prose.
- `sitemap.ts` is extended to include `/articles`, plus one entry per article with its `publishedDate` as `lastModified`.
- `robots.ts` already `allow`s `/` for every user agent (only `/api/` is disallowed), so no robots change is needed for either search engines or AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) to fetch article pages.

## Accessibility & machine readability

- Semantic structure: one `h1` (page-rendered title) and a strict `h2`/`h3` hierarchy inside content, real `<p>`/`<ul>`/`<strong>` elements — no div soup — so both screen readers and text-extracting crawlers get a clean outline.
- Full article text is present in the initial server-rendered HTML (static generation, no lazy/client-only content), so any crawler that doesn't execute JavaScript — many AI-agent fetchers included — still gets the complete article, not a skeleton.
- **Known limitation, pre-existing to the site and not solved by this feature:** `i18n.ts` intentionally pins language to English for SSR ("Fixed 'en' on init so SSR and initial hydration always produce identical HTML"), and `<html lang="en">` is static in `layout.tsx`. This means the statically-generated HTML for `/articles/[slug]` is always the English variant; the Russian variant only appears after client-side hydration switches language. A non-JS crawler hitting the URL will only ever see English, same as every other translated section of the site today. Serving locale-correct HTML per URL would require splitting into `/en/`, `/ru/` routes — a site-wide i18n architecture change, out of scope here.

## Verification

- `pnpm check-types && pnpm lint`.
- Unit/component coverage for the new `isExternal` branch in `Article.tsx` and for the article registry-driven list/detail pages, following existing test conventions in the repo.
- Manual check in the browser: `/articles` lists the article, `/articles/ai-boilerplate-senior-engineers` renders in both languages via the language switcher, a `#heading-id` fragment link scrolls to the right heading without hiding it under the sticky header, and the Writing section card on `/` opens the article in-app (no new tab).
- `next build` confirms both routes are emitted as static (○/●) output, not server-rendered on demand.
- View-source (or `curl`) the built `/articles/ai-boilerplate-senior-engineers` page and confirm the full article text and the `BlogPosting` JSON-LD block are present without running JavaScript.
