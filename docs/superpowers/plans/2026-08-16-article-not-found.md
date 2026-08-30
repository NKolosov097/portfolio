# Article Not-Found Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/articles/[slug]` its own not-found page (article-specific copy, link back to `/articles`) instead of falling back to the global not-found page.

**Architecture:** Extract the existing global not-found markup into a reusable presentational component (`NotFoundView`), refactor the global `not-found.tsx` to use it, then add a second `not-found.tsx` for the `articles/[slug]` route segment that uses the same component with article-specific copy and link target. Next.js automatically renders a segment's `not-found.tsx` when `notFound()` is called from a `page.tsx` in that segment - `src/app/articles/[slug]/page.tsx` already calls `notFound()`, so no change is needed there.

**Tech Stack:** Next.js App Router, React, react-i18next, CSS Modules, vitest.

## Global Constraints

- Strict TypeScript: no `any`, no type assertions; boolean identifiers prefixed `is`/`has`.
- JSDoc on interface/type fields and component props.
- Comments only where the why is non-obvious; 1-2 lines max.
- Each component lives in its own directory with separate component and style files.
- Use stable `data-testid` selectors for QA - no randomly generated ones.
- `pnpm check-types && pnpm lint` must pass before considering any task done.
- Commits are authored by the repo owner only - do not add a `Co-Authored-By` trailer.

---

### Task 1: Extract `NotFoundView` and refactor the global not-found page

**Files:**

- Create: `src/components/NotFoundView/NotFoundView.tsx`
- Create: `src/components/NotFoundView/NotFoundView.module.css`
- Modify: `src/app/not-found.tsx`
- Modify: `src/styles/globals.css:173-191` (remove the four `.not-found-*` rules being migrated)

**Interfaces:**

- Produces: `NotFoundView` component, `import { NotFoundView } from '@/components/NotFoundView/NotFoundView'`, props `{ heading: string; description: string; linkHref: string; linkLabel: string; testId: string }`.

- [ ] **Step 1: Create `NotFoundView.module.css`**

```css
.section {
  margin-top: 2rem;
}

.header {
  width: 100%;
  text-align: center;
  font-size: 1.8rem;
  margin: 0;
}

.description,
.link {
  font-size: 1rem;
}

.description {
  margin: 1rem 0;
}
```

- [ ] **Step 2: Create `NotFoundView.tsx`**

```tsx
import styles from './NotFoundView.module.css'

import Link from 'next/link'

interface INotFoundViewProps {
  /** Heading shown at the top of the not-found message. */
  heading: string
  /** Body copy explaining what wasn't found and reassuring the reader. */
  description: string
  /** Destination the recovery link navigates to. */
  linkHref: string
  /** Label shown on the recovery link. */
  linkLabel: string
  /** Stable selector for QA, e.g. `not-found-link`. */
  testId: string
}

export const NotFoundView = ({
  heading,
  description,
  linkHref,
  linkLabel,
  testId,
}: INotFoundViewProps) => (
  <section className={styles.section}>
    <h2 className={styles.header}>{heading}</h2>

    <p className={styles.description}>{description}</p>

    <Link
      href={linkHref}
      data-testid={testId}
      className={`g-link g-link_view_normal ${styles.link}`}
    >
      {linkLabel}
    </Link>
  </section>
)

export default NotFoundView
```

- [ ] **Step 3: Remove the migrated rules from `globals.css`**

Delete these four rules (currently at `src/styles/globals.css:173-191`), now owned by `NotFoundView.module.css`:

```css
.not-found-section {
  margin-top: 2rem;
}

.not-found-header {
  width: 100%;
  text-align: center;
  font-size: 1.8rem;
  margin: 0;
}

.not-found-description,
.not-found-link {
  font-size: 1rem;
}

.not-found-description {
  margin: 1rem 0;
}
```

Leave the surrounding rules (`.error-body .error-body-btn` above, `aside` below) untouched.

- [ ] **Step 4: Refactor `src/app/not-found.tsx` to use `NotFoundView`**

```tsx
'use client'

import { useTranslation } from 'react-i18next'

import { NotFoundView } from '@/components/NotFoundView/NotFoundView'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <NotFoundView
      heading={t('notFound.title')}
      description={t('notFound.description')}
      linkHref="/"
      linkLabel={t('notFound.backBtn')}
      testId="not-found-link"
    />
  )
}
```

- [ ] **Step 5: Verify types and lint**

Run: `pnpm check-types && pnpm lint`
Expected: both pass with no errors.

- [ ] **Step 6: Manual check**

Run: `pnpm dev`, visit `http://localhost:3000/this-page-does-not-exist`.
Expected: page renders identically to before the refactor (same heading, description, and "Go back to the main page" link to `/`).

- [ ] **Step 7: Commit**

```bash
git add src/components/NotFoundView src/app/not-found.tsx src/styles/globals.css
git commit -m "refactor: extract NotFoundView component from global not-found page"
```

---

### Task 2: Add `articleNotFound` translations

**Files:**

- Modify: `public/locales/en.json` (add `articleNotFound` namespace, alongside the existing `notFound` namespace)
- Modify: `public/locales/ru.json` (same)

**Interfaces:**

- Consumes: nothing from Task 1.
- Produces: translation keys `articleNotFound.title`, `articleNotFound.description`, `articleNotFound.backBtn` in both locale files, consumed by Task 3.

- [ ] **Step 1: Add the namespace to `public/locales/en.json`**

Insert immediately after the `notFound` block (after line 12, `},`):

```json

  "articleNotFound": {
    "title": "There is no such article",
    "description": "But don't worry! There's always something interesting to read :)",
    "backBtn": "Browse all articles"
  },
```

- [ ] **Step 2: Add the namespace to `public/locales/ru.json`**

Insert at the same position:

```json

  "articleNotFound": {
    "title": "Такой статьи не существует",
    "description": "Но вы не расстраивайтесь! Всегда можно найти что-то интересное для чтения :)",
    "backBtn": "Ко всем статьям"
  },
```

- [ ] **Step 3: Run the locale parity test**

Run: `pnpm test src/configs/i18n/locales.test.ts`
Expected: PASS - confirms both files stay in key-parity and neither has blank values.

- [ ] **Step 4: Commit**

```bash
git add public/locales/en.json public/locales/ru.json
git commit -m "feat: add articleNotFound translation namespace"
```

---

### Task 3: Add the `articles/[slug]` not-found page

**Files:**

- Create: `src/app/articles/[slug]/not-found.tsx`

**Interfaces:**

- Consumes: `NotFoundView` from Task 1 (`import { NotFoundView } from '@/components/NotFoundView/NotFoundView'`), translation keys from Task 2 (`articleNotFound.title`, `articleNotFound.description`, `articleNotFound.backBtn`).

- [ ] **Step 1: Create `src/app/articles/[slug]/not-found.tsx`**

```tsx
'use client'

import { useTranslation } from 'react-i18next'

import { NotFoundView } from '@/components/NotFoundView/NotFoundView'

export default function ArticleNotFoundPage() {
  const { t } = useTranslation()

  return (
    <NotFoundView
      heading={t('articleNotFound.title')}
      description={t('articleNotFound.description')}
      linkHref="/articles"
      linkLabel={t('articleNotFound.backBtn')}
      testId="not-found-link"
    />
  )
}
```

- [ ] **Step 2: Verify types and lint**

Run: `pnpm check-types && pnpm lint`
Expected: both pass with no errors.

- [ ] **Step 3: Manual check**

Run: `pnpm dev`, visit `http://localhost:3000/articles/this-article-does-not-exist`.
Expected: page shows "There is no such article" / "But don't worry! There's always something interesting to read :)" and a "Browse all articles" link that navigates to `/articles`. Visiting `http://localhost:3000/this-page-does-not-exist` still shows the unchanged global not-found page (confirms the two `not-found.tsx` files aren't cross-wired).

- [ ] **Step 4: Commit**

```bash
git add src/app/articles/[slug]/not-found.tsx
git commit -m "feat: add article-specific not-found page"
```

---

### Task 4: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full validation suite**

Run: `pnpm check-types && pnpm lint && pnpm test`
Expected: all pass.

- [ ] **Step 2: README check**

Per `CLAUDE.md`, check whether `README.md` needs updating after a code-structure change. This change adds one new component directory under the existing `src/components/` tree and one new route-convention file under an existing route - no new top-level `src/*` directory, no new route path, no new script. Expected: no `README.md` update needed; confirm by re-reading its Architecture/Project structure sections if unsure.

- [ ] **Step 3: Confirm both not-found pages one more time in the browser**

Run: `pnpm dev`, visit both `http://localhost:3000/this-page-does-not-exist` and `http://localhost:3000/articles/this-article-does-not-exist`, and switch the language toggle on each to confirm both locales render correctly.
