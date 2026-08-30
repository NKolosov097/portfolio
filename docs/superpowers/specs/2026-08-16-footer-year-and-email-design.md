# Footer - current-year copyright and email link

## Problem

`src/layout/Footer/Footer.tsx` renders `<GravityFooter copyright="NKolosov097" />` - a static
copyright string with no year, and no `menuItems`, even though `GravityFooter` supports both.
The site's contact email (`EMAIL` in `src/constants/constants.ts`) is only ever shown inside the
`AboutMe` section; there's no contact link visible from pages that don't scroll there (e.g. an
article page), and no footer text will ever go stale-looking with a fixed year.

## Solution

Single-file change, `src/layout/Footer/Footer.tsx`:

- **Copyright:** replace the hardcoded string with `` `${new Date().getFullYear()} NKolosov097` ``,
  so the year is always current.
- **Email link:** pass `menuItems={[{ text: EMAIL, href: `mailto:${EMAIL}`, qa:
'footer-email-link' }]}`, importing `EMAIL` from `@/constants/constants` (same constant already
  displayed, untranslated, in `AboutMe.tsx`). `GravityFooter` renders `menuItems` as a link list to
  the left of the copyright - no extra markup or styling needed.
- Uses Gravity UI's `qa` prop (renders as `data-qa` in the DOM) for the QA selector.
  `MenuItemProps.extraProps` is typed as `HTMLAttributes<HTMLDivElement> |
AnchorHTMLAttributes<HTMLAnchorElement>` with no `data-*` index signature in this project's
  `@types/react` (19.2.14), so a `data-testid` there fails `tsc` with "object literal may only
  specify known properties" - TypeScript's JSX-level allowance for arbitrary `data-*` attributes
  doesn't extend to a plain object literal assigned to an `HTMLAttributes`-typed field. `qa` is the
  type-safe, first-class alternative this component ships for exactly this purpose, even though
  it isn't used elsewhere in the codebase yet.
- No new translation keys - neither the copyright string nor the email address is localized
  elsewhere in the project.

## Scope

- Modified: `src/layout/Footer/Footer.tsx` only.
- No new files, no new dependencies, no CSS changes (Gravity UI's own `Footer` styles already
  handle the `menuItems` layout).
