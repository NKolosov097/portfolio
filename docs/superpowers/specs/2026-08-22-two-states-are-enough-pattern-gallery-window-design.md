# Revision: give PatternGallery's preview a native macOS browser-window chrome

## Why

User feedback after the previous revision (real `light-dark()` fix, patterns-styled gallery
controls):

1. Confirmed (via a direct browser check, not guesswork): `LightDarkDemo`'s toggle only changes
   colors inside that one demo card - the titlebar mock and page mock move together because both
   are deliberately tied to the same shared `color-scheme`, not because the real site theme is
   being touched. No further change needed here; this was a question, not a bug report.
2. `PatternGallery`'s ("Попробуй сам") preview box currently just changes background color and
   text color when the theme flips (`<div data-theme={resolvedTheme}>` with a heading and a
   paragraph). The user wants it extended to look like an actual native macOS browser window -
   complete with a titlebar (traffic lights) and a URL address bar - so switching themes visibly
   repaints a recognizable piece of native chrome, the same way `LightDarkDemo` and
   `CombinationGrid` already do.

## Decision

- The `.preview` box gains a titlebar row above the existing heading/body copy: three traffic-light
  dots (red/yellow/green, same fixed decoration used in `LightDarkDemo`/`CombinationGrid`) plus a
  rounded URL-bar pill showing a neutral placeholder domain (`yoursite.dev`). The existing
  heading/body text becomes the "page content" area below the titlebar - copy is unchanged, it
  just now reads as a page inside a browser window instead of a bare card.
- Colors stay driven by the existing `data-theme={resolvedTheme}` attribute on the outer `.preview`
  element (unchanged mechanism - no `light-dark()` CSS function involved, so no Lightning CSS risk
  here). The titlebar reuses the exact light/dark colors already established for titlebars
  elsewhere in the article (`#e4e4e2` / `#2c2c2e`); the URL-bar pill gets its own light/dark
  treatment (a subtly different shade than the titlebar, muted text color for the placeholder
  domain).
- No new locale keys. The URL-bar text is decorative placeholder - like the traffic-light colors,
  it's not meaningful content, so it isn't localized (consistent with how traffic-light colors are
  handled in `LightDarkDemo`/`CombinationGrid`).
- Per this codebase's established convention (confirmed in prior revisions of this article), the
  traffic-light markup/styles are duplicated into `PatternGallery`'s own CSS module rather than
  extracted into a shared component - this file already has its own `Icon`/`Sun`/`Moon` imports
  and doesn't share markup with its siblings.
- Nothing below the preview changes: the state `<dl>` readout (OS preference / your override /
  resolved theme) and the closing caption stay exactly where they are, reading exactly as before.
- `PatternGallery`'s state model (`osPrefersDark`, `override`, `handleCycle`, `handleSwitchChange`,
  `handleSegmentChange`) is untouched - this is a render-only change to the preview's markup and
  styles.

## `PatternGallery` (modified)

`src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.tsx` (+ `.module.css`).

**New markup inside `.preview`**, replacing the current bare heading+body with a titlebar row
followed by a page-content wrapper:

```tsx
<div className={styles.preview} data-theme={isMounted ? resolvedTheme : undefined}>
  <div className={styles.previewTitlebar}>
    <span className={styles.previewTrafficLights}>
      {TRAFFIC_LIGHTS.map((color) => (
        <span key={color} className={styles.previewTrafficLight} data-color={color} />
      ))}
    </span>
    <span className={styles.previewUrlBar}>yoursite.dev</span>
  </div>
  <div className={styles.previewPage}>
    <p className={styles.previewHeading}>{t('...demoPreviewHeading')}</p>
    <p className={styles.previewBody}>{t('...demoPreviewBody')}</p>
  </div>
</div>
```

A new module-level constant `TRAFFIC_LIGHTS: string[] = ['red', 'yellow', 'green']` is added
(duplicated from `LightDarkDemo`/`CombinationGrid`, per the per-file-CSS-Modules convention already
established in this article).

**CSS changes** in `PatternGallery.module.css`:

- `.preview` keeps its `data-theme` attribute selector mechanism but changes from a padded card to
  a window container: `overflow: hidden` (clips the titlebar's corners to the existing
  `border-radius`), padding moves off `.preview` and onto the new `.previewPage`.
- New `.previewTitlebar` rule: flex row, small gap, padding, background driven by
  `.preview[data-theme='light'] .previewTitlebar` (`#e4e4e2`) /
  `.preview[data-theme='dark'] .previewTitlebar` (`#2c2c2e`) - same colors as
  `LightDarkDemo.module.css`'s `.titlebar`/`CombinationGrid.module.css`'s equivalent, for visual
  consistency across the article.
- New `.previewTrafficLights`/`.previewTrafficLight` rules: same sizing/color-per-`data-color` as
  the existing `TRAFFIC_LIGHTS` pattern in `LightDarkDemo`/`CombinationGrid`.
- New `.previewUrlBar` rule: a rounded pill (`border-radius: 999px`), flex-grow to fill the
  remaining titlebar width, muted background/text that darkens/lightens with the same
  `data-theme` selectors - `.preview[data-theme='light'] .previewUrlBar` (light gray background,
  dark muted text) / `.preview[data-theme='dark'] .previewUrlBar` (dark translucent background,
  light muted text).
- New `.previewPage` rule: takes over the padding `.preview` used to have; no background of its own
  (inherits the outer `.preview[data-theme=...]` background already defined).
- Existing `.previewHeading`/`.previewBody` rules and their `data-theme` color overrides are
  unchanged.

**Accessibility/testability:** `data-testid="pattern-gallery"` on the card root - unchanged. The
titlebar/traffic-lights/URL-bar are purely decorative (no interactive elements), consistent with
how the same decoration is treated in `LightDarkDemo`/`CombinationGrid` (not `aria-hidden` there
either, since they carry no semantic content that would confuse assistive tech beyond what the
surrounding text already conveys).

## Files touched

```
src/content/articles/two-states-are-enough/PatternGallery/
  PatternGallery.tsx           add TRAFFIC_LIGHTS constant + titlebar/URL-bar markup inside .preview
  PatternGallery.module.css    restructure .preview into a window container; add
                                .previewTitlebar/.previewTrafficLights/.previewTrafficLight/.previewUrlBar/.previewPage
```

No changes to `LightDarkDemo/`, `CombinationGrid/`, `PatternsInTheWild/`, `Content.tsx`,
`public/locales/en.json`, `public/locales/ru.json`, or any heading `id`.

## Testing / validation

`pnpm check-types && pnpm lint`, full `pnpm test`, manual browser verification (via a real browser
engine, not just source/HTML inspection - driving the actual page and reading computed styles) that
all three controls (button/segmented/switch) still repaint the preview's titlebar, URL bar, and page
content together, and that the state `<dl>`/caption below are unaffected.
