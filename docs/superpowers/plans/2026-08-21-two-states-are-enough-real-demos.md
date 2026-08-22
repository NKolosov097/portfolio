# Two States Are Enough — Real Brightness Preview, Fixed light-dark() Demo, Patterns-Styled Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `SwitchAnalogy`'s buttons/slider drive a visible brightness preview, fix `LightDarkDemo`'s toggle (currently a no-op due to a Lightning CSS build bug) so it genuinely repaints, and restyle `PatternGallery`'s three controls to look like the real-world patterns shown in `PatternsInTheWild` instead of generic UI-kit primitives.

**Architecture:** Three independent, contained changes inside `src/content/articles/two-states-are-enough/`. No new npm dependency, no new state model beyond what already exists. `SwitchAnalogy` and `LightDarkDemo` get small additive changes to existing files. `PatternGallery` gets a render/style rewrite that keeps its entire existing state model (`matchMedia` + `localStorage`) untouched, and its `ThemeDropdown/` sub-component is deleted (last consumer removed).

**Tech Stack:** Next.js App Router (Turbopack/Lightning CSS), React 19, TypeScript (strict), react-i18next, CSS Modules, Vitest.

## Global Constraints

- Strict TypeScript: no `any`, no type assertions (`as`); use type guards/discriminated unions instead. Boolean identifiers prefixed `is`/`has`.
- JSDoc on interface/type fields, component props, and non-`useState` variables — one line, states the non-obvious reason only.
- Comments elsewhere: 1-2 lines max, state the _why_, not the _what_.
- True module-level constants in `UPPER_SNAKE_CASE`.
- Each component in its own directory with a separate `.module.css` file.
- Stable `data-testid` (no random selectors).
- Destructure function params/callback args/object fields over repeated dotted access.
- `SwitchAnalogy`'s brightness swatches are purely decorative (`aria-hidden="true"`) — the buttons/slider that drive them already expose their value accessibly; do not add new locale keys for them.
- `LightDarkDemo`'s fix must not touch the project-wide `browserslist` config (`package.json`) — the fix is scoped to this one component, via inline `style` objects that bypass Lightning CSS's build-time `light-dark()` polyfill.
- `PatternGallery`'s underlying real state model (`matchMedia` + `localStorage`, `handleCycle`/`handleSwitchChange`/`handleSelectChange` branching) must not change — only the markup/styling of the three controls changes.
- Once `ThemeDropdown/` has no consumers, delete the whole directory and its now-unused `demoSelectLabel` locale key — don't leave dead code or dead copy behind.
- Commits must not include a `Co-Authored-By` trailer.
- Run `pnpm check-types && pnpm lint` before considering the change complete.
- If formatting needs fixing, run `npx prettier --write <exact file path(s) touched by this task>` — never `pnpm format` (repo-wide) — scope every formatting fix to the files the task actually touches.

---

### Task 1: Locale copy (EN + RU) — rename the dropdown label, drop the dead select label

**Files:**

- Modify: `public/locales/en.json`
- Modify: `public/locales/ru.json`
- Test: `src/configs/i18n/locales.test.ts` (already generic — no edits, just re-run)

**Interfaces:**

- Produces: `articleContent.twoStatesAreEnough.demoTabSegmentedLabel` — consumed by Task 4
  (`PatternGallery`). Removes `articleContent.twoStatesAreEnough.demoTabDropdownLabel` and
  `articleContent.twoStatesAreEnough.demoSelectLabel` (both become unused once `ThemeDropdown/` is
  deleted in Task 4).

- [ ] **Step 1: Rename the key and drop the dead one in `en.json`**

Find these two lines inside the `"twoStatesAreEnough"` object:

```json
      "demoTabDropdownLabel": "Dropdown",
      "demoSelectLabel": "Theme",
```

Replace with:

```json
      "demoTabSegmentedLabel": "Segments",
```

- [ ] **Step 2: Make the matching edit in `ru.json`**

Find:

```json
      "demoTabDropdownLabel": "Dropdown",
      "demoSelectLabel": "Тема",
```

Replace with:

```json
      "demoTabSegmentedLabel": "Сегменты",
```

- [ ] **Step 3: Validate JSON and run the locale parity test**

Run: `pnpm test -- locales`
Expected: PASS — `demoTabSegmentedLabel` exists in both locales with matching structure, and no
leftover reference to the removed keys breaks the suite (the suite only checks key parity between
the two files, not usage — Task 4 removes the actual code references).

- [ ] **Step 4: Commit**

```bash
git add public/locales/en.json public/locales/ru.json
git commit -m "feat: rename PatternGallery's dropdown label to segments"
```

---

### Task 2: `SwitchAnalogy` — live brightness swatches

**Files:**

- Modify: `src/content/articles/two-states-are-enough/SwitchAnalogy/SwitchAnalogy.tsx`
- Modify: `src/content/articles/two-states-are-enough/SwitchAnalogy/SwitchAnalogy.module.css`

**Interfaces:**

- Consumes: only already-shipped locale keys (no Task 1 dependency).
- Produces: `SwitchAnalogy` (default + named export, unchanged signature — still no props),
  consumed by `Content.tsx` exactly as before (no import change).

- [ ] **Step 1: Add a swatch after Panel A's dial row**

In `SwitchAnalogy.tsx`, find:

```tsx
<p className={styles.panelCaption}>
  {t('articleContent.twoStatesAreEnough.switchAnalogyPanelACaption')}
</p>
```

Replace with:

```tsx
          <div
            className={styles.swatch}
            aria-hidden="true"
            style={{ backgroundColor: `hsl(0 0% ${activeDialPercentage}%)` }}
          />
          <p className={styles.panelCaption}>
            {t('articleContent.twoStatesAreEnough.switchAnalogyPanelACaption')}
          </p>
```

- [ ] **Step 2: Add a swatch after Panel B's slider**

Find:

```tsx
<p className={styles.panelCaption}>
  {t('articleContent.twoStatesAreEnough.switchAnalogyPanelBCaption')}
</p>
```

Replace with:

```tsx
          <div
            className={styles.swatch}
            aria-hidden="true"
            style={{ backgroundColor: `hsl(0 0% ${sliderValue}%)` }}
          />
          <p className={styles.panelCaption}>
            {t('articleContent.twoStatesAreEnough.switchAnalogyPanelBCaption')}
          </p>
```

(Both edits target text that appears once each in the file, so each replacement is unambiguous.)

- [ ] **Step 3: Add the `.swatch` rule**

In `SwitchAnalogy.module.css`, find:

```css
.panelCaption {
  margin: 0;
  font-size: 0.75rem;
  color: rgb(255 255 255 / 55%);
}
```

Replace with:

```css
.swatch {
  flex: none;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 0.5rem;
}

.panelCaption {
  margin: 0;
  font-size: 0.75rem;
  color: rgb(255 255 255 / 55%);
}
```

- [ ] **Step 4: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 5: Manual verification in the browser**

Run: `pnpm dev`
Visit `http://localhost:3000/articles/two-states-are-enough` and confirm:

- Clicking each of the five dial buttons (10/30/50/70/100%) snaps Panel A's swatch to a visibly
  different shade of gray (10% = nearly black, 100% = white).
- Dragging Panel B's slider continuously changes its swatch's shade in real time as you drag, not
  just on release.

Stop the dev server once confirmed.

- [ ] **Step 6: Commit**

```bash
git add src/content/articles/two-states-are-enough/SwitchAnalogy
git commit -m "feat: give SwitchAnalogy's panels a live brightness preview"
```

---

### Task 3: `LightDarkDemo` — fix the light-dark() build bug

**Files:**

- Modify: `src/content/articles/two-states-are-enough/LightDarkDemo/LightDarkDemo.tsx`
- Modify: `src/content/articles/two-states-are-enough/LightDarkDemo/LightDarkDemo.module.css`

**Interfaces:**

- Consumes: nothing new.
- Produces: `LightDarkDemo` (default + named export, unchanged signature), consumed by
  `Content.tsx` exactly as before.

**Root cause (confirmed by running the dev server and inspecting the compiled CSS with
Playwright):** Lightning CSS rewrites `background: light-dark(#fff, #1e1e1e)` in `.module.css`
files into `background: var(--lightningcss-light, #fff) var(--lightningcss-dark, #1e1e1e)` because
the project's shared `browserslist` includes browsers without native `light-dark()` support. That
polyfill resolves from the OS-level `prefers-color-scheme` media query, not from the element's
`color-scheme` — so the demo's toggle button (which only sets `color-scheme` via inline style) has
no visible effect. Moving the affected declarations to inline `style` objects in the TSX sidesteps
Lightning CSS entirely (inline `style` strings are never run through the CSS build), so the browser
evaluates `light-dark()` natively.

- [ ] **Step 1: Add the inline style constants**

In `LightDarkDemo.tsx`, find:

```tsx
/** The three macOS traffic-light colors, in their fixed left-to-right order — never themed, just decoration. */
const TRAFFIC_LIGHTS: string[] = ['red', 'yellow', 'green']
```

Replace with:

```tsx
/** The three macOS traffic-light colors, in their fixed left-to-right order — never themed, just decoration. */
const TRAFFIC_LIGHTS: string[] = ['red', 'yellow', 'green']

/**
 * light-dark() values that must stay out of the CSS module: Lightning CSS rewrites light-dark() in
 * .module.css files into a prefers-color-scheme-driven fallback (this project's browserslist
 * includes browsers without native support), which ignores the color-scheme this demo sets and
 * breaks the toggle. Inline style strings bypass that build step entirely.
 */
const TITLEBAR_STYLE = { background: 'light-dark(#e4e4e2, #2c2c2e)' }
const PAGE_STYLE = { background: 'light-dark(#fff, #1e1e1e)' }
const PAGE_LINE_STYLE = { background: 'light-dark(rgb(0 0 0 / 15%), rgb(255 255 255 / 20%))' }
```

- [ ] **Step 2: Apply the inline styles to the mockup markup**

Find:

```tsx
<div className={styles.window} style={{ colorScheme: simulatedNative }}>
  <span className={styles.titlebar}>
    {TRAFFIC_LIGHTS.map((color) => (
      <span key={color} className={styles.trafficLight} data-color={color} />
    ))}
  </span>
  <span className={styles.page}>
    <span className={styles.pageLine} />
    <span className={styles.pageLineShort} />
  </span>
</div>
```

Replace with:

```tsx
<div className={styles.window} style={{ colorScheme: simulatedNative }}>
  <span className={styles.titlebar} style={TITLEBAR_STYLE}>
    {TRAFFIC_LIGHTS.map((color) => (
      <span key={color} className={styles.trafficLight} data-color={color} />
    ))}
  </span>
  <span className={styles.page} style={PAGE_STYLE}>
    <span className={styles.pageLine} style={PAGE_LINE_STYLE} />
    <span className={styles.pageLineShort} style={PAGE_LINE_STYLE} />
  </span>
</div>
```

- [ ] **Step 3: Remove the now-redundant `background` declarations from the CSS module**

In `LightDarkDemo.module.css`, find:

```css
.titlebar {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.5rem;
  background: light-dark(#e4e4e2, #2c2c2e);
}
```

Replace with:

```css
.titlebar {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.5rem;
}
```

Find:

```css
.page {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.7rem 0.55rem;
  background: light-dark(#fff, #1e1e1e);
}

.pageLine,
.pageLineShort {
  display: block;
  height: 0.3rem;
  border-radius: 2px;
  background: light-dark(rgb(0 0 0 / 15%), rgb(255 255 255 / 20%));
}
```

Replace with:

```css
.page {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.7rem 0.55rem;
}

.pageLine,
.pageLineShort {
  display: block;
  height: 0.3rem;
  border-radius: 2px;
}
```

- [ ] **Step 4: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 5: Manual verification — confirm the actual repaint, not just no crash**

Run: `pnpm dev`
Visit `http://localhost:3000/articles/two-states-are-enough` and confirm:

- Clicking the sun/moon toggle now visibly flips the mock window's titlebar and page background
  between light and dark colors (this was the broken behavior — must visibly change now).
- Open DevTools → Elements on the `.titlebar`/`.page`/`.pageLine` elements and confirm their
  `style` attribute contains the literal `background: light-dark(...)` string (proving the browser,
  not a media query, is resolving the color).

To directly confirm the root cause is fixed (optional but recommended), inspect the compiled CSS
served for this route (e.g. via DevTools → Network → the `.css` chunk, or `curl` the page and grep
the linked stylesheet) and confirm no `--lightningcss-light`/`--lightningcss-dark` variable remains
for `.titlebar`/`.page`/`.pageLine`/`.pageLineShort` — those three `background` declarations should
no longer appear in the compiled CSS at all (they're inline now).

Stop the dev server once confirmed.

- [ ] **Step 6: Commit**

```bash
git add src/content/articles/two-states-are-enough/LightDarkDemo
git commit -m "fix: make LightDarkDemo's toggle actually repaint the mockup window"
```

---

### Task 4: `PatternGallery` — restyle controls to match `PatternsInTheWild`, delete `ThemeDropdown`

**Files:**

- Modify: `src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.tsx`
- Modify: `src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.module.css`
- Delete: `src/content/articles/two-states-are-enough/PatternGallery/ThemeDropdown/ThemeDropdown.tsx`
- Delete: `src/content/articles/two-states-are-enough/PatternGallery/ThemeDropdown/ThemeDropdown.module.css`

**Interfaces:**

- Consumes: `articleContent.twoStatesAreEnough.demoTabSegmentedLabel` (Task 1), plus already-shipped
  `demoTabButtonLabel`/`demoTabSwitchLabel`/`demoLight`/`demoDark`/`demoSystem` and everything else
  already used by this component.
- Produces: `PatternGallery` (default + named export, unchanged signature), consumed by
  `Content.tsx` exactly as before (no import change).

- [ ] **Step 1: Replace the component**

Replace the entire contents of
`src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.tsx` with:

```tsx
'use client'

import styles from './PatternGallery.module.css'

import { useEffect, useState } from 'react'
import { Icon, Switch } from '@gravity-ui/uikit'
import { Moon, Sun } from '@gravity-ui/icons'
import { useTranslation } from 'react-i18next'

/** This demo's own localStorage key — scoped to the demo only, unrelated to the site's own (dark-only) theme. */
const STORAGE_KEY = 'demo-theme-override'

/** The user's explicit choice, or `null` when following the OS preference. */
type TThemeOverride = 'light' | 'dark' | null

/** What's actually rendered — always exactly one of these two. */
type TResolvedTheme = 'light' | 'dark'

/** The segmented control's own value space — an explicit shade, or the literal `'system'` option. */
type TSegmentValue = 'light' | 'dark' | 'system'

/** The three segments, in display order — same trio `PatternsInTheWild` illustrates as a static mockup. */
const SEGMENT_OPTIONS: TSegmentValue[] = ['light', 'dark', 'system']

const isThemeOverride = (value: string | null): value is Exclude<TThemeOverride, null> =>
  value === 'light' || value === 'dark'

export const PatternGallery = () => {
  const { t } = useTranslation()
  const [osPrefersDark, setOsPrefersDark] = useState<boolean | null>(null)
  const [override, setOverride] = useState<TThemeOverride>(null)

  // matchMedia and localStorage don't exist during SSR; reading them only after mount
  // keeps the first client render identical to the server-rendered placeholder.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setOsPrefersDark(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => setOsPrefersDark(event.matches)
    mediaQuery.addEventListener('change', handleChange)

    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isThemeOverride(stored)) {
      setOverride(stored)
    }

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  /** Stays neutral for one frame instead of guessing, until the client-only read above resolves. */
  const isMounted = osPrefersDark !== null
  const resolvedTheme: TResolvedTheme = override ?? (osPrefersDark ? 'dark' : 'light')

  /** The Button pattern's 2-press cycle: press 1 overrides to the opposite shade, press 2 clears back to system. */
  const handleCycle = () => {
    if (override === null) {
      const next: TResolvedTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
      setOverride(next)
      window.localStorage.setItem(STORAGE_KEY, next)
    } else {
      setOverride(null)
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  /** A real switch has only two positions, so — unlike Button — it always sets an explicit override; it can't hand you back to "system". Checked (on) means light, mirroring a physical light switch. */
  const handleSwitchChange = (checked: boolean) => {
    const next: TResolvedTheme = checked ? 'light' : 'dark'
    setOverride(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  /** The segmented pattern sets state directly instead of cycling — that's the whole tradeoff it's here to show. */
  const handleSegmentChange = (value: TSegmentValue) => {
    if (value === 'system') {
      setOverride(null)
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      setOverride(value)
      window.localStorage.setItem(STORAGE_KEY, value)
    }
  }

  const lightLabel = t('articleContent.twoStatesAreEnough.demoLight')
  const darkLabel = t('articleContent.twoStatesAreEnough.demoDark')
  const systemLabel = t('articleContent.twoStatesAreEnough.demoSystem')
  const osLabel = osPrefersDark ? darkLabel : lightLabel
  const resolvedLabel = resolvedTheme === 'dark' ? darkLabel : lightLabel
  const overrideLabel =
    override === null
      ? t('articleContent.twoStatesAreEnough.demoOverrideNone')
      : override === 'dark'
        ? darkLabel
        : lightLabel
  const cycleLabel =
    resolvedTheme === 'dark'
      ? t('articleContent.twoStatesAreEnough.demoToggleToLight')
      : t('articleContent.twoStatesAreEnough.demoToggleToDark')
  const segmentedLabel = t('articleContent.twoStatesAreEnough.demoTabSegmentedLabel')
  const activeSegment: TSegmentValue = isMounted ? (override ?? 'system') : 'system'

  const segmentLabel = (option: TSegmentValue): string =>
    option === 'light' ? lightLabel : option === 'dark' ? darkLabel : systemLabel

  return (
    <div className={styles.card} data-testid="pattern-gallery">
      <p className={styles.eyebrow}>{t('articleContent.twoStatesAreEnough.demoEyebrow')}</p>

      <div className={styles.controls}>
        <div className={styles.controlTile}>
          <p className={styles.controlLabel}>
            {t('articleContent.twoStatesAreEnough.demoTabButtonLabel')}
          </p>
          <button
            type="button"
            className={styles.toggleButton}
            onClick={handleCycle}
            disabled={!isMounted}
            aria-label={cycleLabel}
            title={cycleLabel}
          >
            <Icon data={resolvedTheme === 'dark' ? Sun : Moon} size={20} />
          </button>
        </div>

        <div className={styles.controlTile}>
          <p className={styles.controlLabel}>{segmentedLabel}</p>
          <div className={styles.segmented} role="group" aria-label={segmentedLabel}>
            {SEGMENT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={styles.segment}
                data-active={option === activeSegment}
                aria-pressed={option === activeSegment}
                disabled={!isMounted}
                onClick={() => handleSegmentChange(option)}
              >
                {segmentLabel(option)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlTile}>
          <p className={styles.controlLabel}>
            {t('articleContent.twoStatesAreEnough.demoTabSwitchLabel')}
          </p>
          <div className={styles.settingsRow}>
            <Switch
              checked={isMounted && resolvedTheme === 'light'}
              onUpdate={handleSwitchChange}
              disabled={!isMounted}
              content={isMounted ? resolvedLabel : undefined}
            />
          </div>
        </div>
      </div>

      <div className={styles.preview} data-theme={isMounted ? resolvedTheme : undefined}>
        <p className={styles.previewHeading}>
          {t('articleContent.twoStatesAreEnough.demoPreviewHeading')}
        </p>
        <p className={styles.previewBody}>
          {t('articleContent.twoStatesAreEnough.demoPreviewBody')}
        </p>
      </div>

      <dl className={styles.state}>
        <div className={styles.stateRow}>
          <dt className={styles.stateLabel}>
            {t('articleContent.twoStatesAreEnough.demoOsPreferenceLabel')}
          </dt>
          <dd className={styles.stateValue}>{isMounted ? osLabel : '—'}</dd>
        </div>
        <div className={styles.stateRow}>
          <dt className={styles.stateLabel}>
            {t('articleContent.twoStatesAreEnough.demoOverrideLabel')}
          </dt>
          <dd className={styles.stateValue}>{isMounted ? overrideLabel : '—'}</dd>
        </div>
        <div className={styles.stateRow}>
          <dt className={styles.stateLabel}>
            {t('articleContent.twoStatesAreEnough.demoResolvedLabel')}
          </dt>
          <dd className={styles.stateValue}>{isMounted ? resolvedLabel : '—'}</dd>
        </div>
      </dl>

      <p className={styles.caption}>{t('articleContent.twoStatesAreEnough.demoCaption')}</p>
    </div>
  )
}

export default PatternGallery
```

- [ ] **Step 2: Add the segmented-pill and settings-row styles**

In `PatternGallery.module.css`, find:

```css
.controlLabel {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(255 255 255 / 55%);
}
```

Replace with:

```css
.controlLabel {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(255 255 255 / 55%);
}

.segmented {
  display: flex;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 999px;
}

.segment {
  padding: 0.35rem 0.6rem;
  font: inherit;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgb(255 255 255 / 55%);
  cursor: pointer;
  background: none;
  border: none;
  transition:
    background-color 0.15s ease-out,
    color 0.15s ease-out;
}

.segment:hover:not(:disabled) {
  color: rgb(255 255 255 / 80%);
}

.segment[data-active='true'] {
  color: #111;
  background: rgb(255 255 255 / 85%);
}

.segment:focus-visible {
  outline: 2px solid var(--g-color-line-brand);
  outline-offset: 2px;
}

.segment:disabled {
  cursor: default;
  opacity: 0.5;
}

.settingsRow {
  display: flex;
  align-items: center;
  padding: 0.6rem 0.9rem;
  background: rgb(255 255 255 / 4%);
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 0.75rem;
}
```

- [ ] **Step 3: Delete the now-unused `ThemeDropdown`**

```bash
git rm -r src/content/articles/two-states-are-enough/PatternGallery/ThemeDropdown
```

- [ ] **Step 4: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS. (`check-types` will fail loudly if any stale `ThemeDropdown`/`TDropdownValue`
import survives anywhere.)

- [ ] **Step 5: Manual verification in the browser**

Run: `pnpm dev`
Visit `http://localhost:3000/articles/two-states-are-enough` and confirm:

- The "Попробуй сам" card shows three tiles: the icon button, a Light/Dark/System segmented pill
  (no dropdown menu), and a bordered row containing the Switch — visually resembling the three
  `PatternsInTheWild` tiles above it, not the old Button/Switch/Dropdown-with-debug-table look.
- Clicking the icon button updates the segmented pill's active segment, the Switch's position, the
  preview background, and the state readout below — all at once.
- Toggling the Switch likewise updates the icon button's icon, the segmented pill, the preview, and
  the readout.
- Clicking "System" in the segmented pill clears the override and returns everything to match the
  OS preference.
- Reloading the page preserves whichever override was last set (real `localStorage`, unchanged
  behavior).

Stop the dev server once confirmed.

- [ ] **Step 6: Commit**

```bash
git add src/content/articles/two-states-are-enough/PatternGallery
git commit -m "feat: restyle PatternGallery's controls to match the real-world patterns shown above it"
```

---

### Task 5: Final validation

**Files:** none (verification only)

- [ ] **Step 1: Full type-check and lint**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 2: Full unit test suite**

Run: `pnpm test`
Expected: PASS, including `src/configs/i18n/locales.test.ts` covering the renamed key.

- [ ] **Step 3: Confirm no leftover references to removed identifiers**

Run: `grep -rn "ThemeDropdown\|TDropdownValue\|demoTabDropdownLabel\|demoSelectLabel" src public/locales`
Expected: no output. If anything matches, it's a leftover from Task 4 that must be cleaned up before
this plan is considered done.

- [ ] **Step 4: Confirm README still matches reality**

`README.md` describes the article architecture generically (no per-article enumeration or
component count). Skim the "Project structure" and "Architecture" sections to confirm nothing there
references `ThemeDropdown` or `PatternGallery`'s old control set; no edit is expected.
