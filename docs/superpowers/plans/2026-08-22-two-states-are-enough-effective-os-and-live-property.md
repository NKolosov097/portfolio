# Two States Are Enough - Unify PatternGallery's OS Concept, Show LightDarkDemo's Live Property Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `PatternGallery` so its "System" site-theme resolution follows the Simulate OS control (not just the chrome), and make `LightDarkDemo` show the literal `color-scheme` value changing live next to the mock window it controls.

**Architecture:** Two independent, small changes to two sibling components. `PatternGallery` gets one renamed/refactored computed value (`nativeChromeTheme` → `effectiveOsTheme`) that now also feeds `resolvedTheme` and the OS-preference readout, plus one locale-string update. `LightDarkDemo` gets one new `<code>` element reading its existing `simulatedNative` state, wrapped with the existing window in a new flex column - no new state anywhere.

**Tech Stack:** Next.js App Router, React 19, TypeScript (strict), react-i18next, CSS Modules.

## Global Constraints

- True module-level constants/types follow existing naming (`UPPER_SNAKE_CASE` for constants, `T`-prefixed for type aliases).
- JSDoc on non-obvious non-`useState` module-level/component-level variables - one line, states the non-obvious reason only.
- `PatternGallery`'s three site controls (icon button/segmented pill/switch) and their handlers (`handleCycle`/`handleSwitchChange`/`handleSegmentChange`) must not change - only what their downstream `resolvedTheme` derives from changes.
- Explicit site overrides (Light/Dark set via the three site controls) must still never move the chrome - only the "System" (no-override) case is affected by this fix.
- `LightDarkDemo`'s `simulatedNative` state, its toggle handler, the static `LIGHT_DARK_CSS` sample, and the `mechanism`/`caption`/`demoCaption` copy are unchanged - this is a pure additive display of an existing value.
- No new locale keys - `demoSimulateOsCaption`'s existing key gets an updated value; `LightDarkDemo`'s new live property text is a CSS value, not prose (consistent with the existing non-localized `LIGHT_DARK_CSS` sample).
- Commits must not include a `Co-Authored-By` trailer.
- Run `pnpm check-types && pnpm lint` before considering the change complete.

---

### Task 1: `PatternGallery` - unify the OS concept so "System" follows the simulation

**Files:**

- Modify: `src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.tsx`
- Modify: `public/locales/en.json`
- Modify: `public/locales/ru.json`

**Interfaces:**

- Produces: no new exports - `PatternGallery`'s signature is unchanged.
- The locale-value update is folded into this task (not a separate task) because it's one string
  whose new wording directly describes the behavior this task implements - there's no other
  consumer or reason to split it out.

- [ ] **Step 1: Replace `nativeChromeTheme` with `effectiveOsTheme`, and make `resolvedTheme` depend on it**

In `PatternGallery.tsx`, find:

```tsx
/** Stays neutral for one frame instead of guessing, until the client-only read above resolves. */
const isMounted = osPrefersDark !== null
const resolvedTheme: TResolvedTheme = override ?? (osPrefersDark ? 'dark' : 'light')
const nativeChromeTheme: TResolvedTheme = simulatedNative ?? (osPrefersDark ? 'dark' : 'light')
```

Replace with:

```tsx
/** Stays neutral for one frame instead of guessing, until the client-only read above resolves. */
const isMounted = osPrefersDark !== null
/** What this demo currently treats as "the OS" - real by default, simulated when the reader engages Simulate OS below. */
const effectiveOsTheme: TResolvedTheme = simulatedNative ?? (osPrefersDark ? 'dark' : 'light')
const resolvedTheme: TResolvedTheme = override ?? effectiveOsTheme
```

- [ ] **Step 2: Update `handleSimulateNativeCycle` to read `effectiveOsTheme`**

Find:

```tsx
/** Simulates the native/OS theme independently of the site's own override - press 1 flips the chrome to the opposite of what it currently shows, press 2 clears back to following the real OS preference. Never touches osPrefersDark, override, or localStorage. */
const handleSimulateNativeCycle = () => {
  if (simulatedNative === null) {
    setSimulatedNative(nativeChromeTheme === 'dark' ? 'light' : 'dark')
  } else {
    setSimulatedNative(null)
  }
}
```

Replace with:

```tsx
/** Simulates the native/OS theme independently of the site's own override - press 1 flips the chrome to the opposite of what it currently shows, press 2 clears back to following the real OS preference. Never touches osPrefersDark, override, or localStorage. */
const handleSimulateNativeCycle = () => {
  if (simulatedNative === null) {
    setSimulatedNative(effectiveOsTheme === 'dark' ? 'light' : 'dark')
  } else {
    setSimulatedNative(null)
  }
}
```

- [ ] **Step 3: Make `osLabel` read `effectiveOsTheme`**

Find:

```tsx
const osLabel = osPrefersDark ? darkLabel : lightLabel
```

Replace with:

```tsx
const osLabel = effectiveOsTheme === 'dark' ? darkLabel : lightLabel
```

- [ ] **Step 4: Make `simulateCycleLabel` read `effectiveOsTheme`**

Find:

```tsx
const simulateCycleLabel =
  nativeChromeTheme === 'dark'
    ? t('articleContent.twoStatesAreEnough.demoSimulateToggleToLight')
    : t('articleContent.twoStatesAreEnough.demoSimulateToggleToDark')
```

Replace with:

```tsx
const simulateCycleLabel =
  effectiveOsTheme === 'dark'
    ? t('articleContent.twoStatesAreEnough.demoSimulateToggleToLight')
    : t('articleContent.twoStatesAreEnough.demoSimulateToggleToDark')
```

- [ ] **Step 5: Make the simulate tile's icon read `effectiveOsTheme`**

Find:

```tsx
            <Icon data={nativeChromeTheme === 'dark' ? Sun : Moon} size={20} />
          </button>
          <p className={styles.controlCaption}>
```

Replace with:

```tsx
            <Icon data={effectiveOsTheme === 'dark' ? Sun : Moon} size={20} />
          </button>
          <p className={styles.controlCaption}>
```

- [ ] **Step 6: Make the titlebar's `data-native-theme` attribute read `effectiveOsTheme`**

Find:

```tsx
        <div
          className={styles.previewTitlebar}
          data-native-theme={isMounted ? nativeChromeTheme : undefined}
        >
```

Replace with:

```tsx
        <div
          className={styles.previewTitlebar}
          data-native-theme={isMounted ? effectiveOsTheme : undefined}
        >
```

- [ ] **Step 7: Update the `demoSimulateOsCaption` value in `en.json`**

Find:

```json
      "demoSimulateOsCaption": "Changes only the window chrome below - not your real OS or the state below.",
```

Replace with:

```json
      "demoSimulateOsCaption": "Changes the window chrome below, and the site preview too whenever you're following System - never your real OS.",
```

- [ ] **Step 8: Update the matching value in `ru.json`**

Find:

```json
      "demoSimulateOsCaption": "Меняет только вид окна ниже - не твою настоящую ОС и не состояние ниже.",
```

Replace with:

```json
      "demoSimulateOsCaption": "Меняет вид окна ниже, а если ты следуешь Системной теме - то и превью сайта. Твою настоящую ОС это не трогает.",
```

- [ ] **Step 9: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS - `check-types` will fail loudly if any stale `nativeChromeTheme` reference
survives anywhere.

Run: `pnpm test -- locales`
Expected: PASS - the changed value keeps the same key in both locales, so parity holds.

- [ ] **Step 10: Manual verification in the browser (use a real browser engine with an actual script + raw output)**

Run: `pnpm dev`
Drive the page with a real browser engine (e.g. Playwright + the Chromium build already on this
machine) and confirm on `http://localhost:3000/articles/two-states-are-enough`,
`[data-testid="pattern-gallery"]`:

- With the segmented control's active segment on "System" (the default, or click the "System"
  segment to get there): click the "Simulate OS" tile's button. Read the computed
  `background-color`/`color` of `[class*="previewHeading"]` before and after - it must CHANGE.
  Read all three state `<dd>` values before and after - all three must CHANGE (OS preference,
  Resolved theme both flip; "Your override" stays "None - following system" either way, since it
  never changes here). Read the computed `background-color` of `[class*="previewTitlebar"]` before
  and after - it must also change (unchanged behavior from before this task).
- Now click the icon-button tile (first tile) to set an explicit override (e.g. to "Dark"). Then
  click "Simulate OS" again: read `[class*="previewHeading"]`'s color before/after - it must NOT
  change this time (an explicit override wins over the simulation). Read `[class*="previewTitlebar"]`'s
  background before/after - it must still change (chrome always follows the simulation,
  independent of the site's override).
- Paste the actual script and its raw console output into your report.

Stop the dev server once confirmed.

- [ ] **Step 11: Commit**

```bash
git add src/content/articles/two-states-are-enough/PatternGallery public/locales/en.json public/locales/ru.json
git commit -m "fix: make PatternGallery's System theme follow the simulated OS"
```

---

### Task 2: `LightDarkDemo` - show the live `color-scheme` value

**Files:**

- Modify: `src/content/articles/two-states-are-enough/LightDarkDemo/LightDarkDemo.tsx`
- Modify: `src/content/articles/two-states-are-enough/LightDarkDemo/LightDarkDemo.module.css`

**Interfaces:**

- Consumes: only the existing `simulatedNative` state - no new state, no new locale keys.
- Produces: no new exports - `LightDarkDemo`'s signature is unchanged.

- [ ] **Step 1: Wrap the window in a new stack, add the live property line**

In `LightDarkDemo.tsx`, find:

```tsx
{
  /* This is the only line doing any work: color-scheme here forces every light-dark()
            value below to resolve for this branch, regardless of the real OS preference. */
}
;<div className={styles.window} style={{ colorScheme: simulatedNative }}>
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

Replace with:

```tsx
<div className={styles.windowStack}>
  <code className={styles.liveProperty}>{`color-scheme: ${simulatedNative};`}</code>

  {/* This is the only line doing any work: color-scheme here forces every light-dark()
              value below to resolve for this branch, regardless of the real OS preference. */}
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
</div>
```

- [ ] **Step 2: Add the `.windowStack`/`.liveProperty` CSS rules**

In `LightDarkDemo.module.css`, find:

```css
.demo {
  display: flex;
  align-items: center;
  gap: 1rem;
}
```

Replace with:

```css
.demo {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.windowStack {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.liveProperty {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  color: rgb(255 255 255 / 55%);
}
```

- [ ] **Step 3: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 4: Manual verification in the browser (use a real browser engine with an actual script + raw output)**

Run: `pnpm dev`
Drive the page with a real browser engine and confirm on
`http://localhost:3000/articles/two-states-are-enough`, `[data-testid="light-dark-demo"]`:

- The text content of `[class*="liveProperty"]` reads exactly `color-scheme: light;` initially.
- Click the toggle button. The text content of `[class*="liveProperty"]` must change to exactly
  `color-scheme: dark;` at the same time the computed `background-color` of `[class*="page"]`
  changes (read both before and after the click).
- Paste the actual script and its raw console output into your report.

Stop the dev server once confirmed.

- [ ] **Step 5: Commit**

```bash
git add src/content/articles/two-states-are-enough/LightDarkDemo
git commit -m "feat: show LightDarkDemo's live color-scheme value next to the window it drives"
```

---

### Task 3: Final validation

**Files:** none (verification only)

- [ ] **Step 1: Full type-check and lint**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 2: Full unit test suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 3: Confirm no leftover references to the old name**

Run: `grep -rn "nativeChromeTheme" src public/locales`
Expected: no output. Any match is a leftover that must be cleaned up before this plan is done.

- [ ] **Step 4: Confirm README still matches reality**

`README.md` describes the article architecture generically (no per-article enumeration or
component count). Skim the "Project structure" and "Architecture" sections to confirm nothing
there needs updating; no edit is expected.
