# New self-hosted article: "Two States Are Enough"

## Context

A response/opinion piece reacting to Lea Verou's blog post on dark mode toggles
(https://lea.verou.me/blog/2026/dark-mode-toggles/), which argues that a
tri-state (light/dark/system) theme toggle is implementation-driven UI, and
that a two-state toggle backed by a `localStorage` override with a
`prefers-color-scheme` fallback is both better UX and simpler to reason about.

The author agrees with that thesis and adds an engineering angle: two-state is
not just better UX, it's also the version that's easier to implement
_correctly_ - with three concrete failure modes teams hit in practice.

Lea's original post illustrates its points with screenshots of third-party
products (Tailwind, Ant Design, Red Hat Design System, Vitepress, Radix,
etc.). Reusing those screenshots in this portfolio is a copyright risk, and no
article in this codebase currently embeds photos - every visual is a
self-contained React/CSS component (see `AdoptionStatsChart`). This article
follows that same convention: a live, interactive `ThemeToggleDemo` component
replaces photos.

## Scope

New article only. No changes to the theme-less portfolio shell itself (the
site is currently dark-only by design - see `src/app/layout.tsx`); the demo
component is self-contained and uses its own `localStorage` key, unrelated to
the site's own (nonexistent) theme system.

## Files

```
src/constants/articles.constants.ts        + twoStatesAreEnoughArticle entry, appended to ARTICLES
src/content/articles/two-states-are-enough/
  Content.tsx                               article body + HEADINGS export
  ThemeToggleDemo/
    ThemeToggleDemo.tsx
    ThemeToggleDemo.module.css
src/content/articles/registry.ts           + registry entries for the new slug
public/locales/en.json                     + articleContent.twoStatesAreEnough.*
public/locales/ru.json                     + articleContent.twoStatesAreEnough.*
```

No changes needed to `page.tsx`, the OG image route, the JSON-LD builder, or
`articles.constants.test.ts` - all are already generic over `ARTICLES`.

## Article metadata

- **Slug:** `two-states-are-enough`
- **Title (EN):** Two States Are Enough
- **Title (RU):** Двух состояний достаточно
- **Description (EN):** A response to Lea Verou's case against tri-state dark
  mode toggles - and why two states plus a smart localStorage default aren't
  just simpler UX, they're the version that's actually easier to implement
  correctly.
- **Description (RU):** Отклик на статью Леи Веру против трёхпозиционных
  переключателей темы - и почему связка «два состояния + localStorage по
  умолчанию» не только удобнее пользователю, но и проще реализовать без
  ошибок.
- **publishedDate:** 2026-08-17
- **readingTimeMinutes:** 4

Lea Verou's post is credited as a plain-text citation (matching the existing
`chartSource`/`chartHeroSource` convention of citing sources as plain text,
no hyperlink - `ArticleContent` has no anchor styling and this avoids adding
any), not as a clickable link.

## Article structure (document order)

1. **Intro (3 paragraphs)** - the tri-state toggle as a symptom of
   implementation-driven UI; credits Lea Verou's post; introduces the demo.
2. **`ThemeToggleDemo`** - embedded right after the intro, before the first
   heading (mirrors where `AdoptionStatsChart` sits in the existing article).
3. **H2 `tri-state-is-implementation-driven-ui` - "The Tri-State Toggle Is
   Implementation-Driven UI"** - restates Lea's core argument: a theme always
   resolves to exactly one of two rendered values; the third option exists
   because the _source_ of that value can vary, not because there's a third
   way the page looks. Users reach for a toggle to fix a current discomfort,
   not to plan ahead.
4. **H2 `where-two-state-actually-gets-hard` - "Where Two-State Actually Gets
   Hard"** - the engineering angle, three concrete failure modes:
   - **Theme-flash / FOUC** - resolving theme in a React effect instead of a
     synchronous inline `<head>` script causes a one-frame flash of the wrong
     theme on hard refresh.
   - **Proactively clearing the override** - Lea's own warning: never touch
     `localStorage` except in direct response to a user click. "Cleaning up"
     an override that happens to match the OS preference silently drags the
     user's screen along on the next OS-level theme change they never asked
     to follow.
   - **Cross-tab sync** - without a `storage` event listener, toggling in one
     tab leaves other open tabs on the stale theme until reload.
5. **H2 `when-three-states-still-earn-their-keep` - "When Three States Still
   Earn Their Keep"** - concession mirroring Lea's own: a settings panel is a
   place users already arrive to configure something ahead of time, so a
   labeled "System" option fits there; a header toggle is not that context.
6. **Closing paragraph** - general principle: check whether a third option
   answers a problem users actually have, or only one the data model has.

## `ThemeToggleDemo` component

Self-contained card, structurally similar to `AdoptionStatsChart` (own
`.module.css`, own `data-testid`, `'use client'`).

**Visual elements:**

- Eyebrow ("Try it")
- Mini site preview (heading + one line of body text) whose background/text
  color actually renders in the resolved light/dark theme
- One toggle button, single dynamic label ("Switch to dark" / "Switch to
  light") - never three icons/options
- A state readout with three live values: `OS preference`, `Your override`,
  `Resolved theme`
- A closing caption noting the state is real (`localStorage` + `matchMedia`),
  not simulated

**State & logic:**

- `osPrefersDark: boolean | null` - `null` until mounted; set in `useEffect`
  from `window.matchMedia('(prefers-color-scheme: dark)')`, with a `change`
  listener kept live for the component's lifetime
- `storedOverride: 'light' | 'dark' | null` - read from `localStorage` (key
  `demo-theme-override`, scoped to this component only) in the same
  `useEffect`; written on toggle click
- `resolvedTheme = storedOverride ?? (osPrefersDark ? 'dark' : 'light')`
- Before mount (`osPrefersDark === null`), render a neutral placeholder state
  to avoid an SSR/hydration mismatch - same pattern as the ref-timing care
  already used elsewhere in this codebase for mount-order-sensitive UI

**Toggle click handler:**

```
if (storedOverride === null) {
  // first press: override to the opposite of what's currently shown
  set storedOverride = resolvedTheme === 'dark' ? 'light' : 'dark'
} else {
  // second press: drop the override, fall back to system
  set storedOverride = null
}
```

This is exactly the two-press cycle Lea describes: override → follow system →
override → ... A change to `osPrefersDark` while overridden never touches
`storedOverride` - matching the "don't proactively clear on OS change" rule
from section 4 above.

## i18n keys (new namespace `articleContent.twoStatesAreEnough`)

Intro (`intro1`–`intro3`), heading labels
(`implementationDrivenHeading`, `hardPartsHeading`, `whenThreeEarnHeading`),
body paragraphs per section (`implementationDriven1/2`, `hardParts1/2/3`,
`whenThreeEarn1/2`), `closing`, plus demo copy: `demoEyebrow`,
`demoPreviewHeading`, `demoPreviewBody`, `demoToggleToDark`,
`demoToggleToLight`, `demoOsPreferenceLabel`, `demoOverrideLabel`,
`demoResolvedLabel`, `demoLight`, `demoDark`, `demoOverrideNone`,
`demoCaption`. Full EN/RU copy is written directly into the locale files as
part of implementation - not duplicated in this spec.

## Testing / validation

- `articles.constants.test.ts` already asserts every article has a unique
  kebab-case slug, translated title/description, positive reading time, and a
  parsable `publishedDate` - the new entry is covered automatically, no test
  changes needed.
- No new e2e coverage is in scope for this change (out of scope: the existing
  `e2e/articles.spec.ts` hardcodes the first article by name; extending it to
  a second article is a separate concern the user hasn't asked for here).
- Run `pnpm check-types && pnpm lint` before considering the change complete,
  per project convention.

## Out of scope

- Adding a real theme toggle to the portfolio site itself.
- Photos/screenshots of any kind.
- New e2e tests for the second article.
- Anchor/link styling in `ArticleContent` (citation stays plain text).
