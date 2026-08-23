# Revision: "Two States Are Enough" — opening hook, real-world grounding, light-dark()

## Why

User re-read Lea Verou's source article (https://lea.verou.me/blog/2026/dark-mode-toggles/) side
by side with our own and asked for three things:

1. Her piece hooks the reader almost immediately with a simple, relatable image (two faucets —
   separate hot/cold handles vs. one mixer — as an analogy for bad vs. good control design) before
   it ever mentions dark mode. Our article has no equivalent moment near the top.
2. Her piece backs its argument with screenshots of real products (Tailwind, Ant Design, Radix,
   VitePress, Bluesky, Google Calendar, etc.) showing how they actually implement the toggle. Our
   [prior revision](2026-08-17-two-states-are-enough-revision-design.md) deliberately dropped real
   screenshots for copyright-risk reasons and replaced that need with interactive demo patterns
   (`PatternGallery`). Re-confirmed with the user this time: still no real screenshots or branded
   mockups — the ask is satisfied instead with generic, unbranded illustrations, captioned with the
   real product names as plain text (naming a product in prose is normal, low-risk tech-writing
   practice; the risk was specifically in reproducing someone else's visual design).
3. Her piece has an aside noting that CSS itself is "very much designed around duality" —
   `light-dark()` takes exactly two arguments, no third slot for "system." Our article never
   mentions `light-dark()` at all, despite it being direct supporting evidence for the article's own
   thesis.

## Decisions made with the user

- **Hook analogy lives outside the theme-toggle UI entirely** — a light-switch-style comparison (five
  labelled buttons you must read vs. one slider you just feel), not a re-skin of any existing
  toggle demo. This avoids competing with `CombinationGrid`/`PatternGallery` for the reader's
  attention and doesn't reproduce Lea Verou's specific faucet imagery.
- **The hook is a static illustration**, not another interactive demo — no `matchMedia`, no
  `localStorage`, no `useState`. It exists to be looked at for two seconds, not played with.
- **Real-world grounding uses generic, unbranded mockups** with real product names only in the
  caption text (no logos, no copied color schemes/layouts).
- **`light-dark()` gets a short, non-interactive code snippet**, inline in the
  "implementation-driven" section, not a new full component elsewhere.
- No new component introduces interactivity/state; all three additions are presentational only,
  which also means none of them need the `react-hooks/set-state-in-effect` lint override that
  `PatternGallery`/`CombinationGrid` require.
- No syntax-highlighting library is introduced for the one CSS snippet — the codebase has no
  existing code-block component (confirmed: no `shiki`/`prismjs`/`rehype-pretty-code`, no `<pre>`
  usage anywhere in article content), so `LightDarkSnippet` is a plain styled `<pre><code>`,
  matching the project's existing "hand-built div+CSS illustration" convention rather than pulling
  in a new dependency for a single 4-line snippet.

## `SwitchAnalogy` (new)

`src/content/articles/two-states-are-enough/SwitchAnalogy/`.

**Purpose:** the "hook" — the first thing after the intro, before any theme-toggle content, making
the article's point (reading labels vs. feeling a direction) land in two seconds via an unrelated,
everyday control.

**Props/state:** none. Fully static markup driven only by i18n strings; no hooks, no client-only
read, no `'use client'` directive needed since nothing is interactive or browser-API-dependent.

**Layout:** a card (reusing the existing dark-card visual language: `background:#111`, hairline
border, rounded corners, uppercase `eyebrow` label — same tokens as `CombinationGrid`'s `.card`/
`.eyebrow`) containing two side-by-side panels:

- **Panel A — "five buttons":** a row of 5 small pill-shaped buttons, each labelled with a percentage
  (`10%` / `30%` / `50%` / `70%` / `100%`), one visually marked as pressed/selected (purely
  decorative `data-active` attribute, not driven by any click handler). Caption below: reader has
  to read every label and pick the exact one they mean.
- **Panel B — "one slider":** a single horizontal track with one knob positioned roughly 70% along
  it. Caption below: reader just drags toward warmer/cooler without reading anything.

A one-line takeaway sits under both panels, tying the analogy back to the article's subject
(tri-state controls ask you to read; two-state controls ask you to feel a direction).

**Accessibility/testability:** `data-testid="switch-analogy"` on the card, matching the
`pattern-gallery`/`combination-grid` convention. Since nothing is clickable, no `role`/`aria-*`
interactive attributes are needed — the five buttons and the slider are rendered as plain `<span>`s
styled to look like controls, not real `<button>`/`<input type="range">` elements (they don't do
anything, so real interactive elements would be misleading to assistive tech).

## `PatternsInTheWild` (new)

`src/content/articles/two-states-are-enough/PatternsInTheWild/`.

**Purpose:** stand in for Lea Verou's real-product screenshots — ground the article's claim that
tri-state controls are everywhere, without reproducing anyone's actual UI.

**Props/state:** none, fully static, same rationale as `SwitchAnalogy`.

**Layout:** a card with an `eyebrow` label and a row of 3 generic mockup tiles, deliberately
neutral/grayscale (not colorful, not matching any real brand's palette) so each reads as a
paraphrase, not a copy:

1. **Segmented tri-state control** — three equal-width labelled segments ("Light" / "Dark" /
   "System") in one pill-shaped group, one marked active. Caption names real products in plain
   text: this exact shape appears in Tailwind's own docs, Ant Design, and Radix Themes.
2. **Single icon toggle** — one round button with a sun/moon icon (reuse the existing `@gravity-ui/
icons` `Sun`/`Moon` icons already imported in `PatternGallery`, avoiding a new icon dependency).
   Caption: this is the shape VitePress and Material Design use.
3. **Settings-row switches** — a small mocked list row with a label ("Appearance") and a switch (or
   two, one plain rectangle standing for a second control) at the trailing edge. Caption: Bluesky
   and Google Calendar bury the same three options inside a settings screen instead of a toolbar
   toggle.

Each tile is purely illustrative markup (divs/spans + CSS), not real Gravity UI `Switch`/`Icon`
components acting as controls — except reusing the `Sun`/`Moon` icon glyphs themselves, which are
generic iconography, not any product's branding.

**Accessibility/testability:** `data-testid="patterns-in-the-wild"` on the card. Tiles are inert
(no `onClick`), so rendered as non-interactive elements, same reasoning as `SwitchAnalogy`.

## `LightDarkSnippet` (new)

`src/content/articles/two-states-are-enough/LightDarkSnippet/`.

**Purpose:** show that CSS itself models a theme as exactly two values, reinforcing the
`implementationDriven` paragraph right above it.

**Props/state:** none.

**Layout:** a small card (same dark-card visual language) containing a `<pre><code>` block with a
literal (non-translated — code isn't localized elsewhere in this project either) 4-line CSS
snippet:

```css
:root {
  color-scheme: light dark;
}

body {
  background: light-dark(#fff, #111);
  color: light-dark(#111, #fff);
}
```

One caption line underneath (translated) states the point in plain language: `light-dark()` takes
exactly two arguments — there's no third slot for "system."

**Accessibility/testability:** `data-testid="light-dark-snippet"` on the card.

## Content changes (`en.json` and `ru.json`)

New keys under `articleContent.twoStatesAreEnough`:

- `switchAnalogyEyebrow`, `switchAnalogyPanelALabel`, `switchAnalogyPanelACaption`,
  `switchAnalogyPanelBLabel`, `switchAnalogyPanelBCaption`, `switchAnalogyTakeaway`
- `patternsInTheWildEyebrow`, `patternsInTheWildTile1Caption`, `patternsInTheWildTile2Caption`,
  `patternsInTheWildTile3Caption` (each caption is the full sentence naming the real products —
  no separate "pattern name" key, to avoid the awkward two-part i18n string for what's really one
  sentence per tile)
- `lightDarkIntro` (1 short sentence introducing the snippet, sits between the `implementationDriven`
  paragraph and the snippet itself), `lightDarkCaption` (the "no third slot" line under the code)

Edits to existing keys:

- `intro2`: "Everything below is real, not screenshots — play with it first." → "The toggles below
  are real, not screenshots — play with it first." (precision fix: `SwitchAnalogy`, the very next
  thing on the page, is a static analogy, not a real toggle, so the original wording overpromised)

No other existing keys change. Russian (`ru.json`) mirrors every new/edited key with the same
meaning, following the project's existing locale-parity convention (checked by the existing
locale-parity test).

## Document order (updated)

1. Intro (2 paragraphs, `intro2` tweaked)
2. `SwitchAnalogy` (new — the hook)
3. `CombinationGrid` (unchanged)
4. `PatternsInTheWild` (new — real-world grounding)
5. H2: The Tri-State Toggle Is Implementation-Driven UI (1 paragraph, unchanged)
6. `LightDarkSnippet` (new, with its 1-sentence intro)
7. `PatternGallery` (unchanged)
8. H2: Where Two-State Actually Gets Hard (unchanged)
9. H2: When Three States Still Earn Their Keep (unchanged)
10. Closing (unchanged)

## Files touched

```
src/content/articles/two-states-are-enough/
  Content.tsx                        insert 3 new components + lightDarkIntro paragraph, updated imports
  SwitchAnalogy/                     new
    SwitchAnalogy.tsx
    SwitchAnalogy.module.css
  PatternsInTheWild/                 new
    PatternsInTheWild.tsx
    PatternsInTheWild.module.css
  LightDarkSnippet/                  new
    LightDarkSnippet.tsx
    LightDarkSnippet.module.css
public/locales/en.json               new + edited twoStatesAreEnough.* keys
public/locales/ru.json               new + edited twoStatesAreEnough.* keys
```

No changes to `PatternGallery/`, `CombinationGrid/`, `articles.constants.ts`, `registry.ts`,
`eslint.config.mjs`, or the three existing heading `id`s (URLs/fragments stay stable) — the new
sections don't get their own headings, they sit as additional content inside/around the existing
`H2` blocks.

## Testing / validation

Same as prior revisions: `pnpm check-types && pnpm lint`, full `pnpm test` (locale-parity test
picks up the new keys automatically, constants tests are unaffected), manual browser verification
of all 3 new static sections plus the language switch, in an isolated worktree, merged back to
`main` the same way as prior revisions.
