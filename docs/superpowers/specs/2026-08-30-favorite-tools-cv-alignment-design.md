# Favorite tools / CV alignment

## Problem

`favoriteTools` (`src/constants/resume.constants.tsx`) listed Jest, Zustand, Cypress, NestJS and PostgreSQL, none of which appeared anywhere in the on-site resume content (work experience `stack` arrays or bullets). The list read as an unverified placeholder.

## Findings

- The user confirmed Jest, Zustand, Cypress, NestJS and PostgreSQL are genuinely used (Proofix and Everypixel Workroom), so they stay.
- The downloadable PDF resume (`public/assets/cv/cv-nikita-kolosov.pdf`, source maintained by the user outside this repo) already lists all five in its SKILLS section - no PDF change needed.
- Per-role `stack` arrays in `resume.constants.tsx` already match the PDF's per-role "Stack:" lines closely - no change needed there.
- The real gap is `favoriteTools` itself: `RTK Query` is named but "Redux Toolkit" (not RTK Query specifically) is what's attested everywhere in the CV/stack, and `TypeScript` - a skill listed first under the resume's Skills/Languages and used across every role - was missing entirely, despite an icon asset for it not previously existing.

## Change

In `favoriteTools`:

1. Rename the `RTK Query` entry to **Redux Toolkit** (`id: 'redux-toolkit'`). Same icon (already the Redux atom mark, `#764ABC`) - asset file renamed from `rtk-query.svg` to `redux-toolkit.svg`.
2. Add a new **TypeScript** entry (`id: 'typescript'`) using a new `typescript.svg` asset (official mark, `#3178C6`), sourced from simple-icons.
3. No other entries, ordering, styling, or component code change.

Net effect: 12 -> 13 entries, one rename, nothing else touched.
