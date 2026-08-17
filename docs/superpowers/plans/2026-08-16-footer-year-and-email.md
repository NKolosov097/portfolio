# Footer Year & Email Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site footer show a current (non-stale) copyright year and a clickable contact email link.

**Architecture:** Single-file edit to `src/layout/Footer/Footer.tsx` — compute the copyright string with the current year and pass a `menuItems` entry (already supported by `@gravity-ui/navigation`'s `Footer`) with a `mailto:` link using the existing `EMAIL` constant.

**Tech Stack:** Next.js App Router, React, `@gravity-ui/navigation` Footer component.

## Global Constraints

- Strict TypeScript: no `any`, no type assertions; boolean identifiers prefixed `is`/`has`.
- JSDoc on interface/type fields and component props (n/a here — no new props/types introduced).
- Comments only where the why is non-obvious; 1-2 lines max.
- Use stable `data-testid` selectors for QA — no randomly generated ones, and not Gravity UI's own `qa` prop (unused elsewhere in this codebase).
- `pnpm check-types && pnpm lint` must pass before considering the task done.
- Commits are authored by the repo owner only — do not add a `Co-Authored-By` trailer.
- No new translation keys — neither the copyright string nor the email address is localized elsewhere in the project.

---

### Task 1: Add current-year copyright and email link to the footer

**Files:**
- Modify: `src/layout/Footer/Footer.tsx`

**Interfaces:**
- Consumes: `EMAIL` from `@/constants/constants` (already exported, already used the same way — untranslated, raw string — in `src/home-sections/AboutMe/AboutMe.tsx:90`).

- [ ] **Step 1: Update `src/layout/Footer/Footer.tsx`**

Replace the full file contents with:

```tsx
'use client'

import { Footer as GravityFooter } from '@gravity-ui/navigation'

import { EMAIL } from '@/constants/constants'

export const Footer = () => {
  return (
    <GravityFooter
      copyright={`${new Date().getFullYear()} NKolosov097`}
      menuItems={[
        {
          text: EMAIL,
          href: `mailto:${EMAIL}`,
          extraProps: { 'data-testid': 'footer-email-link' },
        },
      ]}
    />
  )
}
```

- [ ] **Step 2: Verify types and lint**

Run: `pnpm check-types && pnpm lint`
Expected: both pass with no errors.

- [ ] **Step 3: Manual check**

Run: `pnpm dev`, open `http://localhost:3000/` in a browser (or drive it with Playwright, as
used earlier in this project for the not-found pages — `curl` won't show client-rendered text).
Expected: the footer shows the current year followed by "NKolosov097", and a link with the
email address (`data-testid="footer-email-link"`) whose `href` is `mailto:<the EMAIL constant's
value>`. Clicking it should trigger the OS/browser mail-client handler (or at least resolve to
the right `href` — Playwright's `getAttribute('href')` is enough to confirm this without
actually launching a mail client).

- [ ] **Step 4: Commit**

```bash
git add src/layout/Footer/Footer.tsx
git commit -m "feat: show current year and email link in footer"
```

---

### Task 2: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full validation suite**

Run: `pnpm check-types && pnpm lint && pnpm test`
Expected: all pass.

- [ ] **Step 2: README check**

Per `CLAUDE.md`, check whether `README.md` needs updating after a code-structure change. This
change only edits props passed to an existing component — no new file, no new directory, no new
route. Expected: no `README.md` update needed.
