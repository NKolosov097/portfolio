# Revision: interactive hook, live light-dark() demo, simultaneous pattern gallery

## Why

User feedback after reviewing the shipped hook/real-world-grounding/light-dark() revision:

1. `SwitchAnalogy` and `PatternsInTheWild` render as static illustrations - confirmed intentional
   for `PatternsInTheWild` (it stands in for real screenshots of other products, so it must stay
   inert). But `SwitchAnalogy` is the reader's very first hands-on moment on the page, and the
   site's whole ethos is "this is real, not a screenshot - play with it first"; a static hook
   undercuts that. It should become genuinely clickable.
2. The `light-dark()` section should explain more - specifically how `color-scheme` and
   `light-dark()` cooperate - and should include a live demo, not just a static code block: click
   a button to flip a simulated "native" theme, and a macOS-style mockup below (visually
   consistent with `CombinationGrid`'s window chrome) should react. Re-verified against MDN before
   committing to this: setting `color-scheme: light` or `color-scheme: dark` (a single explicit
   value, not `light dark`) on an element forces `light-dark()` to resolve to that branch for the
   element and its descendants, regardless of the OS preference. This means the demo can be
   **genuinely live** - the click sets `color-scheme` via an inline style, and the browser itself
   repaints every `light-dark()` value inside; no JavaScript computes a color. Both `color-scheme`
   and `light-dark()` are confirmed real, broadly-supported CSS features (Baseline widely available
   well before 2026).
3. `PatternGallery`'s tab UI (click a tab to swap which single pattern is visible) reads as
   redundant with `PatternsInTheWild`'s side-by-side layout, and hides the "same state, different
   affordance" point behind a click. Replace it: show all three controls (Button/Switch/Dropdown)
   at once, all wired to the same shared state as today, so operating any one visibly moves the
   other two plus the shared preview.

## Decisions made with the user

- `SwitchAnalogy`'s two panels get real interaction but stay decorative/unrelated to the site's
  actual theme (same constraint as before - no `localStorage`, no tie to the real toggle): Panel A's
  five percentages become real `<button>`s with click-to-select; Panel B's slider becomes a real
  `<input type="range">` with full native drag/keyboard support, styled to match the existing look.
- `LightDarkSnippet` is renamed to `LightDarkDemo` (directory rename) and gains: an eyebrow (for
  visual parity with sibling cards), a new explanatory paragraph about the `color-scheme` /
  `light-dark()` relationship, and a live interactive demo section below the existing code block
  and its existing "binary by construction" caption.
- `PatternGallery` drops `activePattern` state and the tab row entirely; all three controls
  (Button/Switch/Dropdown) render unconditionally in a row, each in its own small labelled tile,
  followed by the existing shared preview and state readout - no change to the underlying
  `matchMedia`/`localStorage` logic, only to which controls are visible at once.

## `SwitchAnalogy` (modified)

`src/content/articles/two-states-are-enough/SwitchAnalogy/SwitchAnalogy.tsx` (+ `.module.css`).

**New state:** `activeDialPercentage: number` (starts at a `DEFAULT_DIAL_PERCENTAGE = 50` constant,
replacing the old decorative `ACTIVE_DIAL_PERCENTAGE` constant) and `sliderValue: number` (starts
at a `DEFAULT_SLIDER_VALUE = 70` constant, replacing the old hardcoded `left: 70%` CSS position).
Both are local UI state - still no `localStorage`, no tie to the real site theme.

**Panel A:** the five `<span>`s become real `<button type="button">`s. Clicking one calls
`setActiveDialPercentage(percentage)`; `data-active` and a new `aria-pressed` both derive from
`percentage === activeDialPercentage`. The row gets `role="group"` with an `aria-label` reusing the
existing `switchAnalogyPanelALabel` copy (no new key needed for that).

**Panel B:** the `<div className={styles.sliderTrack}><span className={styles.sliderKnob} /></div>`
markup is replaced by a real `<input type="range" min={0} max={100} value={sliderValue}
onChange={...} />`, styled via CSS (`appearance: none` track + `::-webkit-slider-thumb` /
`::-moz-range-thumb` thumb rules) to keep the same visual weight as the old track/knob. It needs an
`aria-label` - new key `switchAnalogySliderLabel` (accessible name only, not rendered as visible
text).

Nothing else about the component changes: same card/eyebrow chrome, same takeaway line, same
`data-testid="switch-analogy"`.

## `LightDarkDemo` (renamed + expanded from `LightDarkSnippet`)

New directory: `src/content/articles/two-states-are-enough/LightDarkDemo/` (the old
`LightDarkSnippet/` directory is deleted).

**Card contents, top to bottom:**

1. New eyebrow (`lightDarkEyebrow`) - visual parity with every sibling card, all of which have one.
2. The existing 4-line CSS snippet, unchanged, still a literal (non-localized) string.
3. The existing `lightDarkCaption` ("Two arguments, no more...") - unchanged, unchanged position,
   directly under the code.
4. A new paragraph (`lightDarkMechanism`) explaining that `color-scheme` is the actual decision
   point - set it on any element and every `light-dark()` value inside inherits the choice - and
   that no media query or JavaScript color computation is involved. This sets up the demo below it.
5. **New interactive demo:** a toggle button (Sun/Moon icon, same visual pattern as
   `PatternGallery`'s button - reuses the existing `demoToggleToDark` / `demoToggleToLight` locale
   keys for its `aria-label`/`title`, since "switch to X" is exactly what it does) next to a small
   macOS-style mockup window (same visual vocabulary as `CombinationGrid`: `.window` / `.titlebar` /
   three `.trafficLight` dots / `.page` with two line placeholders - duplicated into this file's own
   CSS module, consistent with this codebase's per-file CSS Modules convention).
   - Local state: `simulatedNative: 'light' | 'dark'`, starting at `'light'`. Clicking the button
     flips it.
   - The mockup's outer `.window` element gets `style={{ colorScheme: simulatedNative }}` - a
     literal, single-value `color-scheme` override, which per the verified MDN behavior forces
     `light-dark()` resolution for every descendant regardless of the OS preference.
   - Inside this file's CSS module, `.titlebar`, `.page`, and `.pageLine`/`.pageLineShort` use
     `light-dark(...)` for their `background`/color values directly (not `data-theme` attribute
     selectors like `CombinationGrid` uses) - this is the whole point: the browser, not a CSS
     attribute selector switch, decides the color from the inherited `color-scheme`.
6. A closing caption (`lightDarkDemoCaption`) stating plainly that the browser - not JavaScript -
   is choosing the colors here.

**Accessibility/testability:** `data-testid="light-dark-demo"` on the card root (replaces
`light-dark-snippet`).

## `PatternGallery` (modified)

`src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.tsx` (+ `.module.css`).

**Removed:** the `activePattern` state, the `TPattern` type, the `PATTERNS` array, the
`TAB_LABEL_KEYS` lookup object, and the entire `role="tablist"` tab-button row. None of these are
needed once nothing is conditionally hidden.

**Unchanged:** `STORAGE_KEY`, `TThemeOverride`, `TResolvedTheme`, `isThemeOverride`, the
`osPrefersDark`/`override` state and the mount effect, `isMounted`, `resolvedTheme`, `handleCycle`,
`handleSwitchChange`, `handleSelectChange`, all label derivations (`lightLabel`, `darkLabel`,
`osLabel`, `resolvedLabel`, `overrideLabel`, `cycleLabel`) - the entire real state model is
untouched, only the render output changes.

**New render structure**, top to bottom inside the existing `.card`:

1. Eyebrow (unchanged).
2. **New `.controls` row** - three `.controlTile`s, always rendered (no conditional):
   - Tile 1: a small label (`t('articleContent.twoStatesAreEnough.demoTabButtonLabel')` - reusing
     the existing key as-is; the key name says "Tab" but the copy itself ("Button") is still
     accurate as a control-kind label) above the existing icon `<button>` (`handleCycle`).
   - Tile 2: a label (`demoTabSwitchLabel`, "Switch") above the existing Gravity UI `<Switch>`
     (`handleSwitchChange`).
   - Tile 3: a label (`demoTabDropdownLabel`, "Dropdown") above the existing `<ThemeDropdown>`
     (`handleSelectChange`).
     No new locale keys - the three existing tab-label keys are reused verbatim as tile captions.
3. The existing shared preview (`.preview`, `data-theme={resolvedTheme}`), moved to sit right after
   the controls row instead of before a single active control.
4. The existing state readout `<dl>` (OS preference / Your override / Resolved theme) - unchanged.
5. The existing closing caption (`demoCaption`) - unchanged.

Because all three controls read from the same `resolvedTheme`/`override` state and write through
the same three handlers, operating any one of them (e.g. dragging the Switch) immediately updates
the Button's icon, the Dropdown's selected value, the preview, and the state readout - this is the
whole point of the change, and requires no new state, only removing the code that hid two of the
three controls at a time.

**Accessibility/testability:** `data-testid="pattern-gallery"` unchanged.

## Content changes (`en.json` and `ru.json`)

New keys under `articleContent.twoStatesAreEnough`:

- `switchAnalogySliderLabel` - accessible name for the new range input.
- `lightDarkEyebrow`, `lightDarkMechanism`, `lightDarkDemoCaption` - new copy for the expanded
  `LightDarkDemo` card.

No existing keys change in this revision. `demoToggleToDark`/`demoToggleToLight` (already shipped)
are reused as-is by the new `LightDarkDemo` toggle button. `demoTabButtonLabel` /
`demoTabSwitchLabel` / `demoTabDropdownLabel` (already shipped) are reused as-is by `PatternGallery`
's new tile labels.

## Document order

Unchanged from the previous revision - this change only modifies what's inside three existing
slots (`SwitchAnalogy`, the light-dark card, `PatternGallery`), not their position in `Content.tsx`.
The only `Content.tsx` edit needed is updating the `LightDarkSnippet` → `LightDarkDemo` import path
and JSX tag name.

## Files touched

```
src/content/articles/two-states-are-enough/
  Content.tsx                                  update LightDarkSnippet -> LightDarkDemo import/tag
  SwitchAnalogy/
    SwitchAnalogy.tsx                           real button/range interaction
    SwitchAnalogy.module.css                    real button/range styles, drop track/knob rules
  LightDarkDemo/                                new (renamed from LightDarkSnippet/)
    LightDarkDemo.tsx
    LightDarkDemo.module.css
  LightDarkSnippet/                             deleted
  PatternGallery/
    PatternGallery.tsx                          drop tabs, render all 3 controls at once
    PatternGallery.module.css                   drop .tabs/.tab rules, add .controls/.controlTile
public/locales/en.json                          4 new keys (see above)
public/locales/ru.json                          4 new keys (see above)
```

No changes to `CombinationGrid/`, `PatternsInTheWild/`, `ThemeDropdown/`, `articles.constants.ts`,
`registry.ts`, `eslint.config.mjs`, or any heading `id` (URLs/fragments stay stable). No new
ESLint override is needed: `SwitchAnalogy` and `LightDarkDemo` still don't read `matchMedia`/
`localStorage` in a mount effect (their new state is purely local UI state, initialized
synchronously, no hydration-mismatch concern), and `PatternGallery` already has its existing
justified override, which doesn't need to change.

## Testing / validation

Same as prior revisions: `pnpm check-types && pnpm lint`, full `pnpm test` (locale-parity test
picks up the 4 new keys automatically), manual browser verification (dial buttons, slider drag, the
`color-scheme` demo actually repainting, and all three `PatternGallery` controls staying in sync)
in an isolated worktree, merged back to `main` the same way as prior revisions.
