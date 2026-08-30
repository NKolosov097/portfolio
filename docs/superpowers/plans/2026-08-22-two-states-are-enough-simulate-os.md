# Two States Are Enough - Simulate-OS Control for PatternGallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple `PatternGallery`'s native browser-chrome preview (titlebar + URL bar) from the site's own resolved theme, and add a new "Simulate OS" control that lets a reader make the two diverge on purpose.

**Architecture:** One new piece of local UI state (`simulatedNative`) and one new computed value (`nativeChromeTheme`) drive a new `data-native-theme` attribute on the titlebar, replacing its previous dependence on the shared `data-theme` the page content still uses. A fourth control tile (an icon toggle, same pattern as the first tile) drives the new state. No existing state, handler, or the state `<dl>` readout changes.

**Tech Stack:** Next.js App Router, React 19, TypeScript (strict), react-i18next, CSS Modules.

## Global Constraints

- True module-level constants/types follow existing naming (`UPPER_SNAKE_CASE` for constants, `T`-prefixed for type aliases).
- JSDoc on non-`useState` module-level variables and on the new handler - one line, states the non-obvious reason only.
- The new "Simulate OS" control is pure local UI state - no `localStorage`, no `STORAGE_KEY` involvement, resets on reload.
- The state `<dl>` readout (OS preference / your override / resolved theme) must not change - it stays 100% real, unaffected by the new simulation.
- The page content (`.previewPage`/`.previewHeading`/`.previewBody`) must keep using the existing `data-theme` mechanism on `.preview`, driven by `resolvedTheme` exactly as before.
- The new toggle button needs its own distinct `aria-label`/`title` - not shared with the existing site-toggle button's labels.
- Commits must not include a `Co-Authored-By` trailer.
- Run `pnpm check-types && pnpm lint` before considering the change complete.

---

### Task 1: Locale copy (EN + RU)

**Files:**

- Modify: `public/locales/en.json`
- Modify: `public/locales/ru.json`
- Test: `src/configs/i18n/locales.test.ts` (already generic - no edits, just re-run)

**Interfaces:**

- Produces: `articleContent.twoStatesAreEnough.demoSimulateOsLabel`,
  `articleContent.twoStatesAreEnough.demoSimulateOsCaption`,
  `articleContent.twoStatesAreEnough.demoSimulateToggleToDark`,
  `articleContent.twoStatesAreEnough.demoSimulateToggleToLight` - all consumed by Task 2.

- [ ] **Step 1: Add the four keys to `en.json`**

Find this line inside the `"twoStatesAreEnough"` object:

```json
      "demoCaption": "This state is real - a live matchMedia listener and an actual localStorage entry, not a simulation. Reload the page and your choice persists exactly like Lea Verou describes.",
```

Replace with:

```json
      "demoCaption": "This state is real - a live matchMedia listener and an actual localStorage entry, not a simulation. Reload the page and your choice persists exactly like Lea Verou describes.",
      "demoSimulateOsLabel": "Simulate OS",
      "demoSimulateOsCaption": "Changes only the window chrome above - not your real OS or the state below.",
      "demoSimulateToggleToDark": "Simulate dark OS",
      "demoSimulateToggleToLight": "Simulate light OS",
```

- [ ] **Step 2: Make the matching edit in `ru.json`**

Find:

```json
      "demoCaption": "Это состояние настоящее - реальный matchMedia-слушатель и реальная запись в localStorage, а не симуляция. Перезагрузи страницу - выбор сохранится ровно так, как описывает Лея Веру.",
```

Replace with:

```json
      "demoCaption": "Это состояние настоящее - реальный matchMedia-слушатель и реальная запись в localStorage, а не симуляция. Перезагрузи страницу - выбор сохранится ровно так, как описывает Лея Веру.",
      "demoSimulateOsLabel": "Симулировать ОС",
      "demoSimulateOsCaption": "Меняет только вид окна выше - не твою настоящую ОС и не состояние ниже.",
      "demoSimulateToggleToDark": "Симулировать тёмную ОС",
      "demoSimulateToggleToLight": "Симулировать светлую ОС",
```

- [ ] **Step 3: Validate JSON and run the locale parity test**

Run: `pnpm test -- locales`
Expected: PASS - all four new keys exist in both locales with matching structure.

- [ ] **Step 4: Commit**

```bash
git add public/locales/en.json public/locales/ru.json
git commit -m "feat: add copy for PatternGallery's simulate-OS control"
```

---

### Task 2: `PatternGallery` - simulate-OS control, decoupled native chrome

**Files:**

- Modify: `src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.tsx`
- Modify: `src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.module.css`

**Interfaces:**

- Consumes: `articleContent.twoStatesAreEnough.demoSimulateOsLabel`/`demoSimulateOsCaption`/
  `demoSimulateToggleToDark`/`demoSimulateToggleToLight` (Task 1).
- Produces: `PatternGallery` (default + named export, unchanged signature), consumed by
  `Content.tsx` exactly as before (no import change).

- [ ] **Step 1: Add the `TNativeSimulation` type and `simulatedNative` state**

In `PatternGallery.tsx`, find:

```tsx
/** The segmented control's own value space - an explicit shade, or the literal `'system'` option. */
type TSegmentValue = 'light' | 'dark' | 'system'
```

Replace with:

```tsx
/** The segmented control's own value space - an explicit shade, or the literal `'system'` option. */
type TSegmentValue = 'light' | 'dark' | 'system'

/** The simulated native/OS shade shown in the chrome above, or `null` to follow the real OS preference. */
type TNativeSimulation = 'light' | 'dark' | null
```

Find:

```tsx
const [osPrefersDark, setOsPrefersDark] = useState<boolean | null>(null)
const [override, setOverride] = useState<TThemeOverride>(null)
```

Replace with:

```tsx
const [osPrefersDark, setOsPrefersDark] = useState<boolean | null>(null)
const [override, setOverride] = useState<TThemeOverride>(null)
const [simulatedNative, setSimulatedNative] = useState<TNativeSimulation>(null)
```

- [ ] **Step 2: Add `nativeChromeTheme` and `handleSimulateNativeCycle`**

Find:

```tsx
/** Stays neutral for one frame instead of guessing, until the client-only read above resolves. */
const isMounted = osPrefersDark !== null
const resolvedTheme: TResolvedTheme = override ?? (osPrefersDark ? 'dark' : 'light')
```

Replace with:

```tsx
/** Stays neutral for one frame instead of guessing, until the client-only read above resolves. */
const isMounted = osPrefersDark !== null
const resolvedTheme: TResolvedTheme = override ?? (osPrefersDark ? 'dark' : 'light')
const nativeChromeTheme: TResolvedTheme = simulatedNative ?? (osPrefersDark ? 'dark' : 'light')
```

Find:

```tsx
/** The segmented pattern sets state directly instead of cycling - that's the whole tradeoff it's here to show. */
const handleSegmentChange = (value: TSegmentValue) => {
  if (value === 'system') {
    setOverride(null)
    window.localStorage.removeItem(STORAGE_KEY)
  } else {
    setOverride(value)
    window.localStorage.setItem(STORAGE_KEY, value)
  }
}
```

Replace with:

```tsx
/** The segmented pattern sets state directly instead of cycling - that's the whole tradeoff it's here to show. */
const handleSegmentChange = (value: TSegmentValue) => {
  if (value === 'system') {
    setOverride(null)
    window.localStorage.removeItem(STORAGE_KEY)
  } else {
    setOverride(value)
    window.localStorage.setItem(STORAGE_KEY, value)
  }
}

/** Simulates the native/OS theme independently of the site's own override - press 1 flips the chrome to the opposite of what it currently shows, press 2 clears back to following the real OS preference. Never touches osPrefersDark, override, or localStorage. */
const handleSimulateNativeCycle = () => {
  if (simulatedNative === null) {
    setSimulatedNative(nativeChromeTheme === 'dark' ? 'light' : 'dark')
  } else {
    setSimulatedNative(null)
  }
}
```

- [ ] **Step 3: Add `simulateCycleLabel`**

Find:

```tsx
const cycleLabel =
  resolvedTheme === 'dark'
    ? t('articleContent.twoStatesAreEnough.demoToggleToLight')
    : t('articleContent.twoStatesAreEnough.demoToggleToDark')
const segmentedLabel = t('articleContent.twoStatesAreEnough.demoTabSegmentedLabel')
```

Replace with:

```tsx
const cycleLabel =
  resolvedTheme === 'dark'
    ? t('articleContent.twoStatesAreEnough.demoToggleToLight')
    : t('articleContent.twoStatesAreEnough.demoToggleToDark')
const simulateCycleLabel =
  nativeChromeTheme === 'dark'
    ? t('articleContent.twoStatesAreEnough.demoSimulateToggleToLight')
    : t('articleContent.twoStatesAreEnough.demoSimulateToggleToDark')
const segmentedLabel = t('articleContent.twoStatesAreEnough.demoTabSegmentedLabel')
```

- [ ] **Step 4: Add the fourth control tile**

Find:

```tsx
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
      </div>
```

Replace with:

```tsx
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
            {t('articleContent.twoStatesAreEnough.demoSimulateOsLabel')}
          </p>
          <button
            type="button"
            className={styles.toggleButton}
            onClick={handleSimulateNativeCycle}
            disabled={!isMounted}
            aria-label={simulateCycleLabel}
            title={simulateCycleLabel}
          >
            <Icon data={nativeChromeTheme === 'dark' ? Sun : Moon} size={20} />
          </button>
          <p className={styles.controlCaption}>
            {t('articleContent.twoStatesAreEnough.demoSimulateOsCaption')}
          </p>
        </div>
      </div>
```

- [ ] **Step 5: Give the titlebar its own `data-native-theme` attribute**

Find:

```tsx
        <div className={styles.previewTitlebar}>
```

Replace with:

```tsx
        <div
          className={styles.previewTitlebar}
          data-native-theme={isMounted ? nativeChromeTheme : undefined}
        >
```

- [ ] **Step 6: Retarget the CSS selectors from `data-theme` to `data-native-theme`**

In `PatternGallery.module.css`, find:

```css
.previewTitlebar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  background: rgb(255 255 255 / 8%);
  transition: background-color 0.2s ease-out;
}

.preview[data-theme='light'] .previewTitlebar {
  background: #e4e4e2;
}

.preview[data-theme='dark'] .previewTitlebar {
  background: #2c2c2e;
}
```

Replace with:

```css
.previewTitlebar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  background: rgb(255 255 255 / 8%);
  transition: background-color 0.2s ease-out;
}

.previewTitlebar[data-native-theme='light'] {
  background: #e4e4e2;
}

.previewTitlebar[data-native-theme='dark'] {
  background: #2c2c2e;
}
```

Find:

```css
.preview[data-theme='light'] .previewUrlBar {
  color: rgb(26 26 25 / 65%);
  background: rgb(0 0 0 / 6%);
}

.preview[data-theme='dark'] .previewUrlBar {
  color: rgb(255 255 255 / 60%);
  background: rgb(255 255 255 / 10%);
}
```

Replace with:

```css
.previewTitlebar[data-native-theme='light'] .previewUrlBar {
  color: rgb(26 26 25 / 65%);
  background: rgb(0 0 0 / 6%);
}

.previewTitlebar[data-native-theme='dark'] .previewUrlBar {
  color: rgb(255 255 255 / 60%);
  background: rgb(255 255 255 / 10%);
}
```

- [ ] **Step 7: Add the `.controlCaption` rule**

Find:

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

.controlCaption {
  margin: 0;
  font-size: 0.7rem;
  color: rgb(255 255 255 / 45%);
}
```

- [ ] **Step 8: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 9: Manual verification in the browser (use a real browser engine with an actual script + raw output - not source/HTML inspection, not a prose summary)**

Run: `pnpm dev`
Drive the page with a real browser engine (e.g. Playwright + the Chromium build already on this
machine) and confirm on `http://localhost:3000/articles/two-states-are-enough`:

- `[data-testid="pattern-gallery"]` now shows a fourth tile labelled "Simulate OS" with an icon
  toggle and a caption below it.
- Click the icon-button tile (first tile, the real site toggle) and read the computed
  `background-color` of `[class*="previewTitlebar"]` before and after - it must NOT change. Read
  the computed `background-color`/`color` of `[class*="previewHeading"]` before and after - it
  MUST change. Confirm the state `<dl>` values update as before.
- Click the new "Simulate OS" tile's button and read the computed `background-color` of
  `[class*="previewTitlebar"]` before and after - it MUST change. Read the computed color of
  `[class*="previewHeading"]` before and after this click - it must NOT change. Confirm the state
  `<dl>` values do NOT change (OS preference/your override/resolved theme stay exactly as they
  were before this click).
- Paste the actual script and its raw console output into your report.

Stop the dev server once confirmed.

- [ ] **Step 10: Commit**

```bash
git add src/content/articles/two-states-are-enough/PatternGallery
git commit -m "feat: add a Simulate OS control and decouple PatternGallery's chrome from the site theme"
```

---

### Task 3: Final validation

**Files:** none (verification only)

- [ ] **Step 1: Full type-check and lint**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 2: Full unit test suite**

Run: `pnpm test`
Expected: PASS, including `src/configs/i18n/locales.test.ts` covering the four new keys.

- [ ] **Step 3: Confirm README still matches reality**

`README.md` describes the article architecture generically (no per-article enumeration or
component count). Skim the "Project structure" and "Architecture" sections to confirm nothing
there needs updating; no edit is expected.
