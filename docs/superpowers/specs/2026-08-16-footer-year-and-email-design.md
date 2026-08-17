# Footer — current-year copyright and email link

## Problem

`src/layout/Footer/Footer.tsx` renders `<GravityFooter copyright="NKolosov097" />` — a static
copyright string with no year, and no `menuItems`, even though `GravityFooter` supports both.
The site's contact email (`EMAIL` in `src/constants/constants.ts`) is only ever shown inside the
`AboutMe` section; there's no contact link visible from pages that don't scroll there (e.g. an
article page), and no footer text will ever go stale-looking with a fixed year.

## Solution

Single-file change, `src/layout/Footer/Footer.tsx`:

- **Copyright:** replace the hardcoded string with `` `${new Date().getFullYear()} NKolosov097` ``,
  so the year is always current.
- **Email link:** pass `menuItems={[{ text: EMAIL, href: `mailto:${EMAIL}`, extraProps: {
  'data-testid': 'footer-email-link' } }]}`, importing `EMAIL` from `@/constants/constants` (same
  constant already displayed, untranslated, in `AboutMe.tsx`). `GravityFooter` renders `menuItems`
  as a link list to the left of the copyright — no extra markup or styling needed.
- Uses `data-testid` for the QA selector (the project's existing convention), not Gravity UI's own
  `qa` prop, which isn't used anywhere else in this codebase.
- No new translation keys — neither the copyright string nor the email address is localized
  elsewhere in the project.

## Scope

- Modified: `src/layout/Footer/Footer.tsx` only.
- No new files, no new dependencies, no CSS changes (Gravity UI's own `Footer` styles already
  handle the `menuItems` layout).
