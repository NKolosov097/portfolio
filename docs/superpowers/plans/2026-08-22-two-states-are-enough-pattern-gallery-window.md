# Two States Are Enough - PatternGallery Browser-Window Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `PatternGallery`'s theme preview a native macOS browser-window look (traffic-light titlebar + URL bar) so switching themes visibly repaints recognizable browser chrome, not just a plain colored card.

**Architecture:** A render-only change to one file pair. `PatternGallery.tsx` gains a `TRAFFIC_LIGHTS` constant and new titlebar/URL-bar markup inside the existing `.preview` element; `PatternGallery.module.css` restructures `.preview` from a padded card into a window container with a titlebar and a page-content area. No state, handler, or locale changes.

**Tech Stack:** Next.js App Router, React 19, TypeScript (strict), react-i18next, CSS Modules.

## Global Constraints

- True module-level constants in `UPPER_SNAKE_CASE`.
- JSDoc on non-`useState` module-level variables - one line, states the non-obvious reason only.
- No new locale keys - the URL-bar text is decorative placeholder, not localized content.
- `PatternGallery`'s state model (`osPrefersDark`, `override`, `handleCycle`, `handleSwitchChange`, `handleSegmentChange`) must not change - this is a markup/CSS-only change inside `.preview`.
- The preview continues to use the existing `data-theme={resolvedTheme}` attribute mechanism - no `light-dark()` CSS function, no `browserslist`/Lightning CSS risk.
- Commits must not include a `Co-Authored-By` trailer.
- Run `pnpm check-types && pnpm lint` before considering the change complete.

---

### Task 1: `PatternGallery` - browser-window preview

**Files:**

- Modify: `src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.tsx`
- Modify: `src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.module.css`

**Interfaces:**

- Consumes: only already-shipped locale keys (`demoPreviewHeading`, `demoPreviewBody`) - no new
  keys.
- Produces: `PatternGallery` (default + named export, unchanged signature), consumed by
  `Content.tsx` exactly as before (no import change).

- [ ] **Step 1: Add the `TRAFFIC_LIGHTS` constant**

In `PatternGallery.tsx`, find:

```tsx
/** The three segments, in display order - same trio `PatternsInTheWild` illustrates as a static mockup. */
const SEGMENT_OPTIONS: TSegmentValue[] = ['light', 'dark', 'system']

const isThemeOverride = (value: string | null): value is Exclude<TThemeOverride, null> =>
  value === 'light' || value === 'dark'
```

Replace with:

```tsx
/** The three segments, in display order - same trio `PatternsInTheWild` illustrates as a static mockup. */
const SEGMENT_OPTIONS: TSegmentValue[] = ['light', 'dark', 'system']

/** The three macOS traffic-light colors, in their fixed left-to-right order - never themed, just decoration. */
const TRAFFIC_LIGHTS: string[] = ['red', 'yellow', 'green']

const isThemeOverride = (value: string | null): value is Exclude<TThemeOverride, null> =>
  value === 'light' || value === 'dark'
```

- [ ] **Step 2: Replace the preview markup**

Find:

```tsx
<div className={styles.preview} data-theme={isMounted ? resolvedTheme : undefined}>
  <p className={styles.previewHeading}>
    {t('articleContent.twoStatesAreEnough.demoPreviewHeading')}
  </p>
  <p className={styles.previewBody}>{t('articleContent.twoStatesAreEnough.demoPreviewBody')}</p>
</div>
```

Replace with:

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
    <p className={styles.previewHeading}>
      {t('articleContent.twoStatesAreEnough.demoPreviewHeading')}
    </p>
    <p className={styles.previewBody}>{t('articleContent.twoStatesAreEnough.demoPreviewBody')}</p>
  </div>
</div>
```

- [ ] **Step 3: Restructure `.preview` into a window container**

In `PatternGallery.module.css`, find:

```css
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
```

Replace with:

```css
.preview {
  overflow: hidden;
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

.previewTitlebar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  background: rgb(255 255 255 / 8%);
}

.preview[data-theme='light'] .previewTitlebar {
  background: #e4e4e2;
}

.preview[data-theme='dark'] .previewTitlebar {
  background: #2c2c2e;
}

.previewTrafficLights {
  display: flex;
  flex: none;
  gap: 0.35rem;
}

.previewTrafficLight {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
}

.previewTrafficLight[data-color='red'] {
  background: #ff5f57;
}

.previewTrafficLight[data-color='yellow'] {
  background: #febc2e;
}

.previewTrafficLight[data-color='green'] {
  background: #28c840;
}

.previewUrlBar {
  flex: 1 1 auto;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  color: rgb(255 255 255 / 55%);
  background: rgb(255 255 255 / 10%);
  border-radius: 999px;
}

.preview[data-theme='light'] .previewUrlBar {
  color: rgb(26 26 25 / 60%);
  background: rgb(0 0 0 / 6%);
}

.preview[data-theme='dark'] .previewUrlBar {
  color: rgb(255 255 255 / 55%);
  background: rgb(255 255 255 / 10%);
}

.previewPage {
  padding: 1.25rem 1.5rem;
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
```

(`.previewTitlebar`'s and `.previewUrlBar`'s base - non-`data-theme` - rules are the pre-hydration
neutral default, matching the card's own dark-first aesthetic, exactly like `.preview`'s own base
`background: rgb(255 255 255 / 6%)` before `isMounted` resolves.)

- [ ] **Step 4: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 5: Manual verification in the browser (use a real browser engine, not source/HTML inspection)**

Run: `pnpm dev`
Drive the page with a real browser engine (e.g. Playwright + the Chromium build already on this
machine) - not `curl`, not static HTML parsing - and confirm on
`http://localhost:3000/articles/two-states-are-enough`:

- `[data-testid="pattern-gallery"] .preview` now shows a titlebar with three traffic-light dots and
  a rounded URL-bar pill reading `yoursite.dev`, above the existing "Твой сайт" / "Your Site"
  heading and body text.
- Clicking the icon button, a segment, or toggling the switch repaints the titlebar background, the
  URL-bar's background/text color, and the page-content background/text together - read the
  computed `background-color` of `.previewTitlebar` and `.previewUrlBar` before and after a click
  and confirm both changed, alongside the existing heading/body color change.
- The state `<dl>` readout and closing caption below the preview are unaffected.

Stop the dev server once confirmed.

- [ ] **Step 6: Commit**

```bash
git add src/content/articles/two-states-are-enough/PatternGallery
git commit -m "feat: give PatternGallery's preview a native macOS browser-window look"
```

---

### Task 2: Final validation

**Files:** none (verification only)

- [ ] **Step 1: Full type-check and lint**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 2: Full unit test suite**

Run: `pnpm test`
Expected: PASS (this change touches no locale keys and no tested logic, so the count should be
unchanged from before this plan).

- [ ] **Step 3: Confirm README still matches reality**

`README.md` describes the article architecture generically (no per-article enumeration or
component count). Skim the "Project structure" and "Architecture" sections to confirm nothing
there needs updating; no edit is expected.
