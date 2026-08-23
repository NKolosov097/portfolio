# Two States Are Enough — Reposition Demo Captions Beside Their Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `LightDarkDemo`'s closing caption and `PatternGallery`'s "Simulate OS" tile caption to sit beside their controls instead of below them, filling the empty horizontal space next to a small mock window and a small icon button respectively.

**Architecture:** Two independent, pure-layout changes to two sibling components — no state, handler, or copy changes in either. `LightDarkDemo`'s caption becomes a third flex child inside its existing `.demo` row. `PatternGallery`'s fourth-tile button and caption move from a vertical stack into a new horizontal `.simulateRow` wrapper.

**Tech Stack:** Next.js App Router, React 19, TypeScript (strict), react-i18next, CSS Modules.

## Global Constraints

- No copy changes, no new locale keys, no state/handler changes in either component — this is pure layout.
- `.controlCaption` has only one consumer (the "Simulate OS" tile), so extending its existing rule directly is safe.
- Commits must not include a `Co-Authored-By` trailer.
- Run `pnpm check-types && pnpm lint` before considering the change complete.

---

### Task 1: `LightDarkDemo` — move the closing caption into the demo row

**Files:**

- Modify: `src/content/articles/two-states-are-enough/LightDarkDemo/LightDarkDemo.tsx`
- Modify: `src/content/articles/two-states-are-enough/LightDarkDemo/LightDarkDemo.module.css`

**Interfaces:**

- Consumes: only the existing `lightDarkDemoCaption` locale key — no new keys.
- Produces: no new exports — `LightDarkDemo`'s signature is unchanged.

- [ ] **Step 1: Move the caption `<p>` inside `.demo`**

In `LightDarkDemo.tsx`, find:

```tsx
          </div>
        </div>
      </div>

      <p className={styles.demoCaption}>
        {t('articleContent.twoStatesAreEnough.lightDarkDemoCaption')}
      </p>
    </div>
  )
}
```

Replace with:

```tsx
          </div>
        </div>

        <p className={styles.demoCaption}>
          {t('articleContent.twoStatesAreEnough.lightDarkDemoCaption')}
        </p>
      </div>
    </div>
  )
}
```

(This closes `.windowStack`'s `</div>` and then, while still inside `.demo`, adds the caption as a
third child before `.demo`'s own closing `</div>` — one level of indentation shallower than
before, since it's no longer a sibling of the whole card's other direct children.)

- [ ] **Step 2: Make `.demoCaption` grow to fill the row**

In `LightDarkDemo.module.css`, find:

```css
.demoCaption {
  margin: 0;
  font-size: 0.75rem;
  color: rgb(255 255 255 / 55%);
}
```

Replace with:

```css
.demoCaption {
  flex: 1 1 12rem;
  margin: 0;
  font-size: 0.75rem;
  color: rgb(255 255 255 / 55%);
}
```

- [ ] **Step 3: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 4: Manual verification in the browser (use a real browser engine with an actual script + raw output)**

Run: `pnpm dev`
Drive the page with a real browser engine (e.g. Playwright + the Chromium build already on this
machine) and confirm on `http://localhost:3000/articles/two-states-are-enough`,
`[data-testid="light-dark-demo"]`:

- `[class*="demoCaption"]`'s bounding box sits to the right of `[class*="windowStack"]`, roughly at
  the same vertical position (both inside the `[class*="demo"]` row) — not below the whole `.demo`
  row. Read both elements' `getBoundingClientRect()` and confirm the caption's `left` is greater
  than the window stack's `right` (accounting for the row's gap), and their `top` values are close
  (within the row's height).
- The toggle button, the live property text, and the mock window still all update exactly as
  before (this task must not change any behavior, only position).
- Paste the actual script and its raw console output into your report.

Stop the dev server once confirmed.

- [ ] **Step 5: Commit**

```bash
git add src/content/articles/two-states-are-enough/LightDarkDemo
git commit -m "feat: move LightDarkDemo's closing caption beside the mock window"
```

---

### Task 2: `PatternGallery` — move the Simulate OS caption beside its button

**Files:**

- Modify: `src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.tsx`
- Modify: `src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.module.css`

**Interfaces:**

- Consumes: only the existing `demoSimulateOsLabel`/`demoSimulateOsCaption` locale keys — no new keys.
- Produces: no new exports — `PatternGallery`'s signature is unchanged.

- [ ] **Step 1: Wrap the button and caption in a new row**

In `PatternGallery.tsx`, find:

```tsx
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
    <Icon data={effectiveOsTheme === 'dark' ? Sun : Moon} size={20} />
  </button>
  <p className={styles.controlCaption}>
    {t('articleContent.twoStatesAreEnough.demoSimulateOsCaption')}
  </p>
</div>
```

Replace with:

```tsx
<div className={styles.controlTile}>
  <p className={styles.controlLabel}>
    {t('articleContent.twoStatesAreEnough.demoSimulateOsLabel')}
  </p>
  <div className={styles.simulateRow}>
    <button
      type="button"
      className={styles.toggleButton}
      onClick={handleSimulateNativeCycle}
      disabled={!isMounted}
      aria-label={simulateCycleLabel}
      title={simulateCycleLabel}
    >
      <Icon data={effectiveOsTheme === 'dark' ? Sun : Moon} size={20} />
    </button>
    <p className={styles.controlCaption}>
      {t('articleContent.twoStatesAreEnough.demoSimulateOsCaption')}
    </p>
  </div>
</div>
```

- [ ] **Step 2: Add `.simulateRow` and make `.controlCaption` fill the row**

In `PatternGallery.module.css`, find:

```css
.controlCaption {
  margin: 0;
  font-size: 0.7rem;
  color: rgb(255 255 255 / 45%);
}
```

Replace with:

```css
.controlCaption {
  flex: 1 1 auto;
  margin: 0;
  font-size: 0.7rem;
  color: rgb(255 255 255 / 45%);
}

.simulateRow {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
```

- [ ] **Step 3: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 4: Manual verification in the browser (use a real browser engine with an actual script + raw output)**

Run: `pnpm dev`
Drive the page with a real browser engine and confirm on
`http://localhost:3000/articles/two-states-are-enough`, `[data-testid="pattern-gallery"]`:

- Within the fourth control tile, `[class*="controlCaption"]`'s bounding box sits to the right of
  its sibling `[class*="toggleButton"]` (the one inside `[class*="simulateRow"]` — there are two
  `toggleButton`s on the page, the first tile's and this one's; scope your selector to the fourth
  tile, e.g. via `[class*="simulateRow"] button`), not below it. Confirm via
  `getBoundingClientRect()` that the caption's `left` is greater than the button's `right`, and
  their `top` values are close.
- Clicking the button still cycles `effectiveOsTheme` exactly as before (read the computed
  `background-color` of `[class*="previewTitlebar"]` before/after the click, confirm it changes) —
  this task must not change any behavior, only position.
- Paste the actual script and its raw console output into your report.

Stop the dev server once confirmed.

- [ ] **Step 5: Commit**

```bash
git add src/content/articles/two-states-are-enough/PatternGallery
git commit -m "feat: move PatternGallery's Simulate OS caption beside its button"
```

---

### Task 3: Final validation

**Files:** none (verification only)

- [ ] **Step 1: Full type-check and lint**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 2: Full unit test suite**

Run: `pnpm test`
Expected: PASS (no locale or logic changes, so the count should be unchanged).

- [ ] **Step 3: Confirm README still matches reality**

`README.md` describes the article architecture generically (no per-article enumeration or
component count). Skim the "Project structure" and "Architecture" sections to confirm nothing
there needs updating; no edit is expected.
