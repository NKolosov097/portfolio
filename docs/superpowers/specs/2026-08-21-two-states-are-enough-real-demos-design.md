# Revision: live brightness preview, fixed light-dark() demo, patterns-styled gallery controls

## Why

User feedback after using the shipped interactivity revision (`2026-08-18-two-states-are-enough-interactivity-design.md`):

1. `SwitchAnalogy`'s five buttons and slider already update local state (confirmed by reading the
   code), but nothing else in the block visibly reacts — clicking a button only re-styles that
   button, dragging the slider only moves its own thumb. From a reader's point of view that reads
   as "nothing happens." The two panels are both about *brightness*; the fix is to make that
   brightness actually visible.
2. `LightDarkDemo`'s toggle button is a **real, reproduced bug**, not a perception problem.
   Verified by running the dev server and driving it with Playwright: the compiled CSS for
   `LightDarkDemo.module.css` shows `background: light-dark(#fff, #1e1e1e)` was rewritten at build
   time to `background: var(--lightningcss-light, #fff) var(--lightningcss-dark, #1e1e1e)`. This is
   Lightning CSS's fallback for browsers without native `light-dark()` support, triggered because
   the shared `browserslist` (`@gravity-ui/browserslist-config`: `"last 3 years and fully supports
   es6..."`, plus `Firefox ESR`) includes browsers old enough to lack it. Crucially, this fallback
   resolves `--lightningcss-light`/`--lightningcss-dark` from the OS-level `prefers-color-scheme`
   media query, **not** from the element's `color-scheme` property — so the button's
   `style={{ colorScheme: simulatedNative }}` has zero effect on the compiled output. Confirmed with
   computed-style dumps: `.window`'s `color-scheme` correctly flips `light`↔`dark` on click, but the
   child `.page`'s `background-color` stays fixed regardless. No `@supports` progressive-enhancement
   block is emitted either, so this is broken for every visitor, not just old browsers.
3. Per user's confirmed answer, "Форма, которую ты уже видел" (`PatternsInTheWild` — static
   Tailwind-docs/VitePress/Bluesky-style mockups) is correct and stays static by design. The actual
   ask is that `PatternGallery`'s ("Попробуй сам") three controls should visually **look like**
   those same real-world patterns instead of a generic Button/Switch/Dropdown-plus-debug-table
   panel, while keeping their existing live state wiring.

## Decisions made with the user

- `SwitchAnalogy`: add one small "brightness swatch" per panel, driven directly by existing state
  (`activeDialPercentage` / `sliderValue`) — no new state, no new handlers. Panel A's swatch snaps
  between the five fixed values (inherent to only five buttons existing); Panel B's swatch tracks
  the slider continuously. Grayscale lightness (`hsl(0 0% {value}%)`) reads literally as "brightness."
  Purely decorative (`aria-hidden`), since the driving controls already expose their value
  accessibly (buttons' own text, the range input's native value).
- `LightDarkDemo`: move only the `light-dark()`-dependent declarations (titlebar background, page
  background, page-line background) from the CSS module into inline `style` objects computed in the
  TSX. Inline `style` attributes are plain runtime strings — Next.js/Lightning CSS never processes
  them — so the browser's own CSS engine evaluates `light-dark()` natively, restoring the
  `color-scheme`-driven behavior the demo is supposed to show. No change to the site-wide
  `browserslist` target (too broad a blast radius for one demo).
- `PatternGallery`: keep all existing state/handlers (`handleCycle`, `handleSwitchChange`,
  `handleSelectChange`, `resolvedTheme`, etc.) untouched; only restyle the three controls to reuse
  the exact visual language of `PatternsInTheWild`'s three tiles:
  - Icon-button control (`handleCycle`) → already matches `PatternsInTheWild`'s icon-button tile;
    only minor visual alignment, no logic change.
  - Dropdown control (`handleSelectChange`, three-way light/dark/system) → replaced with a real,
    always-visible segmented pill (three `<button>`s), reusing `PatternsInTheWild`'s segmented-pill
    look. This is a UX simplification too (no menu to open) and a true 1:1 match: both are
    inherently three-state. `ThemeDropdown/` becomes unused and is deleted.
  - Switch control (`handleSwitchChange`, two-way light/dark) → kept as the real Gravity UI
    `Switch` (it has no "system" state, so it can't become the segmented pill), but its tile is
    restyled as a settings-row (label left, dot-style accent, control right) matching
    `PatternsInTheWild`'s settings-panel tile.
  - The shared preview box and the state `<dl>` readout are unchanged — not part of the user's
    complaint.
- `demoTabDropdownLabel` copy is renamed in meaning (still describes "which control kind"): since
  the control is no longer a dropdown, the key is renamed to `demoTabSegmentedLabel` with copy
  "Сегменты" / "Segments". `demoTabButtonLabel` and `demoTabSwitchLabel` keep their existing keys
  and copy — both still literally a button and a switch.

## `SwitchAnalogy` (modified)

`src/content/articles/two-states-are-enough/SwitchAnalogy/SwitchAnalogy.tsx` (+ `.module.css`).

No new state. After the dial row in Panel A and after the range input in Panel B, add:

```tsx
<div className={styles.swatch} aria-hidden="true" style={{ backgroundColor: `hsl(0 0% ${activeDialPercentage}%)` }} />
```

and the slider equivalent using `sliderValue`. New `.swatch` CSS rule: small rounded square (e.g.
`2.5rem × 2.5rem`), `border: 1px solid rgb(255 255 255 / 20%)` (matches existing button borders),
`border-radius: 0.5rem`, `flex: none`. Placed between the control row and `.panelCaption` in each
panel via the existing `.panel` flex column, so it picks up the existing `gap`. No new locale keys
(the swatches are `aria-hidden`, purely visual reinforcement of state the buttons/slider already
expose accessibly).

## `LightDarkDemo` (modified)

`src/content/articles/two-states-are-enough/LightDarkDemo/LightDarkDemo.tsx` (+ `.module.css`).

Root cause fix only — no behavioral or copy changes. In `LightDarkDemo.module.css`, remove the
`background` declarations from `.titlebar`, `.page`, and the shared `.pageLine, .pageLineShort`
rule (keep all their other properties — layout, sizing — in the CSS module). In `LightDarkDemo.tsx`,
compute three small style objects from `simulatedNative` and pass them as the `style` prop on the
corresponding elements, e.g.:

```tsx
const titlebarStyle = { background: 'light-dark(#e4e4e2, #2c2c2e)' }
const pageStyle = { background: 'light-dark(#fff, #1e1e1e)' }
const pageLineStyle = { background: 'light-dark(rgb(0 0 0 / 15%), rgb(255 255 255 / 20%))' }
```

These are static objects (colors don't depend on `simulatedNative` — only `.window`'s
`color-scheme` does), so they can be module-level constants, not memoized per render. Applied via
`style={pageStyle}` alongside the existing `className`. This keeps the pedagogical point intact
(colors are still resolved by the browser from `light-dark()` + `color-scheme`, now for real)
without touching the project-wide `browserslist` target.

## `PatternGallery` (modified) — restyled to match `PatternsInTheWild`

`src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.tsx` (+ `.module.css`).
`ThemeDropdown/` directory deleted (only consumer).

**Unchanged:** `STORAGE_KEY`, `TThemeOverride`, `TResolvedTheme`, `isThemeOverride`, the
`osPrefersDark`/`override` state and mount effect, `isMounted`, `resolvedTheme`, `handleCycle`,
`handleSwitchChange`, `handleSelectChange` (now takes the override value directly instead of a
`TDropdownValue` import — same three-branch logic, no import from the deleted `ThemeDropdown`), all
label derivations.

**Control 1 (icon button, `handleCycle`):** unchanged markup/logic; minor visual pass so its sizing
matches `PatternsInTheWild`'s `.iconButton` (already close — both circular, translucent background).

**Control 2 (segmented pill, replaces `ThemeDropdown`, `handleSelectChange`):** three real
`<button type="button">`s inside a `.segmented` pill container (styles duplicated from
`PatternsInTheWild.module.css`'s `.segmented`/`.segment` into `PatternGallery.module.css`, per this
codebase's per-file CSS Modules convention), labelled with the existing `demoLight`/`demoDark`/
`demoSystem` keys. `data-active` is `true` for whichever of `'light' | 'dark' | 'system'` matches
`isMounted ? (override ?? 'system') : 'system'`. Clicking a segment calls `handleSelectChange` with
`'light' | 'dark'` directly, or clears the override for the `'system'` segment — identical branching
to the old `handleSelectChange`, just invoked from three buttons instead of a select menu. Each
button gets `disabled={!isMounted}` and `aria-pressed`.

**Control 3 (settings row, wraps the existing `Switch`, `handleSwitchChange`):** the existing
`<Switch>` (unchanged props/logic) is now wrapped in a `.settingsRow`-style container (label left,
switch right, subtle heading above reusing the tile's existing `demoTabSwitchLabel`), visually
consistent with `PatternsInTheWild`'s settings-panel tile (styles duplicated similarly, minus the
dot indicator since a real `Switch` already shows its own on/off state).

**Rendering order and everything below the controls row** (shared preview, state `<dl>`, closing
caption) — unchanged.

## Content changes (`en.json` and `ru.json`)

- Rename `demoTabDropdownLabel` → `demoTabSegmentedLabel`. New copy: en `"Segments"`, ru
  `"Сегменты"` (was `"Dropdown"` in both locales — describes the control kind, which changed).
- No other key changes. `demoTabButtonLabel`, `demoTabSwitchLabel`, `demoLight`, `demoDark`,
  `demoSystem` are reused as-is. `SwitchAnalogy`'s swatches and `LightDarkDemo`'s fix need no new
  copy.

## Files touched

```
src/content/articles/two-states-are-enough/
  SwitchAnalogy/
    SwitchAnalogy.tsx                           add two aria-hidden brightness swatches
    SwitchAnalogy.module.css                    add .swatch rule
  LightDarkDemo/
    LightDarkDemo.tsx                           inline style objects for light-dark() colors
    LightDarkDemo.module.css                    remove the 3 background rules moved to inline style
  PatternGallery/
    PatternGallery.tsx                          segmented pill + settings-row layout, drop ThemeDropdown import
    PatternGallery.module.css                   add .segmented/.segment, .settingsRow styles
    ThemeDropdown/                              deleted (only consumer removed)
public/locales/en.json                          rename demoTabDropdownLabel -> demoTabSegmentedLabel
public/locales/ru.json                          rename demoTabDropdownLabel -> demoTabSegmentedLabel
```

No changes to `Content.tsx`, `CombinationGrid/`, `PatternsInTheWild/`, `articles.constants.ts`, or
any heading `id`.

## Testing / validation

`pnpm check-types && pnpm lint`, full `pnpm test` (locale-parity test picks up the renamed key
automatically — both locale files must define it or the test fails). Manual browser verification in
an isolated worktree: `SwitchAnalogy` swatches visibly change shade on button click and slider drag;
`LightDarkDemo`'s mock window visibly repaints between light/dark on click (re-check the compiled
CSS for that module to confirm no `--lightningcss-*` variable remains for the moved declarations);
all three `PatternGallery` controls stay in sync and visually resemble their `PatternsInTheWild`
counterparts.
