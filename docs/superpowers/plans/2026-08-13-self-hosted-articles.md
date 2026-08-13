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

### Task 2: Article body content (English + Russian) with deep-link heading ids

**Files:**

- Create: `src/content/articles/ai-boilerplate-senior-engineers/en.tsx`
- Create: `src/content/articles/ai-boilerplate-senior-engineers/ru.tsx`
- Create: `src/content/articles/ai-boilerplate-senior-engineers/content.test.ts`

**Interfaces:**

- Produces: `export default function AiBoilerplateSeniorEngineersEn(): JSX.Element` and `export default function AiBoilerplateSeniorEngineersRu(): JSX.Element`, each a zero-prop component rendering `<h2 id="...">`/`<p>`/`<strong>`/`<em>` content. Heading ids, identical across both files: `what-ai-actually-closes-well`, `three-decisions-ai-wont-make-for-you`, `the-real-skill-gap-is-direction-not-typing`.

- [ ] **Step 1: Write the failing heading-id parity test**

  Create `src/content/articles/ai-boilerplate-senior-engineers/content.test.ts`:

  ```ts
  import { describe, expect, it } from 'vitest'
  import { renderToStaticMarkup } from 'react-dom/server'

  import AiBoilerplateSeniorEngineersEn from './en'
  import AiBoilerplateSeniorEngineersRu from './ru'

  /** Extracts every `<h2>`/`<h3>` `id` attribute from a rendered article body, in document order. */
  const extractHeadingIds = (Content: () => JSX.Element): string[] => {
    const html = renderToStaticMarkup(Content())
    return [...html.matchAll(/<h[23] id="([^"]+)"/g)].map((match) => match[1])
  }

  describe('ai-boilerplate-senior-engineers content', () => {
    it('defines at least one deep-linkable heading', () => {
      expect(extractHeadingIds(AiBoilerplateSeniorEngineersEn).length).toBeGreaterThan(0)
    })

    it('uses the exact same heading ids in both languages, in the same order', () => {
      expect(extractHeadingIds(AiBoilerplateSeniorEngineersRu)).toEqual(
        extractHeadingIds(AiBoilerplateSeniorEngineersEn),
      )
    })
  })
  ```

- [ ] **Step 2: Run the test to verify it fails**

  Run: `pnpm vitest run src/content/articles/ai-boilerplate-senior-engineers/content.test.ts`
  Expected: FAIL — `Cannot find module './en'`.

- [ ] **Step 3: Write the English content**

  Create `src/content/articles/ai-boilerplate-senior-engineers/en.tsx`:

  ```tsx
  export const AiBoilerplateSeniorEngineersEn = () => (
    <>
      <p>
        Ninety percent of developers now use an AI coding assistant regularly. Copilot, Cursor,
        Claude Code — pick one, and it will write you a working component in seconds. A form with
        validation. A CRUD screen. A data table with sorting. Code that compiles, passes the linter,
        and looks like something a human wrote.
      </p>

      <p>None of that means it&apos;s ready to ship.</p>

      <p>
        There&apos;s a gap between &ldquo;the code runs&rdquo; and &ldquo;the product survives
        production,&rdquo; and in 2026 that gap is exactly where the job of a senior engineer lives.
        AI closed the distance on typing code. It didn&apos;t close the distance on owning it.
      </p>

      <h2 id="what-ai-actually-closes-well">What AI Actually Closes Well</h2>

      <p>
        Worth saying plainly: AI is genuinely good at boilerplate, and pretending otherwise wastes
        everyone&apos;s time. Scaffolding a new route, wiring a form to a schema, generating a test
        skeleton, translating a Figma layout into markup — these are pattern-matching tasks, and
        pattern-matching is what large models do best. If a task has been solved the same way a
        thousand times on GitHub, an AI assistant will solve it for you in seconds, and it should.
      </p>

      <p>
        The failure mode isn&apos;t using AI for this. It&apos;s treating everything else as if it
        worked the same way.
      </p>

      <h2 id="three-decisions-ai-wont-make-for-you">Three Decisions AI Won&apos;t Make for You</h2>

      <p>
        <strong>1. Rendering strategy, not just rendering code.</strong> On a real-time product I
        worked on — video and audio streaming in the browser — the question was never &ldquo;can you
        render this component.&rdquo; It was <em>when</em>: does this piece hydrate before the media
        connection opens, or after? Get it backwards and you either block the user on JavaScript
        that doesn&apos;t matter yet, or you let them click &ldquo;join&rdquo; before the stream is
        actually ready to receive input. An AI assistant will happily generate a component that
        renders correctly in isolation. It has no opinion on where that component sits in your
        connection lifecycle, because that opinion depends on your architecture, not your syntax.
      </p>

      <p>
        <strong>2. Where the weight goes.</strong> Bundle-splitting and offloading work to a Web
        Worker both &ldquo;work&rdquo; almost anywhere you put them — that&apos;s what makes them
        dangerous to delegate. AI will suggest a lazy-loaded chunk boundary that&apos;s
        syntactically fine and practically wrong: splitting at a point that still blocks first
        paint, or moving computation to a worker that then has to serialize a payload so large the
        postMessage cost erases the benefit. Judging that trade-off means knowing your actual
        traffic shape, your device targets, your performance budget — context that lives in your
        team&apos;s dashboards, not in the prompt.
      </p>

      <p>
        <strong>3. What deserves a test, and what a passing test actually proves.</strong> Ask an AI
        assistant to write tests for a component and it will write tests — for the happy path,
        matching whatever the component currently does. That&apos;s the trap: it tests the
        implementation, not the requirement. On the same real-time product, the tests that mattered
        weren&apos;t &ldquo;does the button render&rdquo; — they were &ldquo;does the UI recover
        correctly when the connection drops mid-call&rdquo; and &ldquo;does the reconnect logic race
        against a user who already closed the tab.&rdquo; Nobody generates that test by
        pattern-matching the codebase, because the failure case isn&apos;t in the codebase yet.
        Deciding what should break the build is a judgment call about risk, and judgment calls are
        the one thing you can&apos;t outsource to autocomplete.
      </p>

      <h2 id="the-real-skill-gap-is-direction-not-typing">
        The Real Skill Gap Is Direction, Not Typing
      </h2>

      <p>
        Put these three together and a pattern shows up: none of them are about writing code faster.
        They&apos;re about deciding what the code is for before a single line exists. AI collapses
        the distance between &ldquo;I know what I want&rdquo; and &ldquo;it&apos;s written.&rdquo;
        It does nothing to help you figure out what you want in the first place — and in a system
        with real-time constraints, real users, and real failure modes, that&apos;s most of the job.
      </p>

      <p>
        This is also the cleanest way to tell candidates apart in an interview. Anyone can now
        produce a working component on request — that stopped being a signal the moment AI
        assistants got good. What still separates a senior hire from a junior one is whether they
        can look at generated code and say why it&apos;s wrong for this system, or whether they ship
        whatever came back from the prompt because it passed CI. One of those people is directing a
        tool. The other is hoping it&apos;s right.
      </p>

      <p>
        If you&apos;re hiring for &ldquo;AI-native&rdquo; engineers, that&apos;s the question worth
        asking in the interview — not &ldquo;do you use Copilot,&rdquo; but &ldquo;show me a time an
        AI suggestion was reasonable and still wrong.&rdquo; The answer tells you whether
        you&apos;re looking at ownership or autocomplete with a job title.
      </p>

      <p>
        AI didn&apos;t make senior engineers less necessary. It just made the necessary part more
        visible.
      </p>
    </>
  )

  export default AiBoilerplateSeniorEngineersEn
  ```

- [ ] **Step 4: Write the Russian content**

  Create `src/content/articles/ai-boilerplate-senior-engineers/ru.tsx`:

  ```tsx
  export const AiBoilerplateSeniorEngineersRu = () => (
    <>
      <p>
        Девяносто процентов разработчиков сегодня регулярно пользуются ИИ-ассистентами для написания
        кода. Copilot, Cursor, Claude Code — не важно, что выбрать: за несколько секунд любой из них
        сгенерирует рабочий компонент. Форму с валидацией. CRUD-экран. Таблицу данных с сортировкой.
        Код, который компилируется, проходит линтер и выглядит так, будто его написал человек.
      </p>

      <p>Ничего из этого не означает, что он готов к продакшену.</p>

      <p>
        Между «код запускается» и «продукт выживает в проде» есть разрыв, и в 2026 году именно в
        этом разрыве живёт работа senior-инженера. ИИ сократил путь от идеи до напечатанного кода.
        Путь до владения этим кодом он не сократил ни на шаг.
      </p>

      <h2 id="what-ai-actually-closes-well">Что ИИ закрывает по-настоящему хорошо</h2>

      <p>
        Стоит сказать прямо: ИИ действительно хорошо справляется с boilerplate, и делать вид, что
        это не так, — значит тратить время всех участников впустую. Разметка нового роута, привязка
        формы к схеме валидации, генерация каркаса теста, перевод макета из Figma в разметку — это
        задачи на распознавание паттернов, а распознавание паттернов — именно то, в чём большие
        модели сильны больше всего. Если задача решалась одним и тем же способом тысячу раз на
        GitHub, ИИ-ассистент решит её за вас за секунды — и это правильно.
      </p>

      <p>
        Проблема не в том, чтобы использовать ИИ для этого. Проблема в том, чтобы относиться ко
        всему остальному так, будто оно работает так же.
      </p>

      <h2 id="three-decisions-ai-wont-make-for-you">Три решения, которые ИИ не примет за вас</h2>

      <p>
        <strong>1. Стратегия рендеринга, а не просто код рендеринга.</strong> В real-time продукте,
        над которым я работал — видео- и аудиостриминг в браузере — вопрос никогда не звучал как
        «можешь ли ты отрендерить этот компонент». Вопрос был «когда»: гидрируется ли этот кусок
        интерфейса до того, как откроется медиа-соединение, или после? Перепутаете порядок — и либо
        заблокируете пользователя на JavaScript, который пока не важен, либо позволите ему нажать
        «войти» до того, как поток реально готов принимать данные. ИИ-ассистент с радостью
        сгенерирует компонент, который корректно рендерится в изоляции. У него нет мнения о том, где
        этому компоненту место в жизненном цикле соединения, — потому что это мнение зависит от
        вашей архитектуры, а не от синтаксиса.
      </p>

      <p>
        <strong>2. Куда девать вес.</strong> Bundle-splitting и вынос вычислений в Web Worker
        одинаково «работают» почти в любом месте, куда их ни поставь, — именно это делает их
        опасными для делегирования. ИИ предложит границу ленивой подгрузки чанка, которая
        синтаксически безупречна и практически неверна: разбиение в точке, которая всё ещё блокирует
        первую отрисовку, или перенос вычислений в воркер, которому затем приходится сериализовать
        настолько большой payload, что стоимость postMessage перекрывает всю выгоду. Оценить этот
        компромисс можно, только зная реальную форму трафика, целевые устройства, бюджет
        производительности — контекст, который живёт в дашбордах вашей команды, а не в промпте.
      </p>

      <p>
        <strong>3. Что заслуживает теста и что на самом деле доказывает прошедший тест.</strong>{' '}
        Попросите ИИ-ассистента написать тесты для компонента — и он напишет тесты, покрывающие
        happy path, то есть то, что компонент делает прямо сейчас. В этом и ловушка: тест проверяет
        реализацию, а не требование. В том же real-time продукте важны были не тесты вида
        «рендерится ли кнопка», а «корректно ли восстанавливается интерфейс, если соединение
        обрывается посреди звонка» и «не возникает ли гонка между логикой переподключения и
        пользователем, который уже закрыл вкладку». Такой тест никто не сгенерирует сопоставлением
        паттернов по кодовой базе, потому что сценарий отказа в этой кодовой базе ещё не существует.
        Решить, что должно ломать сборку, — это суждение о риске, а суждения о риске — единственное,
        что нельзя делегировать автодополнению.
      </p>

      <h2 id="the-real-skill-gap-is-direction-not-typing">
        Настоящий дефицит навыка — это направление, а не скорость печати
      </h2>

      <p>
        Сложите эти три пункта вместе — и проступает закономерность: ни один из них не о том, чтобы
        писать код быстрее. Все они о том, чтобы решить, для чего этот код нужен, до того как
        написана хоть одна строка. ИИ схлопывает дистанцию между «я знаю, чего хочу» и «это
        написано». Он никак не помогает понять, чего вы хотите на самом деле, — а в системе с
        real-time ограничениями, реальными пользователями и реальными сценариями отказа это и есть
        большая часть работы.
      </p>

      <p>
        Это же самый чистый способ отличить кандидатов на собеседовании. Сегодня рабочий компонент
        по запросу может выдать кто угодно — это перестало быть сигналом в тот момент, когда
        ИИ-ассистенты стали достаточно хороши. Senior-найм от junior-найма по-прежнему отличает то,
        может ли человек посмотреть на сгенерированный код и объяснить, почему он не подходит именно
        этой системе, — или он просто отправляет в прод то, что вернул промпт, потому что это прошло
        CI. Один из них управляет инструментом. Другой на него надеется.
      </p>

      <p>
        Если вы нанимаете «ИИ-нативных» инженеров, именно это стоит спрашивать на собеседовании — не
        «пользуетесь ли вы Copilot», а «покажите случай, когда предложение ИИ выглядело разумным и
        всё равно было неверным». Ответ покажет, видите вы перед собой владение продуктом или
        автодополнение с должностью в резюме.
      </p>

      <p>
        ИИ не сделал senior-инженеров менее нужными. Он просто сделал ту часть работы, ради которой
        они нужны, более заметной.
      </p>
    </>
  )

  export default AiBoilerplateSeniorEngineersRu
  ```

- [ ] **Step 5: Run the test to verify it passes**

  Run: `pnpm vitest run src/content/articles/ai-boilerplate-senior-engineers/content.test.ts`
  Expected: PASS (2 tests).

- [ ] **Step 6: Type-check and lint**

  Run: `pnpm check-types && pnpm lint`
  Expected: no errors. If ESLint flags unescaped entities, confirm every `'`/`"` inside JSX text is one of `&apos;`/`&ldquo;`/`&rdquo;` as written above.

- [ ] **Step 7: Commit**

  ```bash
  git add src/content/articles/ai-boilerplate-senior-engineers
  git commit -m "feat: add ai-boilerplate-senior-engineers article content (en/ru)"
  ```

---

### Task 3: Content registry and the `ArticleContent` reader component

**Files:**

- Create: `src/content/articles/registry.ts`
- Create: `src/components/ArticleContent/ArticleContent.tsx`
- Create: `src/components/ArticleContent/ArticleContent.module.css`

**Interfaces:**

- Consumes: `AiBoilerplateSeniorEngineersEn`/`Ru` (Task 2), `ELanguage` (`@/constants/header.constants`).
- Produces: `export const articleContentRegistry: Record<string, Record<ELanguage, ComponentType>>`; `export const ArticleContent = ({ slug }: { slug: string }) => JSX.Element | null`, rendered as `<div data-testid={\`article-content-${slug}\`}>`.

- [ ] **Step 1: Create the content registry**

  Create `src/content/articles/registry.ts`:

  ```ts
  import { ComponentType } from 'react'

  import { ELanguage } from '@/constants/header.constants'
  import { aiBoilerplateSeniorEngineersArticle } from '@/constants/articles.constants'

  import AiBoilerplateSeniorEngineersEn from './ai-boilerplate-senior-engineers/en'
  import AiBoilerplateSeniorEngineersRu from './ai-boilerplate-senior-engineers/ru'

  /** An article's body, as a per-language TSX component with no props. */
  type ArticleContentComponent = ComponentType

  /** Maps every article slug to its body component in each supported language. */
  export const articleContentRegistry: Record<
    string,
    Record<ELanguage, ArticleContentComponent>
  > = {
    [aiBoilerplateSeniorEngineersArticle.slug]: {
      [ELanguage.en]: AiBoilerplateSeniorEngineersEn,
      [ELanguage.ru]: AiBoilerplateSeniorEngineersRu,
    },
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

  import { useTranslation } from 'react-i18next'

  import { ELanguage } from '@/constants/header.constants'
  import { articleContentRegistry } from '@/content/articles/registry'

  interface IArticleContentProps {
    /** Slug of the article whose body should render, keyed into {@link articleContentRegistry}. */
    slug: string
  }

  export const ArticleContent = ({ slug }: IArticleContentProps) => {
    const { i18n } = useTranslation()

    const language: ELanguage = i18n.language === ELanguage.ru ? ELanguage.ru : ELanguage.en
    const Content = articleContentRegistry[slug]?.[language]

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

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
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

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(article.title[ELanguage.en])

      await page.getByRole('button', { name: 'change language' }).click()
      await page
        .locator('.g-dropdown-menu__popup-content .g-menu')
        .getByText('Русский', { exact: true })
        .click()

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(article.title[ELanguage.ru])
    })

    test('opens the self-hosted article in-app from the Writing section, not a new tab', async ({
      page,
      context,
    }) => {
      await page.goto('/')

      const card = page.getByTestId(`writing-article-${ARTICLE_SLUG}`)
      await expect(card).toBeVisible()
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
