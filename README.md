# Portfolio - [NKolosov097](https://nkolosov.com)

A production-grade personal portfolio built on the **Next.js App Router** with **React 19** and **TypeScript** (strict): a single-page home experience plus a small set of statically generated article pages. It ships a fully internationalised (English / Russian) UI, a database-backed contact form with transactional email, and an accessibility- and performance-conscious layout shell.

**[View the live portfolio →](https://nkolosov.com)**

---

## Table of contents

- [Highlights](#highlights)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [Testing](#testing)
- [Database](#database)
- [Internationalisation](#internationalisation)
- [State management](#state-management)
- [Contact form flow](#contact-form-flow)
- [Deployment](#deployment)
- [AI-assisted development](#ai-assisted-development)
- [Code quality & conventions](#code-quality--conventions)

---

## Highlights

- **Section-based home SPA + self-hosted articles.** The home page (`/`) composes independent sections - `Home` (a hero backed by a decorative, pointer-reactive sparkle field on Canvas 2D, rendered in an OffscreenCanvas worker where supported and on the main thread otherwise, with a runtime governor scaling particle count and pixel ratio to the device), `Portfolio`, `About Me` (with the embedded contact form), `Resume` (with a downloadable CV), and `Writing` (articles & talks, revealed once populated) - behind a persistent layout shell rendered inside a `<Suspense>` boundary. Writing cards for self-hosted posts open a dedicated, statically generated `/articles/[slug]` page rather than staying in-page.
- **First-class i18n.** All user-facing copy is translated (`en` / `ru`), resolved from a `lang` query string then a cookie, and served from `public/locales`.
- **Type-safe, server-first data flow.** Contact submissions run through a `'use server'` action with **Zod** validation, persist to **PostgreSQL** via **Prisma 7**, and trigger a transactional email via **Nodemailer**.
- **Accessibility & performance built in.** Skip-to-navigation link, zoomable viewport, `prefers-reduced-motion` support, and a `requestAnimationFrame`-throttled scroll-spy.
- **Consistent design language.** Themed entirely through **Gravity UI**, with the dark theme applied server-side to avoid a flash of unstyled content.
- **Operational readiness.** A `/api/health` endpoint reports status, uptime, environment, and version for liveness/readiness probes.
- **SEO out of the box.** Rich metadata (Open Graph, Twitter card, canonical + `hreflang` alternates), `Person` + `WebSite` JSON-LD structured data, a dynamically generated 1200×630 social banner (`next/og`), and generated `/robots.txt` and `/sitemap.xml` - all driven from a single `src/constants/seo.constants.ts` source of truth. Each article page gets its own metadata, `BlogPosting` JSON-LD, and OG image, generated per slug via `generateStaticParams`.

---

## Tech stack

| Layer           | Technology                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Framework       | [Next.js 16](https://nextjs.org) (App Router) + [React 19](https://react.dev)                            |
| Language        | [TypeScript 5](https://www.typescriptlang.org) (`strict`)                                                |
| UI library      | [Gravity UI](https://gravity-ui.com) (`uikit`, `components`, `navigation`)                               |
| Forms           | [react-hook-form](https://react-hook-form.com) + [Zod](https://zod.dev) resolver                         |
| State           | [Zustand](https://zustand.docs.pmnd.rs) (vanilla stores behind React context)                            |
| i18n            | [i18next](https://www.i18next.com) + [react-i18next](https://react.i18next.com)                          |
| Database / ORM  | [PostgreSQL](https://www.postgresql.org) + [Prisma 7](https://www.prisma.io) (`pg` adapter / Accelerate) |
| Email           | [Nodemailer](https://nodemailer.com) (Gmail SMTP)                                                        |
| Notifications   | [react-toastify](https://fkhadra.github.io/react-toastify/)                                              |
| Tooling         | ESLint 9, Prettier 3, Stylelint 17                                                                       |
| Testing         | Vitest 4 (unit), Playwright 1.62 (E2E)                                                                   |
| Package manager | [pnpm](https://pnpm.io) · Node.js 24                                                                     |

---

## Architecture

The app is a **single-page portfolio plus a small set of statically generated article pages**, all wrapped by one persistent shell defined in `src/app/layout.tsx`. The portfolio itself (`src/app/page.tsx`) renders a stack of self-contained sections; `src/app/articles/` adds a list page and a `[slug]` page per article, both rendered through the same root layout.

```
RootLayout (layout.tsx)
└─ <Suspense fallback={<LoaderSection />}>
   └─ Providers            ← i18n, theme, Zustand store providers
      ├─ SkipToNavigationLink
      ├─ Header            ← navigation tabs + language switch
      ├─ Aside             ← mobile drawer
      ├─ Main
      │  ├─ HomePage           ← "/" - Home · Portfolio · AboutMe · Resume · Writing
      │  ├─ ArticlesListContent ← "/articles"
      │  └─ ArticlePageContent  ← "/articles/[slug]"
      ├─ Footer
      └─ ToastContainer
```

Key architectural decisions:

- **Section ownership.** Each section under `src/home-sections/<Section>/` owns its own types, sub-components, schemas, and server actions - no cross-section coupling.
- **Article content as code.** Each article's body lives in `src/content/articles/<slug>/`, registered in `src/content/articles/registry.ts` by slug; article metadata (title, description, publish date, reading time) lives separately in `src/constants/articles.constants.ts` so route generation and SEO don't need to import the body component.
- **Server-side theming.** The Gravity UI dark theme is resolved with `getRootClassName` in the root layout, so the correct theme class is present on first paint (no client flash).
- **Server-only boundaries.** Database and mail singletons live in `src/lib/` and are guarded with `import 'server-only'`; server actions are marked `'use server'`.
- **Path aliases.** `@/*` → `src/*`, `@public/*` → `public/*`, and `@tests/*` → `tests/*` (configured in `tsconfig.json`, the ESLint resolver, and `vitest.config.mts`).

---

## Project structure

```
src/
├─ app/                 # App Router: layout, root page, /articles + /articles/[slug], /api/health,
│                        #   robots.ts, sitemap.ts, opengraph-image.tsx, error & not-found
├─ home-sections/       # Page sections (Home, Portfolio, AboutMe, Resume, Writing, Contact, LoaderSection)
│  └─ <Section>/
│     ├─ components/    #   section-local sub-components
│     ├─ actions/       #   'use server' server actions
│     ├─ schemas/       #   Zod schemas
│     ├─ helpers/       #   section-local pure helpers
│     ├─ workers/       #   section-local web workers
│     └─ types/         #   section-local types
├─ content/articles/    # Article body components, one directory per slug, plus registry.ts
├─ layout/              # Persistent shell: Header, Aside (drawer), Main, Footer
├─ components/          # Shared UI: Tag, SkipToNavigationLink, NotFoundView, and the articles list/page/nav components
├─ providers/           # React context providers, composed in Providers.tsx
│  └─ stores/           #   store providers that instantiate Zustand stores once
├─ stores/              # Zustand vanilla stores (AsideStore, HeaderStore)
├─ constants/           # App-wide constants & enums
├─ helpers/             # Pure utilities (scroll, clipboard, storage, language, idle callback)
├─ hooks/               # Shared React hooks (e.g. useResolvedLanguage)
├─ configs/i18n/        # i18next initialisation & context types
├─ contexts/            # React contexts
├─ assets/              # Static SVGs (logos, social icons) imported directly into components
├─ styles/              # Global CSS: globals.css, reset.css
├─ types/               # Cross-cutting shared types (e.g. IResponse)
├─ lib/                 # Server-only singletons: prisma.ts, mail.tsx
└─ generated/prisma/    # Prisma client output - do not edit manually

prisma/                 # schema.prisma, migrations, seed.ts, init.sql
public/locales/         # Translation catalogues: en.json, ru.json
docker/                 # Hardened daemon.json + nginx config for self-hosted setups
e2e/                    # Playwright specs, shared locators and the server lifecycle hooks
tests/fixtures/         # Shared test fixtures derived from app constants and locales
```

Unit tests live next to the code they cover as `*.test.ts`; Playwright owns `e2e/**` so the
two runners never pick up each other's files. A test that needs a DOM is named `*.dom.test.ts`
and is routed to the jsdom environment by `vitest.config.mts`.

---

## Getting started

### Prerequisites

- **Node.js 24** (see `engines` in `package.json`)
- **pnpm**
- A reachable **PostgreSQL** instance (local, [Neon](https://neon.tech), or Prisma Accelerate)

### Installation

```bash
# 1. Install dependencies (runs `prisma generate` via postinstall)
pnpm install

# 2. Configure environment
cp .env.example .env.local
#   then fill in the values described below

# 3. Apply the database schema
pnpm prisma migrate dev

# 4. (optional) Seed the database
pnpm prisma db seed

# 5. Start the dev server (Turbopack)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment variables

Copy `.env.example` to `.env.local` and provide:

| Variable                    | Required | Purpose                                                                                   |
| --------------------------- | :------: | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`              |    ✅    | PostgreSQL connection string. A `prisma://` URL switches the client to Prisma Accelerate. |
| `NEXT_PUBLIC_LOCALHOST_API` |    ✅    | Public base URL of the deployed app, used for internal API calls.                         |
| `SMTP_SERVER_HOST`          |    ✅    | Gmail SMTP host (`smtp.gmail.com`).                                                       |
| `SMTP_SERVER_USERNAME`      |    ✅    | Gmail address used to send mail.                                                          |
| `SMTP_SERVER_PASSWORD`      |    ✅    | Gmail **App Password** (not the account password).                                        |
| `SITE_MAIL_RECIEVER`        |    ✅    | Address that receives contact-form submissions.                                           |

> `src/lib/prisma.ts` inspects `DATABASE_URL` at client-creation time: a `prisma://` prefix enables the Accelerate extension, otherwise it connects through the `pg` driver adapter.

---

## Available scripts

| Script                    | Description                                                                |
| ------------------------- | -------------------------------------------------------------------------- |
| `pnpm dev`                | Start the dev server with Turbopack.                                       |
| `pnpm build`              | Production build.                                                          |
| `pnpm start`              | Serve the production build.                                                |
| `pnpm vercel-build`       | `prisma generate && prisma migrate deploy && next build` (CI).             |
| `pnpm postinstall`        | `prisma generate` - runs automatically after `pnpm install`.               |
| `pnpm check-types`        | TypeScript check (`tsc --pretty --noEmit`).                                |
| `pnpm check-lint`         | ESLint check only, no auto-fix - a standalone alternative to `lint:js`.    |
| `pnpm check-format`       | Prettier check only, no write, over the whole repo.                        |
| `pnpm check-styles`       | Stylelint CSS check only, no auto-fix - used in CI.                        |
| `pnpm lint`               | `lint:js && lint:styles && lint:prettier` - ESLint + Stylelint + Prettier. |
| `pnpm lint:js`            | ESLint check, no auto-fix (part of `pnpm lint`).                           |
| `pnpm lint:styles`        | Stylelint CSS with auto-fix.                                               |
| `pnpm lint:prettier`      | Prettier check for Markdown files only.                                    |
| `pnpm format`             | Auto-fix formatting with Prettier.                                         |
| `pnpm test`               | Run the Vitest unit suite once.                                            |
| `pnpm test:watch`         | Run Vitest in watch mode.                                                  |
| `pnpm test:e2e`           | Production build, then the Playwright E2E suite.                           |
| `pnpm prisma generate`    | Regenerate the Prisma client into `src/generated/prisma`.                  |
| `pnpm prisma migrate dev` | Apply migrations locally.                                                  |
| `pnpm prisma db seed`     | Seed the database via `prisma/seed.ts`.                                    |

Before considering any change complete, the validation gate must pass:

```bash
pnpm check-types && pnpm lint
```

---

## Testing

Two runners with deliberately disjoint scopes:

| Runner          | Config                 | Covers                                                                  |
| --------------- | ---------------------- | ----------------------------------------------------------------------- |
| Vitest 4        | `vitest.config.mts`    | `src/**/*.test.ts` - pure logic, schemas, server actions, locale parity |
| Playwright 1.62 | `playwright.config.ts` | `e2e/**/*.spec.ts` - the rendered page, six desktop and mobile projects |

What is covered today:

- **`getAge`** - birthday boundaries, 29 February in a non-leap year, future and invalid dates.
- **`getStoredLanguage` / `storeLanguage`** - cookie precedence over `navigator.language`, locale
  normalisation, percent-encoded values, fallback to English. Named `language.dom.test.ts`, which
  routes it to the jsdom environment.
- **Contact Zod schema** - trimming before length checks, localised messages, multi-field errors.
- **`sendMessage` server action** - persistence, mail dispatch, validation failures echoing the
  submitted fields, database failure, and the deliberate choice to still report success when only
  the mail step fails. Prisma and the mailer are mocked, so no database or SMTP is needed.
- **Locale catalogues** - `en.json` / `ru.json` key parity in both directions, no blank or
  non-string leaves.
- **Articles registry** - every article has a unique kebab-case slug and a translated title and
  description in both languages.
- **`requestIdle` / `cancelIdle`** - falls back to a timer where `requestIdleCallback` is
  unavailable, and a cancelled callback never fires. Named `idleCallback.dom.test.ts`, routed to
  the jsdom environment.
- **E2E smoke** (`e2e/smoke.spec.ts`) - every section anchor the header navigates to exists, the
  aside renders, the page loads without uncaught errors, and clicking a tab scrolls to its section.
- **Aside ghost** (`e2e/aside-ghost.spec.ts`) - all five animation layers run, the silhouette
  actually moves between frames, and every animation stops under `prefers-reduced-motion: reduce`.
- **Profile drawer** (`e2e/mobile-drawer.spec.ts`) - below the breakpoint the sidebar is hidden
  and its content is reachable only through the drawer, which opens and closes on demand. The
  spec skips itself on viewports that render the sidebar.
- **Home sparkle field** (`e2e/home-sparkle-field.spec.ts`) - the canvas fades in behind the hero
  without covering the headline, and holds a still frame under `prefers-reduced-motion: reduce`.
- **Self-hosted articles** (`e2e/articles.spec.ts`) - the article is listed on `/articles`, its
  page renders with a heading and content, an in-page anchor scrolls a section clear of the fixed
  header, the body switches language with the site's language switcher, and opening a Writing card
  navigates to the article in the same tab rather than a new one.
- **Locale hydration** (`e2e/locale-hydration.spec.ts`) - with a Russian language cookie set,
  both `/` and an article page render in that language with no console or page error, guarding
  against the server/client language mismatch fixed on this branch.
- **DOOM easter egg** (`e2e/doom-easter-egg.spec.ts`) - the machine in the Resume section boots
  the WASM build on click, shows the game canvas, and returns to its idle state when stopped,
  with no page errors along the way.

Tests reuse the app's own sources of truth rather than restating them: section anchors come from
`ETabID`, tab labels and contact error messages from `public/locales/en.json`, and profile links
from `src/constants/constants.ts`. The server-action test mocks `server-only`, which throws when
imported outside a React Server Component. Browsers are not installed by `pnpm install` - run
`npx playwright install chromium firefox webkit` once.

`pnpm test:e2e` needs no separately running app: the script produces a production build, and
`e2e/global-setup.ts` starts `next start` while `e2e/global-teardown.ts` stops it again. Running
against a **production build rather than `next dev` is deliberate** - under parallel load the dev
server compiles chunks on demand, which re-suspends the page mid-interaction: the content is
swapped for the loader, the document collapses and the scroll position resets. That produced
failures which reproduced only in parallel and never serially.

Playwright's own `webServer` is deliberately not used. It cannot stop `next start` on Windows:
that process re-spawns itself, so the pid Playwright tracks is gone by teardown and the surviving
server keeps the run hanging after the last test. The teardown therefore terminates whatever holds
the port rather than a pid tree. Because the suite owns the server, `global-setup` refuses to run
when port 3000 is already busy instead of silently testing someone else's build.

The Vitest reporter is set to `verbose`, so a run names every individual assertion instead of
only the files - the suite doubles as a readable description of the guaranteed behaviour.

Every spec runs across six projects: Chromium, Firefox and WebKit on desktop, plus Pixel 7,
iPhone 15 and a narrow-viewport Firefox. Two caveats worth knowing:

- Playwright's **WebKit is not Safari** - it omits Apple's proprietary layer, and real Safari can
  only be driven on macOS. Treat it as an engine-level check, not a Safari guarantee.
- Gecko has **no true mobile emulation**: it applies viewport and DPR but ignores `isMobile`,
  leaving `navigator.maxTouchPoints` at 0. `mobile-firefox` is therefore a narrow-viewport layout
  check, not a touch-behaviour one.

Mobile is a genuinely different layout, not just a narrower one: below the breakpoint the sidebar
is hidden and its content moves into a drawer. Specs call `revealAside()` from `e2e/helpers/`,
which detects the layout from the DOM and returns the container that actually holds the content,
so the breakpoint value is never restated in tests.

---

## Database

PostgreSQL, accessed through a Prisma singleton (`src/lib/prisma.ts`). The generated client is emitted to `src/generated/prisma` and must never be edited by hand.

```prisma
model User {
  id         Int       @id @default(autoincrement())
  name       String
  email      String    @unique
  company    String
  profession String
  messages   Message[]
}

model Message {
  id       Int    @id @default(autoincrement())
  content  String
  authorId Int
  author   User   @relation(fields: [authorId], references: [id])
}
```

A user is uniquely keyed by email; each contact submission **upserts** the user and appends a new related `Message`.

---

## Internationalisation

- Configured in `src/configs/i18n/i18n.ts` with `i18next` + `react-i18next`.
- Catalogues live in `public/locales/en.json` and `public/locales/ru.json`.
- Supported languages are declared in the `ELanguage` enum (`src/constants/header.constants.ts`).
- Language is detected from the `lang` query string first, then a cookie.
- Article metadata (title, description) is stored as an `ELanguage`-keyed record rather than i18next
  keys, since it's data (`src/constants/articles.constants.ts`), not UI copy. Components read the
  active language for these via the `useResolvedLanguage()` hook (`src/hooks/`).

> **Convention:** every new user-facing string must be added to **both** locale files simultaneously and consumed via `useTranslation()` - no hardcoded UI copy. Zod validation messages are passed into schemas at call time so errors are rendered in the visitor's active language.

---

## State management

Zustand is used as **vanilla stores wrapped in React context**, so a store is created exactly once per provider tree:

1. State + action interfaces are defined in `src/stores/<name>.ts` via `createStore`.
2. A provider in `src/providers/stores/<Name>Store.provider.tsx` instantiates the store with `useRef` on first render.
3. The provider exports a typed `use<Name>Store(selector)` hook - components consume **that hook**, never the raw context.

Current stores: `AsideStore` (mobile drawer) and `HeaderStore`.

---

## Contact form flow

1. The form (`react-hook-form` + `zodResolver`) is submitted through `useActionState`.
2. The `sendMessage` server action (`src/home-sections/Contact/actions/`) validates the payload with a localised Zod schema.
3. On success it **upserts** the user and their message in PostgreSQL, then sends a confirmation email via `src/lib/mail.tsx`.
4. Validation and server errors are returned as structured state and surfaced to the user; mail failures are logged without breaking the submission.

Handled edge cases include non-`FormData` payloads, field-level validation errors (returned with the original values preserved), database upsert failures, and email-send failures.

---

## Deployment

**Vercel** is the primary target. `vercel.json` wires the build to the `vercel-build` script, which regenerates the Prisma client, deploys migrations, and builds the app in one step:

```jsonc
{
  "buildCommand": "pnpm run vercel-build",
  "framework": "nextjs",
}
```

For **self-hosted** setups, `docker/` contains a hardened Docker `daemon.json` (log rotation, ulimits, BuildKit, registry mirror) and an `nginx/` reverse-proxy configuration.

**Health check:** `GET /api/health` returns status, ISO timestamp, uptime, environment, and version; `HEAD /api/health` returns `200` with no body for lightweight probes.

**SEO endpoints:** `GET /robots.txt` (`src/app/robots.ts`), `GET /sitemap.xml` (`src/app/sitemap.ts` - the root page, `/articles`, and one entry per article), and the `GET /opengraph-image` social banner (`src/app/opengraph-image.tsx`, rendered with `next/og`) are all produced from `src/constants/seo.constants.ts`, which also feeds the metadata and JSON-LD in `src/app/layout.tsx`. Each article page additionally generates its own `opengraph-image` at `src/app/articles/[slug]/opengraph-image.tsx`.

---

## AI-assisted development

Claude may assist with planning, prototyping, tests, and documentation. Every result must be manually reviewed, validated, and approved by a human before it is accepted.

---

## Code quality & conventions

This is a strict, production-grade TypeScript/React codebase. Contributions are expected to follow the rules in [`Claude.md`](./Claude.md). In brief:

- **Strict typing.** No `any`; type assertions avoided; prefer generics, type guards, and discriminated unions. Boolean identifiers use an `is` / `has` prefix.
- **Documentation.** JSDoc explains intent (not the identifier name) on interface/type fields, props, and non-`useState` variables.
- **Component structure.** Every component lives in its own directory with separate files for the component and its styles.
- **QA selectors.** Stable, build-safe `id` / `data-testid` / `data-key` values - no random selectors.
- **Consistency first.** Reuse existing patterns, helpers, and utilities rather than introducing new ones.

All three checks - TypeScript, ESLint, and Prettier - must pass before work is considered done.

---

<p align="center"><sub>Built by <a href="https://github.com/NKolosov097">@NKolosov097</a></sub></p>
