# Favorite Tools / CV Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the site's `favoriteTools` list with the real, CV-attested stack: rename the `RTK Query` entry to `Redux Toolkit` and add a `TypeScript` entry.

**Architecture:** Content-only change to a single constants file (`src/constants/resume.constants.tsx`) plus two static SVG assets under `public/assets/svg/tools/`. No component, style, or logic changes.

**Tech Stack:** Next.js, TypeScript, static SVG assets served from `public/`.

## Global Constraints

- Strict TypeScript, no `any`, no type assertions (per `CLAUDE.md`).
- JSDoc on interface/type fields (already present on `IFavoriteTool` - no change needed there).
- Stable `id`/`data-key` selectors, no random selectors (`FavoriteTool.tsx` already uses `id` as `data-key`).
- Validation before considering the change complete: `pnpm check-types && pnpm lint`.
- Icon files follow the existing pattern in `public/assets/svg/tools/`: single `<svg>` with the brand color baked into `fill` (see `nestjs.svg`, `rtk-query.svg`).

---

### Task 1: Rename the `RTK Query` favorite tool to `Redux Toolkit`

**Files:**
- Create: `public/assets/svg/tools/redux-toolkit.svg` (copy of the current `rtk-query.svg` content - it is already the Redux atom mark, `#764ABC`)
- Delete: `public/assets/svg/tools/rtk-query.svg`
- Modify: `src/constants/resume.constants.tsx:173-177` (the `rtk-query` entry in `favoriteTools`)

**Interfaces:**
- Consumes: `IFavoriteTool` from `src/home-sections/Resume/types/resume.type.ts` (unchanged: `{ id: string; icon: JSX.Element; title: string }`).
- Produces: a `favoriteTools` array entry with `id: 'redux-toolkit'`, `title: 'Redux Toolkit'`, consumed by `FavoriteTools.tsx` (unchanged rendering).

- [ ] **Step 1: Create the renamed icon asset**

Read the current `public/assets/svg/tools/rtk-query.svg` and write its exact content to `public/assets/svg/tools/redux-toolkit.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="#764ABC"><path d="M65.6 65.4c2.9-.3 5.1-2.8 5-5.8-.1-3-2.6-5.4-5.6-5.4h-.2c-3.1.1-5.5 2.7-5.4 5.8.1 1.5.7 2.8 1.6 3.7-3.4 6.7-8.6 11.6-16.4 15.7-5.3 2.8-10.8 3.8-16.3 3.1-4.5-.6-8-2.6-10.2-5.9-3.2-4.9-3.5-10.2-.8-15.5 1.9-3.8 4.9-6.6 6.8-8-.4-1.3-1-3.5-1.3-5.1-14.5 10.5-13 24.7-8.6 31.4 3.3 5 10 8.1 17.4 8.1 2 0 4-.2 6-.7 12.8-2.5 22.5-10.1 28-21.4z"/><path d="M83.2 53c-7.6-8.9-18.8-13.8-31.6-13.8H50c-.9-1.8-2.8-3-4.9-3h-.2c-3.1.1-5.5 2.7-5.4 5.8.1 3 2.6 5.4 5.6 5.4h.2c2.2-.1 4.1-1.5 4.9-3.4H52c7.6 0 14.8 2.2 21.3 6.5 5 3.3 8.6 7.6 10.6 12.8 1.7 4.2 1.6 8.3-.2 11.8-2.8 5.3-7.5 8.2-13.7 8.2-4 0-7.8-1.2-9.8-2.1-1.1 1-3.1 2.6-4.5 3.6 4.3 2 8.7 3.1 12.9 3.1 9.6 0 16.7-5.3 19.4-10.6 2.9-5.8 2.7-15.8-4.8-24.3z"/><path d="M32.4 67.1c.1 3 2.6 5.4 5.6 5.4h.2c3.1-.1 5.5-2.7 5.4-5.8-.1-3-2.6-5.4-5.6-5.4h-.2c-.2 0-.5 0-.7.1-4.1-6.8-5.8-14.2-5.2-22.2.4-6 2.4-11.2 5.9-15.5 2.9-3.7 8.5-5.5 12.3-5.6 10.6-.2 15.1 13 15.4 18.3 1.3.3 3.5 1 5 1.5-1.2-16.2-11.2-24.6-20.8-24.6-9 0-17.3 6.5-20.6 16.1-4.6 12.8-1.6 25.1 4 34.8-.5.7-.8 1.8-.7 2.9z"/></g></svg>
```

- [ ] **Step 2: Delete the old asset**

```bash
rm "public/assets/svg/tools/rtk-query.svg"
```

- [ ] **Step 3: Update the `favoriteTools` entry**

In `src/constants/resume.constants.tsx`, replace the `rtk-query` object:

```tsx
  {
    id: 'rtk-query',
    icon: <Image src="/assets/svg/tools/rtk-query.svg" alt="RTK Query" width={40} height={40} />,
    title: 'RTK Query',
  },
```

with:

```tsx
  {
    id: 'redux-toolkit',
    icon: (
      <Image src="/assets/svg/tools/redux-toolkit.svg" alt="Redux Toolkit" width={40} height={40} />
    ),
    title: 'Redux Toolkit',
  },
```

- [ ] **Step 4: Type-check and lint**

Run: `pnpm check-types && pnpm lint`
Expected: both pass with no errors.

- [ ] **Step 5: Commit**

```bash
git add public/assets/svg/tools/redux-toolkit.svg src/constants/resume.constants.tsx
git rm public/assets/svg/tools/rtk-query.svg
git commit -m "fix: rename RTK Query favorite tool to Redux Toolkit"
```

---

### Task 2: Add a `TypeScript` favorite tool entry

**Files:**
- Verify: `public/assets/svg/tools/typescript.svg` (already created - official TypeScript mark, `#3178C6`)
- Modify: `src/constants/resume.constants.tsx` (append to `favoriteTools`, after the `zod` entry and before `redux-toolkit` - keeping the existing "core language/data" grouping order used today)

**Interfaces:**
- Consumes: `IFavoriteTool` (unchanged).
- Produces: a new `favoriteTools` array entry with `id: 'typescript'`, `title: 'TypeScript'`.

- [ ] **Step 1: Confirm the icon asset exists and looks correct**

Run: `cat "public/assets/svg/tools/typescript.svg"`
Expected: a single `<svg>` with `viewBox="0 0 24 24"` and `fill="#3178C6"` on the `<path>`.

- [ ] **Step 2: Add the entry to `favoriteTools`**

In `src/constants/resume.constants.tsx`, insert immediately after the `zod` entry (before `redux-toolkit`):

```tsx
  {
    id: 'typescript',
    icon: <Image src="/assets/svg/tools/typescript.svg" alt="TypeScript" width={40} height={40} />,
    title: 'TypeScript',
  },
```

- [ ] **Step 3: Type-check and lint**

Run: `pnpm check-types && pnpm lint`
Expected: both pass with no errors.

- [ ] **Step 4: Visual check**

Run: `pnpm dev`, open the resume section in a browser, and confirm the "Favorite tools" grid now shows 13 icons: React, NextJS, TypeScript, React Hook Form, Zod, Redux Toolkit, Zustand, Framer Motion, Jest, Cypress, Playwright, NestJS, PostgreSQL - each with a correctly rendered, non-broken icon.

- [ ] **Step 5: Commit**

```bash
git add public/assets/svg/tools/typescript.svg src/constants/resume.constants.tsx
git commit -m "feat: add TypeScript to favorite tools"
```
