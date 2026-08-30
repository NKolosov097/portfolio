# Two States Are Enough - Interactive Hook, Live light-dark() Demo, Simultaneous Pattern Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `SwitchAnalogy`'s two panels genuinely clickable/draggable, replace the static `light-dark()` code block with a card that also explains `color-scheme` and includes a live (non-simulated) demo, and replace `PatternGallery`'s tab UI with all three controls always visible and sharing one state.

**Architecture:** All three changes are contained rewrites of existing files in
`src/content/articles/two-states-are-enough/`, following the exact visual/CSS-Modules conventions
already established by their siblings. No new state model, no new npm dependency, no new ESLint
override - the interactivity added is either purely local UI state (`SwitchAnalogy`,
`LightDarkDemo`) or a rendering change over an already-existing real state model
(`PatternGallery`).

**Tech Stack:** Next.js App Router, React 19, TypeScript (strict), react-i18next, CSS Modules, Vitest.

## Global Constraints

- Strict TypeScript: no `any`, no type assertions (`as`); use type guards/discriminated unions instead. Boolean identifiers prefixed `is`/`has`.
- JSDoc on interface/type fields, component props, and non-`useState` variables - one line, states the non-obvious reason only.
- Comments elsewhere: 1-2 lines max, state the _why_, not the _what_.
- True module-level constants in `UPPER_SNAKE_CASE`.
- Each component in its own directory with a separate `.module.css` file.
- Stable `data-testid` (no random selectors).
- Destructure function params/callback args/object fields over repeated dotted access.
- `SwitchAnalogy`'s new interactivity stays decorative/local UI state only - no `localStorage`, no tie to the real site theme (same constraint as before this change).
- `LightDarkDemo`'s live demo must be a genuine CSS effect (`color-scheme` forcing `light-dark()` resolution) - no JavaScript computing or assigning any color value.
- `PatternGallery`'s underlying real state model (`matchMedia` + `localStorage`) must not change - only which controls are visible changes.
- No new npm dependency for any of this (range input styling and the macOS-mockup markup are both hand-built, matching existing sibling conventions).
- Commits must not include a `Co-Authored-By` trailer.
- Run `pnpm check-types && pnpm lint` before considering the change complete.
- If formatting needs fixing, run `npx prettier --write <exact file path(s) touched by this task>` - never `pnpm format` (which is `prettier --write .`, repo-wide). A prior revision's implementer ran the repo-wide command and left unrelated pre-existing files reformatted in the working tree; scope every formatting fix to the files this task actually touches.

---

### Task 1: Locale copy (EN + RU)

**Files:**

- Modify: `public/locales/en.json`
- Modify: `public/locales/ru.json`
- Test: `src/configs/i18n/locales.test.ts` (already generic - no edits, just re-run)

**Interfaces:**

- Produces: `articleContent.twoStatesAreEnough.switchAnalogySliderLabel`,
  `articleContent.twoStatesAreEnough.lightDarkEyebrow`,
  `articleContent.twoStatesAreEnough.lightDarkMechanism`,
  `articleContent.twoStatesAreEnough.lightDarkDemoCaption` - consumed by Task 2 (`SwitchAnalogy`)
  and Task 3 (`LightDarkDemo`). Also reuses several already-shipped keys with no changes needed:
  `switchAnalogyPanelALabel` (as an `aria-label`), `demoToggleToDark`/`demoToggleToLight` (as the
  new demo's button `aria-label`/`title`), and `demoTabButtonLabel`/`demoTabSwitchLabel`/
  `demoTabDropdownLabel` (as `PatternGallery`'s new tile captions in Task 4).

- [ ] **Step 1: Add `switchAnalogySliderLabel` in `en.json`**

Find this line inside the `"twoStatesAreEnough"` object:

```json
      "switchAnalogyTakeaway": "A tri-state control asks you to read. A two-state one just asks you to feel a direction.",
```

Replace it with:

```json
      "switchAnalogyTakeaway": "A tri-state control asks you to read. A two-state one just asks you to feel a direction.",
      "switchAnalogySliderLabel": "Brightness slider",
```

- [ ] **Step 2: Add the `lightDark*` keys in `en.json`**

Find these two lines (still inside `"twoStatesAreEnough"`):

```json
      "lightDarkIntro": "CSS agrees with the two-value model too: light-dark() takes exactly two colors - there's no third argument for a system fallback.",
      "lightDarkCaption": "Two arguments, no more - the function is binary by construction, not by convention.",
```

Replace them with:

```json
      "lightDarkIntro": "CSS agrees with the two-value model too: light-dark() takes exactly two colors - there's no third argument for a system fallback.",
      "lightDarkEyebrow": "Live, not simulated",
      "lightDarkCaption": "Two arguments, no more - the function is binary by construction, not by convention.",
      "lightDarkMechanism": "color-scheme is what actually decides: set it to light or dark on any element and every light-dark() value inside inherits that choice - no media query, no JavaScript computing colors.",
      "lightDarkDemoCaption": "This window's colors are set entirely by light-dark() - clicking only changes color-scheme; the browser repaints the rest.",
```

- [ ] **Step 3: Make the matching edits in `ru.json`**

Find:

```json
      "switchAnalogyTakeaway": "Трёхпозиционный контрол просит тебя прочитать. Двухпозиционный - просто почувствовать направление.",
```

Replace with:

```json
      "switchAnalogyTakeaway": "Трёхпозиционный контрол просит тебя прочитать. Двухпозиционный - просто почувствовать направление.",
      "switchAnalogySliderLabel": "Ползунок яркости",
```

Find:

```json
      "lightDarkIntro": "CSS тоже согласен с моделью из двух значений: light-dark() принимает ровно два цвета - третьего аргумента под системный fallback в нём нет.",
      "lightDarkCaption": "Ровно два аргумента - функция бинарна по конструкции, а не по договорённости.",
```

Replace with:

```json
      "lightDarkIntro": "CSS тоже согласен с моделью из двух значений: light-dark() принимает ровно два цвета - третьего аргумента под системный fallback в нём нет.",
      "lightDarkEyebrow": "Живо, не симуляция",
      "lightDarkCaption": "Ровно два аргумента - функция бинарна по конструкции, а не по договорённости.",
      "lightDarkMechanism": "Решает именно color-scheme: выстави light или dark на любом элементе - и каждое значение light-dark() внутри унаследует этот выбор. Ни media-запроса, ни JS, вычисляющего цвет.",
      "lightDarkDemoCaption": "Цвета этого окна целиком заданы через light-dark() - клик меняет только color-scheme, всё остальное перерисовывает браузер.",
```

- [ ] **Step 4: Validate JSON and run the locale parity test**

Run: `pnpm test -- locales`
Expected: PASS - every new key added to `en.json` has a Russian counterpart and vice versa, no blank values, no non-string leaves, no duplicate paths.

- [ ] **Step 5: Commit**

```bash
git add public/locales/en.json public/locales/ru.json
git commit -m "feat: add copy for the interactive hook and live light-dark demo"
```

---

### Task 2: `SwitchAnalogy` - real interaction

**Files:**

- Modify: `src/content/articles/two-states-are-enough/SwitchAnalogy/SwitchAnalogy.tsx`
- Modify: `src/content/articles/two-states-are-enough/SwitchAnalogy/SwitchAnalogy.module.css`

**Interfaces:**

- Consumes: `articleContent.twoStatesAreEnough.switchAnalogySliderLabel` (Task 1), plus the
  already-shipped `switchAnalogyEyebrow`/`switchAnalogyPanelALabel`/`switchAnalogyPanelACaption`/
  `switchAnalogyPanelBLabel`/`switchAnalogyPanelBCaption`/`switchAnalogyTakeaway`.
- Produces: `SwitchAnalogy` (default + named export, unchanged signature - still no props),
  consumed by `Content.tsx` exactly as before (no import path change).

- [ ] **Step 1: Replace the component**

Replace the entire contents of
`src/content/articles/two-states-are-enough/SwitchAnalogy/SwitchAnalogy.tsx` with:

```tsx
'use client'

import styles from './SwitchAnalogy.module.css'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/** The five labelled dial positions shown in the "read every label" panel. */
const DIAL_PERCENTAGES: number[] = [10, 30, 50, 70, 100]

/** Which dial position starts pressed - purely decorative, moved by clicking any dial button. */
const DEFAULT_DIAL_PERCENTAGE = 50

/** The slider's starting position (0-100) - purely decorative, moved by dragging the range input. */
const DEFAULT_SLIDER_VALUE = 70

export const SwitchAnalogy = () => {
  const { t } = useTranslation()
  const [activeDialPercentage, setActiveDialPercentage] = useState(DEFAULT_DIAL_PERCENTAGE)
  const [sliderValue, setSliderValue] = useState(DEFAULT_SLIDER_VALUE)

  const panelALabel = t('articleContent.twoStatesAreEnough.switchAnalogyPanelALabel')

  return (
    <div className={styles.card} data-testid="switch-analogy">
      <p className={styles.eyebrow}>
        {t('articleContent.twoStatesAreEnough.switchAnalogyEyebrow')}
      </p>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <p className={styles.panelLabel}>{panelALabel}</p>
          <div className={styles.dialRow} role="group" aria-label={panelALabel}>
            {DIAL_PERCENTAGES.map((percentage) => (
              <button
                key={percentage}
                type="button"
                className={styles.dialButton}
                data-active={percentage === activeDialPercentage}
                aria-pressed={percentage === activeDialPercentage}
                onClick={() => setActiveDialPercentage(percentage)}
              >
                {percentage}%
              </button>
            ))}
          </div>
          <p className={styles.panelCaption}>
            {t('articleContent.twoStatesAreEnough.switchAnalogyPanelACaption')}
          </p>
        </div>

        <div className={styles.panel}>
          <p className={styles.panelLabel}>
            {t('articleContent.twoStatesAreEnough.switchAnalogyPanelBLabel')}
          </p>
          <input
            type="range"
            min={0}
            max={100}
            value={sliderValue}
            onChange={(event) => setSliderValue(Number(event.target.value))}
            className={styles.slider}
            aria-label={t('articleContent.twoStatesAreEnough.switchAnalogySliderLabel')}
          />
          <p className={styles.panelCaption}>
            {t('articleContent.twoStatesAreEnough.switchAnalogyPanelBCaption')}
          </p>
        </div>
      </div>

      <p className={styles.takeaway}>
        {t('articleContent.twoStatesAreEnough.switchAnalogyTakeaway')}
      </p>
    </div>
  )
}

export default SwitchAnalogy
```

- [ ] **Step 2: Replace the styles**

Replace the entire contents of
`src/content/articles/two-states-are-enough/SwitchAnalogy/SwitchAnalogy.module.css` with:

```css
.card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 2rem 1.5rem;
  margin: 2rem 0;
  background: #111;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 1rem;
}

.eyebrow {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 50%);
}

.panels {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.panel {
  display: flex;
  flex: 1 1 12rem;
  flex-direction: column;
  gap: 0.6rem;
}

.panelLabel {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
}

.dialRow {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.dialButton {
  padding: 0.35rem 0.55rem;
  font: inherit;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgb(255 255 255 / 55%);
  cursor: pointer;
  background: rgb(255 255 255 / 6%);
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 999px;
  transition:
    background-color 0.15s ease-out,
    color 0.15s ease-out,
    border-color 0.15s ease-out;
}

.dialButton:hover {
  border-color: rgb(255 255 255 / 35%);
}

.dialButton[data-active='true'] {
  color: #fff;
  background: rgb(255 255 255 / 16%);
  border-color: var(--g-color-line-brand);
}

.dialButton:focus-visible {
  outline: 2px solid var(--g-color-line-brand);
  outline-offset: 2px;
}

.slider {
  width: 100%;
  height: 0.35rem;
  margin: 0.5rem 0;
  appearance: none;
  cursor: pointer;
  background: rgb(255 255 255 / 12%);
  border-radius: 999px;
}

.slider::-webkit-slider-thumb {
  width: 1rem;
  height: 1rem;
  appearance: none;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--g-color-line-brand);
}

.slider::-moz-range-thumb {
  width: 1rem;
  height: 1rem;
  background: #fff;
  border: none;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--g-color-line-brand);
}

.slider:focus-visible {
  outline: 2px solid var(--g-color-line-brand);
  outline-offset: 2px;
}

.panelCaption {
  margin: 0;
  font-size: 0.75rem;
  color: rgb(255 255 255 / 55%);
}

.takeaway {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgb(255 255 255 / 85%);
}
```

- [ ] **Step 3: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS. If `lint:styles` or `lint:prettier` flags formatting, run `pnpm format` and
re-run `pnpm lint`.

- [ ] **Step 4: Commit**

```bash
git add src/content/articles/two-states-are-enough/SwitchAnalogy
git commit -m "feat: make SwitchAnalogy's dial buttons and slider genuinely interactive"
```

---

### Task 3: `LightDarkDemo` - rename + expand from `LightDarkSnippet`, wire into `Content.tsx`

**Files:**

- Create: `src/content/articles/two-states-are-enough/LightDarkDemo/LightDarkDemo.tsx`
- Create: `src/content/articles/two-states-are-enough/LightDarkDemo/LightDarkDemo.module.css`
- Delete: `src/content/articles/two-states-are-enough/LightDarkSnippet/LightDarkSnippet.tsx`
- Delete: `src/content/articles/two-states-are-enough/LightDarkSnippet/LightDarkSnippet.module.css`
- Modify: `src/content/articles/two-states-are-enough/Content.tsx`

**Interfaces:**

- Consumes: `articleContent.twoStatesAreEnough.lightDarkEyebrow`/`lightDarkMechanism`/
  `lightDarkDemoCaption` (Task 1), plus the already-shipped `lightDarkCaption`,
  `demoToggleToDark`/`demoToggleToLight`. Also consumes `Icon` from `@gravity-ui/uikit` and
  `Moon`/`Sun` from `@gravity-ui/icons` - both already imported the same way in
  `PatternGallery.tsx`.
- Produces: `LightDarkDemo` (default + named export, no props) - consumed by `Content.tsx` in
  place of the old `LightDarkSnippet`.

- [ ] **Step 1: Write the new component**

Create `src/content/articles/two-states-are-enough/LightDarkDemo/LightDarkDemo.tsx`:

```tsx
'use client'

import styles from './LightDarkDemo.module.css'

import { useState } from 'react'
import { Icon } from '@gravity-ui/uikit'
import { Moon, Sun } from '@gravity-ui/icons'
import { useTranslation } from 'react-i18next'

/** Verbatim CSS - code samples aren't localized elsewhere in this project either. */
const LIGHT_DARK_CSS = `:root {
  color-scheme: light dark;
}

body {
  background: light-dark(#fff, #111);
  color: light-dark(#111, #fff);
}`

/** Either branch light-dark() can resolve to in the demo below - always exactly one of these two. */
type TNativeScheme = 'light' | 'dark'

/** The three macOS traffic-light colors, in their fixed left-to-right order - never themed, just decoration. */
const TRAFFIC_LIGHTS: string[] = ['red', 'yellow', 'green']

export const LightDarkDemo = () => {
  const { t } = useTranslation()
  const [simulatedNative, setSimulatedNative] = useState<TNativeScheme>('light')

  const handleToggle = () =>
    setSimulatedNative((previous) => (previous === 'dark' ? 'light' : 'dark'))

  const cycleLabel =
    simulatedNative === 'dark'
      ? t('articleContent.twoStatesAreEnough.demoToggleToLight')
      : t('articleContent.twoStatesAreEnough.demoToggleToDark')

  return (
    <div className={styles.card} data-testid="light-dark-demo">
      <p className={styles.eyebrow}>{t('articleContent.twoStatesAreEnough.lightDarkEyebrow')}</p>

      <pre className={styles.pre}>
        <code>{LIGHT_DARK_CSS}</code>
      </pre>
      <p className={styles.caption}>{t('articleContent.twoStatesAreEnough.lightDarkCaption')}</p>

      <p className={styles.mechanism}>
        {t('articleContent.twoStatesAreEnough.lightDarkMechanism')}
      </p>

      <div className={styles.demo}>
        <button
          type="button"
          className={styles.toggleButton}
          onClick={handleToggle}
          aria-label={cycleLabel}
          title={cycleLabel}
        >
          <Icon data={simulatedNative === 'dark' ? Sun : Moon} size={20} />
        </button>

        {/* This is the only line doing any work: color-scheme here forces every light-dark()
            value below to resolve for this branch, regardless of the real OS preference. */}
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
      </div>

      <p className={styles.demoCaption}>
        {t('articleContent.twoStatesAreEnough.lightDarkDemoCaption')}
      </p>
    </div>
  )
}

export default LightDarkDemo
```

- [ ] **Step 2: Write the styles**

Create `src/content/articles/two-states-are-enough/LightDarkDemo/LightDarkDemo.module.css`:

```css
.card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 2rem 1.5rem;
  margin: 2rem 0;
  background: #111;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 1rem;
}

.eyebrow {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 50%);
}

.pre {
  margin: 0;
  padding: 1rem 1.25rem;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8rem;
  line-height: 1.6;
  color: rgb(255 255 255 / 85%);
  background: rgb(255 255 255 / 6%);
  border-radius: 0.75rem;
}

.caption {
  margin: 0;
  font-size: 0.75rem;
  color: rgb(255 255 255 / 55%);
}

.mechanism {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgb(255 255 255 / 75%);
}

.demo {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.toggleButton {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  color: #fff;
  cursor: pointer;
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 999px;
  transition: background-color 0.15s ease-out;
}

.toggleButton:hover {
  background: rgb(255 255 255 / 16%);
}

.toggleButton:focus-visible {
  outline: 2px solid var(--g-color-line-brand);
  outline-offset: 2px;
}

.window {
  display: block;
  overflow: hidden;
  border: 1px solid rgb(0 0 0 / 40%);
  border-radius: 0.5rem;
  box-shadow: 0 4px 14px -6px rgb(0 0 0 / 60%);
}

.titlebar {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.5rem;
  background: light-dark(#e4e4e2, #2c2c2e);
}

.trafficLight {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
}

.trafficLight[data-color='red'] {
  background: #ff5f57;
}

.trafficLight[data-color='yellow'] {
  background: #febc2e;
}

.trafficLight[data-color='green'] {
  background: #28c840;
}

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

.pageLine {
  width: 6rem;
}

.pageLineShort {
  width: 3.5rem;
}

.demoCaption {
  margin: 0;
  font-size: 0.75rem;
  color: rgb(255 255 255 / 55%);
}
```

- [ ] **Step 3: Delete the old `LightDarkSnippet` directory**

```bash
git rm -r src/content/articles/two-states-are-enough/LightDarkSnippet
```

- [ ] **Step 4: Wire `LightDarkDemo` into `Content.tsx`**

In `src/content/articles/two-states-are-enough/Content.tsx`, replace:

```tsx
import { LightDarkSnippet } from './LightDarkSnippet/LightDarkSnippet'
```

with:

```tsx
import { LightDarkDemo } from './LightDarkDemo/LightDarkDemo'
```

(This import stays in the same alphabetical position among the local imports - `LightDarkDemo`
still sorts between `CombinationGrid` and `PatternGallery`.)

Then replace:

```tsx
<LightDarkSnippet />
```

with:

```tsx
<LightDarkDemo />
```

No other line in `Content.tsx` changes - `lightDarkIntro` still renders as the `<p>` immediately
above this component, unchanged.

- [ ] **Step 5: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 6: Manual verification in the browser**

Run: `pnpm dev`
Visit `http://localhost:3000/articles/two-states-are-enough` and confirm:

- The light-dark() card shows an eyebrow, the same 4-line CSS block as before, the existing
  "binary by construction" caption, then a new paragraph about `color-scheme`, then a sun/moon
  toggle button next to a small macOS-style window mockup, then a closing caption.
- Clicking the toggle button visibly flips the mockup window's title bar and page background
  between light and dark colors.
- Open the browser's DevTools element inspector on the mockup's outer window `div` after clicking:
  confirm its inline `style` attribute contains `color-scheme: light` or `color-scheme: dark`
  matching the current toggle state, and that no inline `background`/`color` styles are being set
  by JavaScript anywhere in this component - the color change must come entirely from the CSS
  `light-dark()` values in `LightDarkDemo.module.css` re-resolving.

Stop the dev server once confirmed.

- [ ] **Step 7: Commit**

```bash
git add src/content/articles/two-states-are-enough/LightDarkDemo src/content/articles/two-states-are-enough/Content.tsx
git commit -m "feat: rename LightDarkSnippet to LightDarkDemo and add a live color-scheme demo"
```

---

### Task 4: `PatternGallery` - show all three controls at once

**Files:**

- Modify: `src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.tsx`
- Modify: `src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.module.css`

**Interfaces:**

- Consumes: only already-shipped locale keys - no Task 1 dependency. Reuses
  `demoTabButtonLabel`/`demoTabSwitchLabel`/`demoTabDropdownLabel` as tile captions instead of tab
  labels.
- Produces: `PatternGallery` (default + named export, unchanged signature - still no props),
  consumed by `Content.tsx` exactly as before (no import change needed for this task).

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

import { ThemeDropdown } from './ThemeDropdown/ThemeDropdown'
import type { TDropdownValue } from './ThemeDropdown/ThemeDropdown'

/** This demo's own localStorage key - scoped to the demo only, unrelated to the site's own (dark-only) theme. */
const STORAGE_KEY = 'demo-theme-override'

/** The user's explicit choice, or `null` when following the OS preference. */
type TThemeOverride = 'light' | 'dark' | null

/** What's actually rendered - always exactly one of these two. */
type TResolvedTheme = 'light' | 'dark'

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

  /** A real switch has only two positions, so - unlike Button - it always sets an explicit override; it can't hand you back to "system". Checked (on) means light, mirroring a physical light switch. */
  const handleSwitchChange = (checked: boolean) => {
    const next: TResolvedTheme = checked ? 'light' : 'dark'
    setOverride(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  /** The Dropdown pattern sets state directly instead of cycling - that's the whole tradeoff it's here to show. */
  const handleSelectChange = (value: TDropdownValue) => {
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
          <p className={styles.controlLabel}>
            {t('articleContent.twoStatesAreEnough.demoTabSwitchLabel')}
          </p>
          <Switch
            checked={isMounted && resolvedTheme === 'light'}
            onUpdate={handleSwitchChange}
            disabled={!isMounted}
            content={isMounted ? resolvedLabel : undefined}
          />
        </div>

        <div className={styles.controlTile}>
          <p className={styles.controlLabel}>
            {t('articleContent.twoStatesAreEnough.demoTabDropdownLabel')}
          </p>
          <ThemeDropdown
            value={isMounted ? (override ?? 'system') : 'system'}
            onChange={handleSelectChange}
            disabled={!isMounted}
          />
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
          <dd className={styles.stateValue}>{isMounted ? osLabel : '-'}</dd>
        </div>
        <div className={styles.stateRow}>
          <dt className={styles.stateLabel}>
            {t('articleContent.twoStatesAreEnough.demoOverrideLabel')}
          </dt>
          <dd className={styles.stateValue}>{isMounted ? overrideLabel : '-'}</dd>
        </div>
        <div className={styles.stateRow}>
          <dt className={styles.stateLabel}>
            {t('articleContent.twoStatesAreEnough.demoResolvedLabel')}
          </dt>
          <dd className={styles.stateValue}>{isMounted ? resolvedLabel : '-'}</dd>
        </div>
      </dl>

      <p className={styles.caption}>{t('articleContent.twoStatesAreEnough.demoCaption')}</p>
    </div>
  )
}

export default PatternGallery
```

- [ ] **Step 2: Replace the styles**

Replace the entire contents of
`src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.module.css` with:

```css
.card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 2rem 1.5rem;
  margin: 2rem 0;
  background: #111;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 1rem;
}

.eyebrow {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 50%);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.controlTile {
  display: flex;
  flex: 1 1 8rem;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.controlLabel {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(255 255 255 / 55%);
}

.preview {
  padding: 1.25rem 1.5rem;
  background: rgb(255 255 255 / 6%);
  border-radius: 0.75rem;
  transition:
    background-color 0.2s ease-out,
    color 0.2s ease-out;
}

.preview[data-theme='light'] {
  background: #f5f5f4;
}

.preview[data-theme='dark'] {
  background: #1a1a19;
}

.previewHeading {
  margin: 0 0 0.4rem;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
}

.preview[data-theme='light'] .previewHeading {
  color: #1a1a19;
}

.previewBody {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgb(255 255 255 / 75%);
}

.preview[data-theme='light'] .previewBody {
  color: rgb(26 26 25 / 75%);
}

.toggleButton {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  color: #fff;
  cursor: pointer;
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 999px;
  transition: background-color 0.15s ease-out;
}

.toggleButton:hover:not(:disabled) {
  background: rgb(255 255 255 / 16%);
}

.toggleButton:focus-visible {
  outline: 2px solid var(--g-color-line-brand);
  outline-offset: 2px;
}

.toggleButton:disabled {
  cursor: default;
  opacity: 0.5;
}

.state {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
}

.stateRow {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.stateLabel {
  margin: 0;
  font-size: 0.8rem;
  color: rgb(255 255 255 / 55%);
}

.stateValue {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #fff;
}

.caption {
  margin: 0;
  font-size: 0.75rem;
  color: rgb(255 255 255 / 45%);
}
```

- [ ] **Step 3: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 4: Manual verification in the browser**

Run: `pnpm dev`
Visit `http://localhost:3000/articles/two-states-are-enough` and confirm:

- The "Try it" card now shows all three controls (icon button, switch, dropdown) side by side, no
  tabs, each with its label above it.
- Clicking the icon button updates the switch's position, the dropdown's selected value, the
  preview background, and the state readout below - all at once, without any click on the switch
  or dropdown.
- Dragging the switch likewise updates the button's icon, the dropdown's value, the preview, and
  the readout.
- Selecting "System" in the dropdown clears the override and returns the button/switch/preview to
  match the OS preference.
- Reloading the page preserves whichever override was last set (real `localStorage`, unchanged
  behavior).

Stop the dev server once confirmed.

- [ ] **Step 5: Commit**

```bash
git add src/content/articles/two-states-are-enough/PatternGallery
git commit -m "feat: show all three PatternGallery controls at once instead of behind tabs"
```

---

### Task 5: Final validation

**Files:** none (verification only)

- [ ] **Step 1: Full type-check and lint**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 2: Full unit test suite**

Run: `pnpm test`
Expected: PASS, including `src/configs/i18n/locales.test.ts` covering all new copy.

- [ ] **Step 3: Confirm README still matches reality**

`README.md` describes the article architecture generically (no per-article enumeration or
component count). Skim the "Project structure" and "Architecture" sections to confirm nothing
there references `LightDarkSnippet`, `PatternGallery`'s tabs, or any other detail this change
invalidates; no edit is expected.
