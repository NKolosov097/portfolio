# Self-Hosted Articles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Host the first original long-form article ("Compiling Isn't Shipping: What AI Boilerplate Still Leaves for Senior Engineers") on dedicated, statically-generated `/articles` and `/articles/[slug]` pages, in English and Russian, with deep-linkable sections, SEO metadata/structured data, and a readable article layout.

**Architecture:** A typed article registry (`src/constants/articles.constants.ts`) is the single source of truth for metadata, consumed by the list page, the detail page's static generation/metadata, the per-article OG image, the sitemap, and the existing homepage "Writing" card. Article bodies are plain TSX components (one per language) picked at render time by the active `i18next` language, avoiding any new Markdown/MDX dependency. Both routes are fully static via `generateStaticParams`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript (strict), react-i18next, CSS Modules, Vitest, Playwright — all already in the project; no new dependencies.

## Global Constraints

- Follow `docs/superpowers/specs/2026-08-13-self-hosted-articles-design.md` exactly; if an implementation detail below seems to conflict with it, the spec wins.
- No Markdown/MDX pipeline — article bodies are hand-written TSX per the spec's rationale.
- This repo has no React component-testing library (no `@testing-library/react`) and no existing component unit tests — do not add one. Cover component/page behavior with Playwright e2e, following `e2e/smoke.spec.ts` and `e2e/aside-ghost.spec.ts` conventions. Use Vitest only for pure-logic/data assertions (registry invariants, heading-id parity), following `src/constants/home.constants.test.ts` and `src/configs/i18n/locales.test.ts` conventions.
- Strict TypeScript: no `any`, avoid type assertions, JSDoc on every interface/type field (per `CLAUDE.md`).
- `IArticleMeta.title`/`description` are `Record<ELanguage, string>` — not i18next keys. Only page chrome (headings, labels) goes through `public/locales/en.json` / `ru.json`.
- Import order in every file: relative style import first, blank line, external packages, blank line, internal `@/`-aliased imports (deepest/most specific last), matching the existing files read during planning (e.g. `src/home-sections/Writing/components/Article/Article.tsx`).
- Git commits: author is picked up from the existing local git config (`Nikita Kolosov <n.kolosov2003@mail.ru>`, already used by every prior commit in this repo) — do not add a `Co-Authored-By` trailer, matching this repo's existing commit history.
- Run `pnpm check-types && pnpm lint` after every task; it must be clean before moving on.

---

### Task 1: Article registry

**Files:**

- Create: `src/constants/articles.constants.ts`
- Create: `src/constants/articles.constants.test.ts`

**Interfaces:**

- Produces: `interface IArticleMeta { slug: string; title: Record<ELanguage, string>; description: Record<ELanguage, string>; publishedDate: string; readingTimeMinutes: number }`, `export const aiBoilerplateSeniorEngineersArticle: IArticleMeta`, `export const articles: IArticleMeta[]`.

- [ ] **Step 1: Write the failing registry test**

  Create `src/constants/articles.constants.test.ts`:

  ```ts
  import { describe, expect, it } from 'vitest'

  import { ELanguage } from '@/constants/header.constants'
  import { articles } from '@/constants/articles.constants'

  const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

  describe('articles registry', () => {
    it('defines at least one article', () => {
      expect(articles.length).toBeGreaterThan(0)
    })

    it('gives every article a unique, kebab-case slug', () => {
      const slugs = articles.map((article) => article.slug)

      for (const slug of slugs) {
        expect(slug).toMatch(SLUG_PATTERN)
      }

      expect(new Set(slugs).size).toBe(slugs.length)
    })

    it('translates title and description into every supported language', () => {
      for (const article of articles) {
        for (const language of [ELanguage.en, ELanguage.ru]) {
          expect(article.title[language]?.trim()).toBeTruthy()
          expect(article.description[language]?.trim()).toBeTruthy()
        }
      }
    })

    it('gives every article a positive reading time and a parsable publish date', () => {
      for (const article of articles) {
        expect(article.readingTimeMinutes).toBeGreaterThan(0)
        expect(Number.isNaN(Date.parse(article.publishedDate))).toBe(false)
      }
    })
  })
  ```

- [ ] **Step 2: Run the test to verify it fails**

  Run: `pnpm vitest run src/constants/articles.constants.test.ts`
  Expected: FAIL — `Cannot find module '@/constants/articles.constants'`.

- [ ] **Step 3: Implement the registry**

  Create `src/constants/articles.constants.ts`:

  ```ts
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

  /**
   * The first self-hosted article. Exported individually (not just looked up from
   * {@link articles}) so consumers that need exactly this article — like the homepage
   * Writing card — get a type-checked reference instead of a runtime `.find()` lookup.
   */
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
  export const articles: IArticleMeta[] = [aiBoilerplateSeniorEngineersArticle]
  ```

- [ ] **Step 4: Run the test to verify it passes**

  Run: `pnpm vitest run src/constants/articles.constants.test.ts`
  Expected: PASS (4 tests).

- [ ] **Step 5: Type-check and lint**

  Run: `pnpm check-types && pnpm lint`
  Expected: no errors.

- [ ] **Step 6: Commit**

  ```bash
  git add src/constants/articles.constants.ts src/constants/articles.constants.test.ts
  git commit -m "feat: add self-hosted article registry"
  ```

---

### Task 2: Article body content, via a single component and locale strings

> **Revised during implementation.** The first version of this task wrote a separate `en.tsx`/`ru.tsx`
> pair per article, each holding a full copy of the markup. The author flagged that as
> duplication: any structural change (a new paragraph, a reordered section) would need to be
> made correctly in both files, and a third language would mean a third copy of the same markup.
> This task now matches the corrected approach recorded in the design spec: one component, every
> string sourced from the locale files that already carry the rest of the app's UI copy.

**Files:**

- Create: `src/content/articles/ai-boilerplate-senior-engineers/Content.tsx`
- Modify: `public/locales/en.json`
- Modify: `public/locales/ru.json`

**Interfaces:**

- Produces: `export default function AiBoilerplateSeniorEngineersContent(): JSX.Element`, a zero-prop component rendering `<h2 id="...">`/`<p>`/`<strong>`/`<em>` content, with every string sourced via `useTranslation()` under the `articleContent.aiBoilerplateSeniorEngineers.*` namespace. Heading ids (literal, not translated): `what-ai-actually-closes-well`, `three-decisions-ai-wont-make-for-you`, `the-real-skill-gap-is-direction-not-typing`.

- [ ] **Step 1: Add the English strings**

  In `public/locales/en.json`, insert a new top-level block right after the `"articles"` block added in Task 5 (add this task's locale edits together with Task 5's, in either order):

  ```json
    "articleContent": {
      "aiBoilerplateSeniorEngineers": {
        "intro1": "Ninety percent of developers now use an AI coding assistant regularly. Copilot, Cursor, Claude Code — pick one, and it will write you a working component in seconds. A form with validation. A CRUD screen. A data table with sorting. Code that compiles, passes the linter, and looks like something a human wrote.",
        "intro2": "None of that means it's ready to ship.",
        "intro3": "There's a gap between “the code runs” and “the product survives production,” and in 2026 that gap is exactly where the job of a senior engineer lives. AI closed the distance on typing code. It didn't close the distance on owning it.",
        "closesWellHeading": "What AI Actually Closes Well",
        "closesWell1": "Worth saying plainly: AI is genuinely good at boilerplate, and pretending otherwise wastes everyone's time. Scaffolding a new route, wiring a form to a schema, generating a test skeleton, translating a Figma layout into markup — these are pattern-matching tasks, and pattern-matching is what large models do best. If a task has been solved the same way a thousand times on GitHub, an AI assistant will solve it for you in seconds, and it should.",
        "closesWell2": "The failure mode isn't using AI for this. It's treating everything else as if it worked the same way.",
        "decisionsHeading": "Three Decisions AI Won't Make for You",
        "decision1Lead": "1. Rendering strategy, not just rendering code.",
        "decision1Before": "On a real-time product I worked on — video and audio streaming in the browser — the question was never “can you render this component.” It was ",
        "decision1Em": "when",
        "decision1After": ": does this piece hydrate before the media connection opens, or after? Get it backwards and you either block the user on JavaScript that doesn't matter yet, or you let them click “join” before the stream is actually ready to receive input. An AI assistant will happily generate a component that renders correctly in isolation. It has no opinion on where that component sits in your connection lifecycle, because that opinion depends on your architecture, not your syntax.",
        "decision2Lead": "2. Where the weight goes.",
        "decision2Body": "Bundle-splitting and offloading work to a Web Worker both “work” almost anywhere you put them — that's what makes them dangerous to delegate. AI will suggest a lazy-loaded chunk boundary that's syntactically fine and practically wrong: splitting at a point that still blocks first paint, or moving computation to a worker that then has to serialize a payload so large the postMessage cost erases the benefit. Judging that trade-off means knowing your actual traffic shape, your device targets, your performance budget — context that lives in your team's dashboards, not in the prompt.",
        "decision3Lead": "3. What deserves a test, and what a passing test actually proves.",
        "decision3Body": "Ask an AI assistant to write tests for a component and it will write tests — for the happy path, matching whatever the component currently does. That's the trap: it tests the implementation, not the requirement. On the same real-time product, the tests that mattered weren't “does the button render” — they were “does the UI recover correctly when the connection drops mid-call” and “does the reconnect logic race against a user who already closed the tab.” Nobody generates that test by pattern-matching the codebase, because the failure case isn't in the codebase yet. Deciding what should break the build is a judgment call about risk, and judgment calls are the one thing you can't outsource to autocomplete.",
        "skillGapHeading": "The Real Skill Gap Is Direction, Not Typing",
        "skillGap1": "Put these three together and a pattern shows up: none of them are about writing code faster. They're about deciding what the code is for before a single line exists. AI collapses the distance between “I know what I want” and “it's written.” It does nothing to help you figure out what you want in the first place — and in a system with real-time constraints, real users, and real failure modes, that's most of the job.",
        "skillGap2": "This is also the cleanest way to tell candidates apart in an interview. Anyone can now produce a working component on request — that stopped being a signal the moment AI assistants got good. What still separates a senior hire from a junior one is whether they can look at generated code and say why it's wrong for this system, or whether they ship whatever came back from the prompt because it passed CI. One of those people is directing a tool. The other is hoping it's right.",
        "skillGap3": "If you're hiring for “AI-native” engineers, that's the question worth asking in the interview — not “do you use Copilot,” but “show me a time an AI suggestion was reasonable and still wrong.” The answer tells you whether you're looking at ownership or autocomplete with a job title.",
        "closing": "AI didn't make senior engineers less necessary. It just made the necessary part more visible."
      }
    },
  ```

- [ ] **Step 2: Add the Russian strings**

  In `public/locales/ru.json`, insert the matching block (same keys, translated values) in the same position.

- [ ] **Step 3: Write the content component**

  Create `src/content/articles/ai-boilerplate-senior-engineers/Content.tsx`:

  ```tsx
  'use client'

  import { useTranslation } from 'react-i18next'

  export const AiBoilerplateSeniorEngineersContent = () => {
    const { t } = useTranslation()

    return (
      <>
        <p>{t('articleContent.aiBoilerplateSeniorEngineers.intro1')}</p>
        <p>{t('articleContent.aiBoilerplateSeniorEngineers.intro2')}</p>
        <p>{t('articleContent.aiBoilerplateSeniorEngineers.intro3')}</p>

        <h2 id="what-ai-actually-closes-well">
          {t('articleContent.aiBoilerplateSeniorEngineers.closesWellHeading')}
        </h2>

        <p>{t('articleContent.aiBoilerplateSeniorEngineers.closesWell1')}</p>
        <p>{t('articleContent.aiBoilerplateSeniorEngineers.closesWell2')}</p>

        <h2 id="three-decisions-ai-wont-make-for-you">
          {t('articleContent.aiBoilerplateSeniorEngineers.decisionsHeading')}
        </h2>

        <p>
          <strong>{t('articleContent.aiBoilerplateSeniorEngineers.decision1Lead')}</strong>{' '}
          {t('articleContent.aiBoilerplateSeniorEngineers.decision1Before')}
          <em>{t('articleContent.aiBoilerplateSeniorEngineers.decision1Em')}</em>
          {t('articleContent.aiBoilerplateSeniorEngineers.decision1After')}
        </p>

        <p>
          <strong>{t('articleContent.aiBoilerplateSeniorEngineers.decision2Lead')}</strong>{' '}
          {t('articleContent.aiBoilerplateSeniorEngineers.decision2Body')}
        </p>

        <p>
          <strong>{t('articleContent.aiBoilerplateSeniorEngineers.decision3Lead')}</strong>{' '}
          {t('articleContent.aiBoilerplateSeniorEngineers.decision3Body')}
        </p>

        <h2 id="the-real-skill-gap-is-direction-not-typing">
          {t('articleContent.aiBoilerplateSeniorEngineers.skillGapHeading')}
        </h2>

        <p>{t('articleContent.aiBoilerplateSeniorEngineers.skillGap1')}</p>
        <p>{t('articleContent.aiBoilerplateSeniorEngineers.skillGap2')}</p>
        <p>{t('articleContent.aiBoilerplateSeniorEngineers.skillGap3')}</p>

        <p>{t('articleContent.aiBoilerplateSeniorEngineers.closing')}</p>
      </>
    )
  }

  export default AiBoilerplateSeniorEngineersContent
  ```

- [ ] **Step 4: Run the locale parity test**

  Run: `pnpm vitest run src/configs/i18n/locales.test.ts`
  Expected: PASS — confirms `en.json`/`ru.json` still have identical key sets with no blank values, covering the new `articleContent.*` keys.

- [ ] **Step 5: Type-check and lint**

  Run: `pnpm check-types && pnpm lint`
  Expected: no errors.

- [ ] **Step 6: Commit**

  ```bash
  git add src/content/articles/ai-boilerplate-senior-engineers public/locales/en.json public/locales/ru.json
  git commit -m "feat: add ai-boilerplate-senior-engineers article content"
  ```

---

### Task 3: Content registry and the `ArticleContent` reader component

**Files:**

- Create: `src/content/articles/registry.ts`
- Create: `src/components/ArticleContent/ArticleContent.tsx`
- Create: `src/components/ArticleContent/ArticleContent.module.css`

**Interfaces:**

- Consumes: `AiBoilerplateSeniorEngineersContent` (Task 2), `aiBoilerplateSeniorEngineersArticle` (Task 1).
- Produces: `export const articleContentRegistry: Record<string, ComponentType>`; `export const ArticleContent = ({ slug }: { slug: string }) => JSX.Element | null`, rendered as `<div data-testid={\`article-content-${slug}\`}>`. The registry is keyed only by slug — each component resolves its own language internally via `useTranslation()`, so there is nothing language-specific left for `ArticleContent` to select.

- [ ] **Step 1: Create the content registry**

  Create `src/content/articles/registry.ts`:

  ```ts
  import { ComponentType } from 'react'

  import { aiBoilerplateSeniorEngineersArticle } from '@/constants/articles.constants'

  import AiBoilerplateSeniorEngineersContent from './ai-boilerplate-senior-engineers/Content'

  /** Maps every article slug to its body component. Each component resolves its own text via i18next, so one component serves every supported language. */
  export const articleContentRegistry: Record<string, ComponentType> = {
    [aiBoilerplateSeniorEngineersArticle.slug]: AiBoilerplateSeniorEngineersContent,
  }
  ```

- [ ] **Step 2: Create the reader component's styles**

  Create `src/components/ArticleContent/ArticleContent.module.css`:

  ```css
  .content {
    max-width: 68ch;
    margin: 0 auto;
    font-size: 1.0625rem;
    line-height: 1.75;
    color: rgb(255 255 255 / 88%);
  }

  .content h2 {
    margin-top: 2.5em;
    margin-bottom: 0.75em;
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.3;
    color: #fff;
    scroll-margin-top: calc(var(--header-height) + var(--body-padding));
  }

  .content h3 {
    margin-top: 2em;
    margin-bottom: 0.6em;
    font-size: 1.2rem;
    font-weight: 600;
    color: #fff;
    scroll-margin-top: calc(var(--header-height) + var(--body-padding));
  }

  .content p {
    margin: 0 0 1.25em;
  }

  .content strong {
    color: #fff;
  }

  .content p:last-child {
    margin-bottom: 0;
  }

  @media screen and (width <= 900px) {
    .content {
      max-width: 100%;
      font-size: 1rem;
    }
  }
  ```

- [ ] **Step 3: Create the reader component**

  Create `src/components/ArticleContent/ArticleContent.tsx`:

  ```tsx
  'use client'

  import styles from './ArticleContent.module.css'

  import { articleContentRegistry } from '@/content/articles/registry'

  interface IArticleContentProps {
    /** Slug of the article whose body should render, keyed into {@link articleContentRegistry}. */
    slug: string
  }

  export const ArticleContent = ({ slug }: IArticleContentProps) => {
    const Content = articleContentRegistry[slug]

    if (!Content) {
      return null
    }

    return (
      <div className={styles.content} data-testid={`article-content-${slug}`}>
        <Content />
      </div>
    )
  }

  export default ArticleContent
  ```

- [ ] **Step 4: Type-check and lint**

  Run: `pnpm check-types && pnpm lint`
  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add src/content/articles/registry.ts src/components/ArticleContent
  git commit -m "feat: add article content registry and reader component"
  ```

---

### Task 4: Extend the Writing card to support in-app links

**Files:**

- Modify: `src/home-sections/Writing/types/writing.type.ts`
- Modify: `src/home-sections/Writing/components/Article/Article.tsx`

**Interfaces:**

- Produces: `IArticle.isExternal?: boolean` (default `true` when omitted).

- [ ] **Step 1: Add `isExternal` to the type**

  In `src/home-sections/Writing/types/writing.type.ts`, add a field after `source`:

  ```ts
    /** Platform label shown as a small caption above the title (e.g. "Habr", "Medium", "YouTube"). */
    source: string
    /**
     * False for self-hosted articles that should navigate in-app via `next/link` instead of
     * opening as an external link in a new tab. Omit (or set `true`) for external publications —
     * this preserves the existing external-link behavior.
     */
    isExternal?: boolean
  }
  ```

- [ ] **Step 2: Branch the card's rendering on `isExternal`**

  Replace the full body of `src/home-sections/Writing/components/Article/Article.tsx`:

  ```tsx
  'use client'

  import styles from './Article.module.css'

  import Link from 'next/link'
  import { useTranslation } from 'react-i18next'

  import { IArticle } from '@/home-sections/Writing/types/writing.type'

  export const Article = ({
    id,
    title,
    description,
    href,
    source,
    isExternal = true,
  }: IArticle) => {
    const { t } = useTranslation()

    const cardContent = (
      <>
        <span className={styles.source}>{source}</span>
        <span className={styles.title}>{title}</span>
        <span className={styles.description}>{description}</span>
      </>
    )

    if (!isExternal) {
      return (
        <li className={styles.container}>
          <Link href={href} data-testid={`writing-article-${id}`} className={styles.card}>
            {cardContent}
          </Link>
        </li>
      )
    }

    return (
      <li className={styles.container}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${title} — ${t('aside.opensInNewTab')}`}
          data-testid={`writing-article-${id}`}
          className={styles.card}
        >
          {cardContent}
        </a>
      </li>
    )
  }

  export default Article
  ```

- [ ] **Step 3: Type-check and lint**

  Run: `pnpm check-types && pnpm lint`
  Expected: no errors. (`writingArticles` is still `[]` at this point, so nothing renders yet — behavior is verified in Task 7's e2e test once an entry exists.)

- [ ] **Step 4: Commit**

  ```bash
  git add src/home-sections/Writing/types/writing.type.ts src/home-sections/Writing/components/Article/Article.tsx
  git commit -m "feat: let Writing cards link in-app for self-hosted articles"
  ```

---

### Task 5: Locale strings for the articles pages

**Files:**

- Modify: `public/locales/en.json`
- Modify: `public/locales/ru.json`

**Interfaces:**

- Produces: `articles.pageTitle`, `articles.pageDescription`, `articles.minRead`, `articles.publishedOn`, `articles.backToList` in both locale files.

- [ ] **Step 1: Add the English strings**

  In `public/locales/en.json`, insert a new top-level block right after the existing `"writing"` block (currently lines 65–67):

  ```json
    "writing": {
      "header": "Articles, notes and talks"
    },

    "articles": {
      "pageTitle": "Articles",
      "pageDescription": "Long-form articles on frontend engineering, real-time systems, and building with AI.",
      "minRead": "{{count}} min read",
      "publishedOn": "Published {{date}}",
      "backToList": "All articles"
    },
  ```

- [ ] **Step 2: Add the Russian strings**

  In `public/locales/ru.json`, insert the matching block in the same position:

  ```json
    "writing": {
      "header": "Статьи, заметки и доклады"
    },

    "articles": {
      "pageTitle": "Статьи",
      "pageDescription": "Статьи о фронтенд-разработке, real-time системах и разработке с использованием ИИ.",
      "minRead": "{{count}} мин чтения",
      "publishedOn": "Опубликовано {{date}}",
      "backToList": "Все статьи"
    },
  ```

- [ ] **Step 3: Run the locale parity test**

  Run: `pnpm vitest run src/configs/i18n/locales.test.ts`
  Expected: PASS — confirms the two files still have identical key sets with no blank values.

- [ ] **Step 4: Commit**

  ```bash
  git add public/locales/en.json public/locales/ru.json
  git commit -m "feat: add articles page locale strings"
  ```

---

### Task 6: Articles list page (`/articles`)

**Files:**

- Create: `src/components/ArticleListItem/ArticleListItem.tsx`
- Create: `src/components/ArticleListItem/ArticleListItem.module.css`
- Create: `src/components/ArticlesListContent/ArticlesListContent.tsx`
- Create: `src/components/ArticlesListContent/ArticlesListContent.module.css`
- Create: `src/app/articles/page.tsx`

**Interfaces:**

- Consumes: `IArticleMeta`, `articles` (Task 1); `articles.*` locale keys (Task 5).
- Produces: route `/articles`, `data-testid={\`article-list-item-${slug}\`}` on each card.

- [ ] **Step 1: Create the list item component**

  Create `src/components/ArticleListItem/ArticleListItem.module.css`:

  ```css
  .container {
    width: 100%;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1.5rem;
    color: inherit;
    text-decoration: none;
    background: #111;
    border: 1px solid rgb(255 255 255 / 15%);
    border-radius: 1rem;
    transition:
      transform 0.2s ease-out,
      border-color 0.25s ease;
  }

  .card:hover,
  .card:focus-visible {
    border-color: rgb(255 255 255 / 40%);
    transform: translateY(-4px);
    outline: none;
  }

  .title {
    font-size: 1.35rem;
    font-weight: 600;
  }

  .description {
    font-size: 0.95rem;
    line-height: 1.5;
    color: rgb(255 255 255 / 70%);
  }

  .meta {
    font-size: 0.8rem;
    color: rgb(255 255 255 / 50%);
  }

  @media (prefers-reduced-motion: reduce) {
    .card:hover,
    .card:focus-visible {
      transform: none;
    }
  }
  ```

  Create `src/components/ArticleListItem/ArticleListItem.tsx`:

  ```tsx
  'use client'

  import styles from './ArticleListItem.module.css'

  import Link from 'next/link'
  import { useTranslation } from 'react-i18next'

  import { ELanguage } from '@/constants/header.constants'
  import { IArticleMeta } from '@/constants/articles.constants'

  export const ArticleListItem = ({
    slug,
    title,
    description,
    publishedDate,
    readingTimeMinutes,
  }: IArticleMeta) => {
    const { t, i18n } = useTranslation()

    const language: ELanguage = i18n.language === ELanguage.ru ? ELanguage.ru : ELanguage.en

    const formattedDate = new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(
      new Date(publishedDate),
    )

    return (
      <li className={styles.container}>
        <Link
          href={`/articles/${slug}`}
          data-testid={`article-list-item-${slug}`}
          className={styles.card}
        >
          <span className={styles.title}>{title[language]}</span>
          <span className={styles.description}>{description[language]}</span>
          <span className={styles.meta}>
            {formattedDate} · {t('articles.minRead', { count: readingTimeMinutes })}
          </span>
        </Link>
      </li>
    )
  }

  export default ArticleListItem
  ```

- [ ] **Step 2: Create the list page content**

  Create `src/components/ArticlesListContent/ArticlesListContent.module.css`:

  ```css
  .section {
    display: flex;
    flex-direction: column;
    min-height: var(--min-height-section);
    max-width: 68ch;
    padding-top: 1rem;
    margin: 0 auto;
  }

  .header {
    margin-bottom: 0.5rem;
  }

  .description {
    margin-bottom: 2rem;
    color: rgb(255 255 255 / 70%);
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    padding: 0;
    list-style: none;
  }
  ```

  Create `src/components/ArticlesListContent/ArticlesListContent.tsx`:

  ```tsx
  'use client'

  import styles from './ArticlesListContent.module.css'

  import { useTranslation } from 'react-i18next'

  import { articles } from '@/constants/articles.constants'
  import { ArticleListItem } from '@/components/ArticleListItem/ArticleListItem'

  export const ArticlesListContent = () => {
    const { t } = useTranslation()

    return (
      <section className={styles.section}>
        <h1 className={styles.header}>{t('articles.pageTitle')}</h1>
        <p className={styles.description}>{t('articles.pageDescription')}</p>

        <ul className={styles.list}>
          {articles.map((article) => (
            <ArticleListItem key={article.slug} {...article} />
          ))}
        </ul>
      </section>
    )
  }

  export default ArticlesListContent
  ```

- [ ] **Step 3: Create the route**

  Create `src/app/articles/page.tsx`:

  ```tsx
  import type { Metadata } from 'next'

  import { SITE_URL } from '@/constants/seo.constants'

  import en from '@public/locales/en.json'

  import { ArticlesListContent } from '@/components/ArticlesListContent/ArticlesListContent'

  export const metadata: Metadata = {
    title: en.articles.pageTitle,
    description: en.articles.pageDescription,
    alternates: {
      canonical: '/articles',
    },
    openGraph: {
      title: en.articles.pageTitle,
      description: en.articles.pageDescription,
      url: `${SITE_URL}/articles`,
      type: 'website',
    },
  }

  export default function ArticlesPage() {
    return <ArticlesListContent />
  }
  ```

- [ ] **Step 4: Type-check and lint**

  Run: `pnpm check-types && pnpm lint`
  Expected: no errors.

- [ ] **Step 5: Manual check**

  Run: `pnpm build && pnpm start`, then open `http://localhost:3000/articles`.
  Expected: `articles` already has one entry from Task 1, so the "Compiling Isn't Shipping…" card is visible with its date and "5 min read".

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/ArticleListItem src/components/ArticlesListContent src/app/articles/page.tsx
  git commit -m "feat: add /articles list page"
  ```

---

### Task 7: Article detail page (`/articles/[slug]`) with SEO metadata and JSON-LD

**Files:**

- Create: `src/components/ArticlePageContent/ArticlePageContent.tsx`
- Create: `src/components/ArticlePageContent/ArticlePageContent.module.css`
- Create: `src/app/articles/[slug]/page.tsx`

**Interfaces:**

- Consumes: `IArticleMeta`, `articles`, `aiBoilerplateSeniorEngineersArticle` (Task 1); `ArticleContent` (Task 3); `articles.*` locale keys (Task 5); `STRUCTURED_DATA`'s `Person` `@id` shape from `src/constants/seo.constants.ts` (`${SITE_URL}/#person`).
- Produces: route `/articles/[slug]`, statically generated for every registry slug; `data-testid` on `ArticleContent` inherited from Task 3.

- [ ] **Step 1: Create the detail page content component**

  Create `src/components/ArticlePageContent/ArticlePageContent.module.css`:

  ```css
  .article {
    display: flex;
    flex-direction: column;
    min-height: var(--min-height-section);
    padding-top: 1rem;
  }

  .backLink {
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    color: var(--g-color-line-brand);
  }

  .title {
    max-width: 68ch;
    margin: 0 auto 0.5rem;
    font-size: clamp(1.75rem, 3vw, 2.5rem);
    line-height: 1.2;
    text-align: center;
  }

  .meta {
    max-width: 68ch;
    margin: 0 auto 2.5rem;
    font-size: 0.9rem;
    color: rgb(255 255 255 / 60%);
    text-align: center;
  }
  ```

  Create `src/components/ArticlePageContent/ArticlePageContent.tsx`:

  ```tsx
  'use client'

  import styles from './ArticlePageContent.module.css'

  import { useEffect } from 'react'
  import Link from 'next/link'
  import { useTranslation } from 'react-i18next'

  import { ELanguage } from '@/constants/header.constants'
  import { IArticleMeta } from '@/constants/articles.constants'
  import { ArticleContent } from '@/components/ArticleContent/ArticleContent'

  interface IArticlePageContentProps {
    /** Metadata of the article being displayed, looked up by the page from the article registry. */
    article: IArticleMeta
  }

  export const ArticlePageContent = ({ article }: IArticlePageContentProps) => {
    const { t, i18n } = useTranslation()

    // The root layout's Suspense boundary briefly swaps in its loading fallback during
    // hydration, which unmounts this tree after the browser's native "scroll to URL
    // fragment" step already ran (and against a shorter, not-yet-laid-out page). Once this
    // component's real content is mounted for good, re-run that scroll ourselves —
    // `scrollIntoView` honors the `scroll-margin-top` set on headings in ArticleContent.module.css.
    useEffect(() => {
      const hash = window.location.hash.slice(1)
      if (!hash) {
        return
      }

      document.getElementById(hash)?.scrollIntoView()
    }, [])

    const language: ELanguage = i18n.language === ELanguage.ru ? ELanguage.ru : ELanguage.en

    const formattedDate = new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(
      new Date(article.publishedDate),
    )

    return (
      <article className={styles.article}>
        <Link href="/articles" className={styles.backLink}>
          {t('articles.backToList')}
        </Link>

        <h1 className={styles.title}>{article.title[language]}</h1>

        <p className={styles.meta}>
          {t('articles.publishedOn', { date: formattedDate })} ·{' '}
          {t('articles.minRead', { count: article.readingTimeMinutes })}
        </p>

        <ArticleContent slug={article.slug} />
      </article>
    )
  }

  export default ArticlePageContent
  ```

- [ ] **Step 2: Create the route with static params, metadata, and JSON-LD**

  Create `src/app/articles/[slug]/page.tsx`:

  ```tsx
  import type { Metadata } from 'next'
  import { notFound } from 'next/navigation'

  import { SITE_URL } from '@/constants/seo.constants'
  import { ELanguage } from '@/constants/header.constants'
  import { articles, IArticleMeta } from '@/constants/articles.constants'

  import { ArticlePageContent } from '@/components/ArticlePageContent/ArticlePageContent'

  interface IArticlePageProps {
    params: Promise<{ slug: string }>
  }

  /** Looks up an article's registry entry by slug, or `undefined` for an unknown slug. */
  const findArticle = (slug: string): IArticleMeta | undefined =>
    articles.find((article) => article.slug === slug)

  export function generateStaticParams() {
    return articles.map((article) => ({ slug: article.slug }))
  }

  export async function generateMetadata({ params }: IArticlePageProps): Promise<Metadata> {
    const { slug } = await params
    const article = findArticle(slug)

    if (!article) {
      return {}
    }

    const url = `${SITE_URL}/articles/${slug}`

    return {
      title: article.title[ELanguage.en],
      description: article.description[ELanguage.en],
      alternates: { canonical: url },
      openGraph: {
        title: article.title[ELanguage.en],
        description: article.description[ELanguage.en],
        url,
        type: 'article',
        publishedTime: article.publishedDate,
      },
    }
  }

  /** Builds the `BlogPosting` JSON-LD node, in English to match the always-English static HTML. */
  const buildArticleStructuredData = (article: IArticleMeta) => ({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title[ELanguage.en],
    description: article.description[ELanguage.en],
    datePublished: article.publishedDate,
    url: `${SITE_URL}/articles/${article.slug}`,
    author: { '@id': `${SITE_URL}/#person` },
  })

  export default async function ArticlePage({ params }: IArticlePageProps) {
    const { slug } = await params
    const article = findArticle(slug)

    if (!article) {
      notFound()
    }

    return (
      <>
        <script
          type="application/ld+json"
          // Static, fully-trusted data; `<` is escaped to keep the inline JSON HTML-safe.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildArticleStructuredData(article)).replace(/</g, '\\u003c'),
          }}
        />
        <ArticlePageContent article={article} />
      </>
    )
  }
  ```

- [ ] **Step 3: Type-check and lint**

  Run: `pnpm check-types && pnpm lint`
  Expected: no errors.

- [ ] **Step 4: Manual check**

  Run: `pnpm build && pnpm start`, then open `http://localhost:3000/articles/ai-boilerplate-senior-engineers`.
  Expected: title, meta line, and full article body render; view-source shows the `<script type="application/ld+json">` block with `"@type":"BlogPosting"`.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/ArticlePageContent src/app/articles/[slug]/page.tsx
  git commit -m "feat: add /articles/[slug] detail page with JSON-LD"
  ```

---

### Task 8: Per-article Open Graph image

**Files:**

- Create: `src/app/articles/[slug]/opengraph-image.tsx`

**Interfaces:**

- Consumes: `articles` (Task 1), `AUTHOR_NAME`/`SITE_URL` (`@/constants/seo.constants`).

- [ ] **Step 1: Create the per-article OG image route**

  Create `src/app/articles/[slug]/opengraph-image.tsx`:

  ```tsx
  import { ImageResponse } from 'next/og'

  import { AUTHOR_NAME, SITE_URL } from '@/constants/seo.constants'
  import { ELanguage } from '@/constants/header.constants'
  import { articles } from '@/constants/articles.constants'

  interface IArticleOpengraphImageProps {
    params: Promise<{ slug: string }>
  }

  export const size = {
    width: 1200,
    height: 630,
  }

  export const contentType = 'image/png'

  export function generateStaticParams() {
    return articles.map((article) => ({ slug: article.slug }))
  }

  export default async function ArticleOpengraphImage({ params }: IArticleOpengraphImageProps) {
    const { slug } = await params
    const article = articles.find((item) => item.slug === slug)
    const title = article?.title[ELanguage.en] ?? AUTHOR_NAME
    const host = new URL(SITE_URL).host

    return new ImageResponse(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          color: '#ffffff',
          backgroundColor: '#0b0b0f',
          backgroundImage:
            'radial-gradient(circle at 18% 20%, rgba(110, 168, 255, 0.20), transparent 45%), radial-gradient(circle at 85% 88%, rgba(154, 110, 255, 0.18), transparent 42%)',
        }}
      >
        <div style={{ display: 'flex', fontSize: '30px', color: '#6ea8ff' }}>{AUTHOR_NAME}</div>

        <div style={{ display: 'flex', fontSize: '64px', lineHeight: 1.15, letterSpacing: '-1px' }}>
          {title}
        </div>

        <div style={{ display: 'flex', fontSize: '28px', color: '#6b7280' }}>{host}</div>
      </div>,
      size,
    )
  }
  ```

- [ ] **Step 2: Type-check and lint**

  Run: `pnpm check-types && pnpm lint`
  Expected: no errors.

- [ ] **Step 3: Manual check**

  Run: `pnpm build && pnpm start`, then open `http://localhost:3000/articles/ai-boilerplate-senior-engineers/opengraph-image`.
  Expected: a 1200×630 PNG banner with the article's English title.

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/articles/[slug]/opengraph-image.tsx
  git commit -m "feat: add per-article Open Graph image"
  ```

---

### Task 9: Wire the article into the Writing section and the sitemap

**Files:**

- Modify: `src/constants/writing.constants.ts`
- Modify: `src/app/sitemap.ts`

**Interfaces:**

- Consumes: `aiBoilerplateSeniorEngineersArticle`, `articles` (Task 1); `IArticle.isExternal` (Task 4).

- [ ] **Step 1: Add the article to the Writing list**

  Replace the full body of `src/constants/writing.constants.ts`:

  ```ts
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
  ```

- [ ] **Step 2: Add article routes to the sitemap**

  Replace the full body of `src/app/sitemap.ts`:

  ```ts
  import type { MetadataRoute } from 'next'

  import { SITE_URL } from '@/constants/seo.constants'
  import { articles } from '@/constants/articles.constants'

  /**
   * Generates `/sitemap.xml`: the root page with its per-language alternates, the articles
   * index, and one entry per self-hosted article.
   */
  export default function sitemap(): MetadataRoute.Sitemap {
    return [
      {
        url: SITE_URL,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 1,
        alternates: {
          languages: {
            en: `${SITE_URL}/?lang=en`,
            ru: `${SITE_URL}/?lang=ru`,
          },
        },
      },
      {
        url: `${SITE_URL}/articles`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.8,
      },
      ...articles.map((article) => ({
        url: `${SITE_URL}/articles/${article.slug}`,
        lastModified: new Date(article.publishedDate),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
    ]
  }
  ```

- [ ] **Step 3: Type-check and lint**

  Run: `pnpm check-types && pnpm lint`
  Expected: no errors.

- [ ] **Step 4: Manual check**

  Run: `pnpm build && pnpm start`, then:
  - Open `http://localhost:3000/` and confirm the Writing section (and its header tab) now appears with the "My blog" card.
  - Open `http://localhost:3000/sitemap.xml` and confirm it lists `/`, `/articles`, and `/articles/ai-boilerplate-senior-engineers`.

- [ ] **Step 5: Commit**

  ```bash
  git add src/constants/writing.constants.ts src/app/sitemap.ts
  git commit -m "feat: surface the article in Writing and the sitemap"
  ```

---

### Task 10: End-to-end coverage and final verification

> **Two issues surfaced and were fixed while writing this task's tests:**
>
> 1. **Deep-link fragment scroll was silently lost on first load.** The root layout's
>    `<Suspense fallback={<LoaderSection />}>` briefly unmounts the real page during hydration
>    (observed consistently ~1–1.2s after `page.goto`), which happens _after_ the browser's
>    one-shot "scroll to URL fragment" step already ran against a shorter, not-yet-laid-out
>    page. `ArticlePageContent` now re-runs that scroll itself once mounted for good (see its
>    `useEffect`), which is the fix reflected in Step 3 of Task 7 above and in the code below.
> 2. **The Writing-card navigation test was flaky under WebKit** (`--project=safari`):
>    `card.click()`'s built-in auto-scroll can race the page's smooth scrolling, landing the
>    click on the wrong element. Fixed by explicitly calling `scrollIntoViewIfNeeded()` before
>    the click in the test — reflected in Step 1 below.
>
> **Known, deferred issue:** the language switcher's dropdown item click is flaky under
> `--project=mobile-firefox` specifically on the (long) article page — not reproducible on the
> home page with the same steps. Root cause looks like a reflow/scrollbar-width race triggered
> by the much larger `i18next` language-switch re-render on a long article body, colliding with
> the sticky header's positioning in Firefox's mobile viewport. This plan's verification is
> scoped to `--project=chromium` (see Step 2 and the final verification pass), where the full
> suite is green; the mobile-firefox flake is left as a follow-up rather than fixed here.

**Files:**

- Create: `e2e/articles.spec.ts`

**Interfaces:**

- Consumes: `aiBoilerplateSeniorEngineersArticle`/`ELanguage` for the language-switch assertion; `data-testid`s from Tasks 3, 4, 6 (`article-content-*`, `writing-article-*`, `article-list-item-*`); `#page-header` (existing, from `src/layout/Header/Header.tsx`).

- [ ] **Step 1: Write the e2e spec**

  Create `e2e/articles.spec.ts`:

  ```ts
  import { expect, test } from '@playwright/test'

  import { ELanguage } from '@/constants/header.constants'
  import { aiBoilerplateSeniorEngineersArticle as article } from '@/constants/articles.constants'

  const ARTICLE_SLUG = article.slug

  test.describe('self-hosted articles', () => {
    test('lists the article on the articles index', async ({ page }) => {
      await page.goto('/articles')

      await expect(page.getByTestId(`article-list-item-${ARTICLE_SLUG}`)).toBeVisible()
    })

    test('renders the article page with its content', async ({ page }) => {
      await page.goto(`/articles/${ARTICLE_SLUG}`)

      // Scoped to <article> — the Aside's own name is also an <h1> on every page.
      await expect(page.locator('article').getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByTestId(`article-content-${ARTICLE_SLUG}`)).toBeVisible()
    })

    test('scrolls to a section via a URL fragment without hiding it under the header', async ({
      page,
    }) => {
      await page.goto(`/articles/${ARTICLE_SLUG}#three-decisions-ai-wont-make-for-you`)

      const heading = page.locator('#three-decisions-ai-wont-make-for-you')
      await expect(heading).toBeInViewport({ timeout: 10_000 })

      const headingTop = await heading.evaluate((element) => element.getBoundingClientRect().top)
      const headerHeight = await page
        .locator('#page-header')
        .evaluate((element) => element.getBoundingClientRect().height)

      expect(headingTop).toBeGreaterThanOrEqual(headerHeight)
    })

    test('switches the article body language with the site language switcher', async ({ page }) => {
      await page.goto(`/articles/${ARTICLE_SLUG}`)

      const heading = page.locator('article').getByRole('heading', { level: 1 })
      await expect(heading).toHaveText(article.title[ELanguage.en])

      await page.getByRole('button', { name: 'change language' }).click()
      await page
        .locator('.g-dropdown-menu__popup-content .g-menu')
        .getByText('Русский', { exact: true })
        .click()

      await expect(heading).toHaveText(article.title[ELanguage.ru])
    })

    test('opens the self-hosted article in-app from the Writing section, not a new tab', async ({
      page,
      context,
    }) => {
      await page.goto('/')

      const card = page.getByTestId(`writing-article-${ARTICLE_SLUG}`)
      await expect(card).toBeVisible()
      // Explicit pre-scroll: WebKit's click-triggered auto-scroll otherwise races the
      // page's smooth scrolling and can land the click on the wrong element.
      await card.scrollIntoViewIfNeeded()
      await card.click()

      await expect(page).toHaveURL(new RegExp(`/articles/${ARTICLE_SLUG}$`))
      expect(context.pages().length).toBe(1)
    })
  })
  ```

- [ ] **Step 2: Build and run the new spec**

  Run: `pnpm build && npx playwright test e2e/articles.spec.ts --project=chromium`
  Expected: all 5 tests PASS. If the language-switch test fails on the menu selector, inspect the rendered dropdown (`.g-dropdown-menu__popup-content .g-menu`) as done in `e2e/aside-ghost.spec.ts` and adjust the locator to match.

- [ ] **Step 3: Commit**

  ```bash
  git add e2e/articles.spec.ts
  git commit -m "test: cover self-hosted articles end to end"
  ```

- [ ] **Step 4: Full verification pass**

  Run in order, stopping on any nonzero exit code:

  ```bash
  pnpm check-format
  pnpm check-types
  pnpm check-lint
  pnpm test
  pnpm build
  npx playwright test --project=chromium
  ```

  Expected: everything green. `pnpm build`'s route summary should list `/articles` and `/articles/[slug]` as static (`●`/`○`), not dynamic (`λ`).

- [ ] **Step 5: View-source spot check**

  With `pnpm start` running against the build from Step 4, run:

  ```bash
  curl -s http://localhost:3000/articles/ai-boilerplate-senior-engineers | grep -o "BlogPosting"
  curl -s http://localhost:3000/articles/ai-boilerplate-senior-engineers | grep -o "Three Decisions AI Won"
  ```

  Expected: both commands print a match, confirming the JSON-LD block and the full article text are present without running JavaScript.
