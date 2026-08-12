# Aside Ghost Tickle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Blend the aside panel into the existing dark palette with `#252525` and give the ghost an accessible, softly settling tickle reaction.

**Architecture:** Keep the visual work local to the existing aside and `AnimatedGhost` component. Turn the ghost into a semantic button, use a keyed React interaction state to restart the CSS animation on every activation, and isolate the tickle transform on a new SVG wrapper so the current idle layers continue unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, Playwright.

## Global Constraints

- Use `#252525` for both the desktop aside card and mobile drawer content.
- Preserve existing white text, champagne-gold accents, borders, social buttons, avatar styling, and ghost SVG artwork.
- The tickle reaction lasts 1.4–1.6 seconds and has no abrupt whole-ghost shaking or travel.
- Every pointer or keyboard activation restarts the reaction, even while it is running.
- `prefers-reduced-motion: reduce` disables silhouette deformation and settling movement, leaving only one brief eye narrowing.
- Follow strict red-green-refactor TDD and verify each new test fails for the intended missing behavior before implementation.

---

## File Structure

- Modify `src/styles/globals.css`: define the selected aside background token.
- Modify `src/layout/Aside/Aside.tsx`: expose the desktop visual surface to behavior tests.
- Modify `src/layout/Aside/aside.module.css`: apply the background to desktop and mobile aside surfaces.
- Modify `src/layout/Aside/components/AnimatedGhost/AnimatedGhost.tsx`: add semantic activation and restartable interaction state.
- Modify `src/layout/Aside/components/AnimatedGhost/AnimatedGhost.module.css`: add restrained silhouette, eye-giggle, settling, focus, and reduced-motion styles.
- Modify `e2e/aside-ghost.spec.ts`: cover background, pointer/keyboard activation, restart, completion, idle preservation, and reduced motion.

### Task 1: Soft charcoal aside surfaces

**Files:**

- Modify: `src/styles/globals.css`
- Modify: `src/layout/Aside/Aside.tsx`
- Modify: `src/layout/Aside/aside.module.css`
- Test: `e2e/aside-ghost.spec.ts`

**Interfaces:**

- Consumes: existing `data-testid="aside-sidebar"`, `data-testid="aside-drawer"`, and CSS token conventions.
- Produces: `--aside-bg-color: #252525`, consumed by both aside surface rules.

- [ ] **Step 1: Write the failing desktop and mobile background tests**

Append these tests to `e2e/aside-ghost.spec.ts`:

```ts
const SOFT_CHARCOAL = 'rgb(37, 37, 37)'

test('uses the soft charcoal surface on desktop', async ({ page }) => {
  await page.goto('/')

  await revealAside(page)

  await expect(page.getByTestId('aside-surface')).toHaveCSS('background-color', SOFT_CHARCOAL)
})

test('uses the soft charcoal surface in the mobile drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const drawer = await revealAside(page)

  await expect(drawer).toHaveCSS('background-color', SOFT_CHARCOAL)
})
```

The production change these tests catch is removal or misapplication of the selected surface token on either responsive rendering path.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```powershell
pnpm exec playwright test e2e/aside-ghost.spec.ts --grep "soft charcoal"
```

Expected: both tests fail because the current aside surfaces do not compute to `rgb(37, 37, 37)`.

- [ ] **Step 3: Apply the shared background token**

In `src/styles/globals.css`, retain the token name and change its value:

```css
--aside-bg-color: #252525;
```

In `src/layout/Aside/Aside.tsx`, identify the actual desktop card surface rather than testing a framework-generated class:

```tsx
<Card
  type="container"
  theme="normal"
  view="outlined"
  className={styles.container}
  data-testid="aside-surface"
>
```

In `src/layout/Aside/aside.module.css`, add the token to both visible surfaces:

```css
.container,
.drawerItemContent {
  background-color: var(--aside-bg-color);
}
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```powershell
pnpm exec playwright test e2e/aside-ghost.spec.ts --grep "soft charcoal"
```

Expected: 2 passed.

- [ ] **Step 5: Commit the surface change**

```powershell
git add src/styles/globals.css src/layout/Aside/Aside.tsx src/layout/Aside/aside.module.css e2e/aside-ghost.spec.ts
git commit -m "style: soften aside panel background"
```

### Task 2: Accessible restartable tickle interaction

**Files:**

- Modify: `src/layout/Aside/components/AnimatedGhost/AnimatedGhost.tsx`
- Modify: `src/layout/Aside/components/AnimatedGhost/AnimatedGhost.module.css`
- Test: `e2e/aside-ghost.spec.ts`

**Interfaces:**

- Consumes: `AnimatedGhost({ width?: number, height?: number })`, existing idle SVG groups, and native button keyboard behavior.
- Produces: `data-testid="aside-ghost-trigger"`, `data-tickling="true|false"`, and restartable `.tickleBody` / `.eyeGiggle` animation classes.

- [ ] **Step 1: Write failing pointer, keyboard, and restart tests**

Append to the existing `test.describe('aside ghost', ...)` block:

```ts
test('starts the tickle reaction by pointer and keyboard', async ({ page }) => {
  await page.goto('/')

  const aside = await revealAside(page)
  const trigger = aside.getByTestId('aside-ghost-trigger')

  await expect(trigger).toHaveRole('button')
  await trigger.click()
  await expect(trigger).toHaveAttribute('data-tickling', 'true')

  await expect
    .poll(() =>
      trigger.evaluate((node) =>
        node
          .getAnimations({ subtree: true })
          .some(({ animationName }) => animationName.includes('ghost-tickle-body')),
      ),
    )
    .toBe(true)

  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(trigger).toHaveAttribute('data-tickling', 'true')
})

test('restarts an active tickle reaction', async ({ page }) => {
  await page.goto('/')

  const trigger = (await revealAside(page)).getByTestId('aside-ghost-trigger')

  await trigger.click()
  await page.waitForTimeout(350)

  const elapsedBeforeRestart = await trigger.evaluate((node) => {
    const animation = node
      .getAnimations({ subtree: true })
      .find(({ animationName }) => animationName.includes('ghost-tickle-body'))
    return Number(animation?.currentTime ?? 0)
  })

  await trigger.click()

  await expect
    .poll(() =>
      trigger.evaluate((node) => {
        const animation = node
          .getAnimations({ subtree: true })
          .find(({ animationName }) => animationName.includes('ghost-tickle-body'))
        return Number(animation?.currentTime ?? Number.POSITIVE_INFINITY)
      }),
    )
    .toBeLessThan(elapsedBeforeRestart)
})
```

These tests catch loss of semantic keyboard access, missing interaction state, missing body animation, and a click handler that cannot restart an in-flight CSS animation.

- [ ] **Step 2: Run the new tests and verify RED**

Run:

```powershell
pnpm exec playwright test e2e/aside-ghost.spec.ts --grep "starts the tickle|restarts an active"
```

Expected: tests fail because `aside-ghost-trigger` and tickle state do not exist.

- [ ] **Step 3: Add minimal restartable React state and button semantics**

In `AnimatedGhost.tsx`, import state and add a run counter:

```tsx
import { useCallback, useState } from 'react'

const [tickleRun, setTickleRun] = useState<number | null>(null)

const handleTickle = useCallback(() => {
  setTickleRun((currentRun) => (currentRun ?? 0) + 1)
}, [])

const handleTickleEnd = useCallback(() => {
  setTickleRun(null)
}, [])
```

Wrap the existing SVG in a native button. Keep the SVG test id and dimensions unchanged:

```tsx
<button
  type="button"
  className={styles.trigger}
  aria-label="Пощекотать привидение"
  data-testid="aside-ghost-trigger"
  data-tickling={tickleRun !== null}
  onClick={handleTickle}
>
  <svg>{/* existing SVG content */}</svg>
</button>
```

Inside the SVG, wrap the existing `.sway` group with the keyed reaction layer and conditionally animate the eyes:

```tsx
<g
  key={tickleRun ?? 'idle'}
  className={tickleRun !== null ? styles.tickleBody : undefined}
  onAnimationEnd={handleTickleEnd}
>
  <g className={styles.sway}>{/* existing body and eyes */}</g>
</g>
```

Change the eye group class composition without altering its circles:

```tsx
<g className={`${styles.eyeBlink} ${tickleRun !== null ? styles.eyeGiggle : ''}`}>
```

- [ ] **Step 4: Add the minimal button reset and tickle animations**

In `AnimatedGhost.module.css`, add:

```css
.trigger {
  display: inline-flex;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  border-radius: 50%;
}

.trigger:focus-visible {
  outline: 2px solid var(--g-color-line-brand);
  outline-offset: 3px;
}

.tickleBody {
  transform-box: fill-box;
  transform-origin: center;
  animation: ghost-tickle-body 1.5s cubic-bezier(0.22, 0.75, 0.28, 1) both;
}

.eyeGiggle {
  animation: ghost-giggle-eyes 1.5s ease-out both;
}

@keyframes ghost-tickle-body {
  0%,
  100% {
    transform: scale(1);
  }
  16% {
    transform: scaleX(0.94) scaleY(1.015);
  }
  31% {
    transform: scaleX(1.01) scaleY(0.995);
  }
  45% {
    transform: scaleX(0.965) scaleY(1.01);
  }
  60% {
    transform: scaleX(1.006) scaleY(0.998);
  }
  74% {
    transform: scaleX(0.985) scaleY(1.004);
  }
  88% {
    transform: scaleX(1.003) scaleY(0.999);
  }
}

@keyframes ghost-giggle-eyes {
  0%,
  100% {
    transform: scaleY(1);
  }
  15%,
  43%,
  69% {
    transform: scaleY(0.22);
  }
  28%,
  56%,
  82% {
    transform: scaleY(1);
  }
}
```

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```powershell
pnpm exec playwright test e2e/aside-ghost.spec.ts --grep "starts the tickle|restarts an active"
```

Expected: 2 passed.

- [ ] **Step 6: Commit the interaction**

```powershell
git add src/layout/Aside/components/AnimatedGhost/AnimatedGhost.tsx src/layout/Aside/components/AnimatedGhost/AnimatedGhost.module.css e2e/aside-ghost.spec.ts
git commit -m "feat: add ghost tickle interaction"
```

### Task 3: Settling completion and reduced-motion behavior

**Files:**

- Modify: `src/layout/Aside/components/AnimatedGhost/AnimatedGhost.tsx`
- Modify: `src/layout/Aside/components/AnimatedGhost/AnimatedGhost.module.css`
- Test: `e2e/aside-ghost.spec.ts`

**Interfaces:**

- Consumes: `data-tickling`, `.tickleBody`, `.eyeGiggle`, and existing idle animation layers from Task 2.
- Produces: completion cleanup after 1.5 seconds and eye-only reduced-motion feedback.

- [ ] **Step 1: Write failing completion and reduced-motion tests**

Append:

```ts
test('settles back into the idle animation after tickling', async ({ page }) => {
  await page.goto('/')

  const trigger = (await revealAside(page)).getByTestId('aside-ghost-trigger')
  const ghost = trigger.getByTestId('aside-ghost')

  await trigger.click()
  await expect(trigger).toHaveAttribute('data-tickling', 'true')
  await expect(trigger).toHaveAttribute('data-tickling', 'false', { timeout: 2_000 })

  const animationNames = await ghost.evaluate((node) =>
    node.getAnimations({ subtree: true }).map(({ animationName }) => animationName),
  )

  expect(animationNames.some((name) => name.includes('ghost-bob'))).toBe(true)
  expect(animationNames.some((name) => name.includes('ghost-tickle-body'))).toBe(false)
})

test('uses only brief eye feedback for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const trigger = (await revealAside(page)).getByTestId('aside-ghost-trigger')

  await trigger.click()

  const animationNames = await trigger.evaluate((node) =>
    node.getAnimations({ subtree: true }).map(({ animationName }) => animationName),
  )

  expect(animationNames.some((name) => name.includes('ghost-tickle-body'))).toBe(false)
  expect(animationNames.some((name) => name.includes('ghost-reduced-giggle'))).toBe(true)
  await expect(trigger).toHaveAttribute('data-tickling', 'false', { timeout: 500 })
})
```

These tests catch a reaction state that never clears, a cleanup that removes the idle animation, or reduced-motion styling that still deforms the silhouette.

- [ ] **Step 2: Run the new tests and verify RED**

Run:

```powershell
pnpm exec playwright test e2e/aside-ghost.spec.ts --grep "settles back|brief eye feedback"
```

Expected: the reduced-motion test fails because the global reduced-motion rule suppresses the current reaction without providing eye feedback or cleanup.

- [ ] **Step 3: Complete cleanup without reacting to bubbled child animation events**

Change the body handler in `AnimatedGhost.tsx` so only the body animation clears normal-motion state:

```tsx
const handleTickleBodyEnd = useCallback((event: React.AnimationEvent<SVGGElement>) => {
  if (event.currentTarget === event.target) {
    setTickleRun(null)
  }
}, [])
```

Add a separate eye handler that clears only the reduced-motion reaction. Use `window.matchMedia` at event time so no hydration-dependent state is required:

```tsx
const handleEyeGiggleEnd = useCallback(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setTickleRun(null)
  }
}, [])
```

Attach `handleTickleBodyEnd` to the tickle wrapper and `handleEyeGiggleEnd` to the `.eyeGiggle` group.

- [ ] **Step 4: Add reduced-motion eye-only feedback**

At the end of `AnimatedGhost.module.css`, make the existing reduced-motion block explicitly override the interaction:

```css
@media (prefers-reduced-motion: reduce) {
  .tickleBody {
    animation: none;
  }

  .eyeGiggle {
    animation: ghost-reduced-giggle 180ms ease-out both;
  }
}

@keyframes ghost-reduced-giggle {
  0%,
  100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(0.25);
  }
}
```

Keep the existing rules that disable all idle animation under reduced motion.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```powershell
pnpm exec playwright test e2e/aside-ghost.spec.ts --grep "settles back|brief eye feedback"
```

Expected: 2 passed.

- [ ] **Step 6: Run the full ghost suite**

Run:

```powershell
pnpm exec playwright test e2e/aside-ghost.spec.ts
```

Expected: all tests in the file pass, including the pre-existing idle and reduced-motion tests.

- [ ] **Step 7: Commit completion behavior**

```powershell
git add src/layout/Aside/components/AnimatedGhost/AnimatedGhost.tsx src/layout/Aside/components/AnimatedGhost/AnimatedGhost.module.css e2e/aside-ghost.spec.ts
git commit -m "test: cover ghost settling and reduced motion"
```

### Task 4: Full project verification

**Files:**

- Verify only; no planned production changes.

**Interfaces:**

- Consumes: the complete aside surface and ghost interaction implementation.
- Produces: fresh evidence that formatting, types, lint, unit tests, build, and relevant browser behavior remain valid.

- [ ] **Step 1: Run static and unit checks**

```powershell
pnpm check-format
pnpm check-types
pnpm check-lint
pnpm test
```

Expected: every command exits with code 0 and reports no failures.

- [ ] **Step 2: Run the production build**

```powershell
pnpm build
```

Expected: Next.js production build exits with code 0.

- [ ] **Step 3: Run the focused end-to-end suite once more**

```powershell
pnpm exec playwright test e2e/aside-ghost.spec.ts
```

Expected: all aside ghost tests pass with zero failures.

- [ ] **Step 4: Inspect the final diff**

```powershell
git diff --check HEAD~3..HEAD
git status --short
```

Expected: no whitespace errors; only intended implementation files are changed or committed. Preserve any unrelated user changes.
