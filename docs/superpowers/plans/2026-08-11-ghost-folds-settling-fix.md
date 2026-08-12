# Ghost Folds and Settling Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the click reaction visibly fold the ghost inward and settle back into the current idle phase without a remount jump.

**Architecture:** Keep every existing idle SVG node permanently mounted. Replace keyed CSS reaction wrappers with restartable Web Animations attached to stable body, eye, and crease refs; canceling and replaying those animations restarts the tickle without resetting idle animation timelines.

**Tech Stack:** Next.js 16, React 19, TypeScript, SVG, Web Animations API, CSS Modules, Playwright.

## Global Constraints

- The reaction lasts approximately 1.8 seconds and contains three decreasing compressions.
- The strongest horizontal compression must be clearly visible while the ghost remains centered.
- Two or three curved crease lines appear beside each boundary, then flatten visually and fade before completion.
- Clearing interaction state must not replace the idle SVG nodes or reset their animation timing.
- Repeated pointer or keyboard activation restarts the active reaction.
- `prefers-reduced-motion: reduce` keeps only one brief eye narrowing.
- All commits must use the repository's configured `Nikita Kolosov <n.kolosov2003@mail.ru>` identity; never add Codex or OpenAI authorship or trailers.

---

## File Structure

- Create `src/layout/Aside/components/AnimatedGhost/ghostTickle.ts`: own the typed Web Animation keyframes, timing, restart, cancellation, and reduced-motion branch.
- Create `src/layout/Aside/components/AnimatedGhost/ghostTickle.dom.test.ts`: unit-test stable animation orchestration in the project's jsdom test project without React remounts.
- Modify `src/layout/Aside/components/AnimatedGhost/AnimatedGhost.tsx`: keep stable refs, render crease paths, and invoke the animation controller.
- Modify `src/layout/Aside/components/AnimatedGhost/AnimatedGhost.module.css`: style neutral crease paths and remove obsolete tickle keyframes.
- Modify `e2e/aside-ghost.spec.ts`: verify visible compression, visible folds, smooth idle continuity, restart, completion, and reduced motion.

### Task 1: Stable tickle animation controller

**Files:**
- Create: `src/layout/Aside/components/AnimatedGhost/ghostTickle.ts`
- Create: `src/layout/Aside/components/AnimatedGhost/ghostTickle.dom.test.ts`

**Interfaces:**
- Consumes: stable `SVGGElement` references for body, eyes, and crease groups; `prefersReducedMotion: boolean`; `onFinish: () => void`.
- Produces: `startGhostTickle(elements, options): GhostTickleRun` where `GhostTickleRun` exposes `cancel(): void` and `body: Animation | null`.

- [ ] **Step 1: Write failing controller tests**

Create `ghostTickle.dom.test.ts` with real DOM elements and a small WAAPI-compatible fake on each element:

```ts
import { describe, expect, test, vi } from 'vitest'

import { startGhostTickle } from './ghostTickle'

const createAnimatedGroup = () => {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const cancel = vi.fn()
  const animation = { cancel, id: '', onfinish: null } as unknown as Animation
  const animate = vi.fn(() => animation)
  group.animate = animate

  return { group, animation, animate, cancel }
}

test('compresses the stable body three times and settles at its exact neutral transform', () => {
  const body = createAnimatedGroup()
  const eyes = createAnimatedGroup()
  const leftCreases = createAnimatedGroup()
  const rightCreases = createAnimatedGroup()

  startGhostTickle(
    {
      body: body.group,
      eyes: eyes.group,
      leftCreases: leftCreases.group,
      rightCreases: rightCreases.group,
    },
    { prefersReducedMotion: false, onFinish: vi.fn() },
  )

  const bodyFrames = body.animate.mock.calls[0][0] as Keyframe[]
  const horizontalScales = bodyFrames.map(({ transform }) => String(transform))

  expect(horizontalScales).toContain('scaleX(0.84) scaleY(1.035)')
  expect(horizontalScales.at(-1)).toBe('scaleX(1) scaleY(1)')
  expect(body.animate.mock.calls[0][1]).toMatchObject({ duration: 1_800, fill: 'none' })
})

test('reveals both crease groups during compression and hides them before completion', () => {
  const body = createAnimatedGroup()
  const eyes = createAnimatedGroup()
  const leftCreases = createAnimatedGroup()
  const rightCreases = createAnimatedGroup()

  startGhostTickle(
    {
      body: body.group,
      eyes: eyes.group,
      leftCreases: leftCreases.group,
      rightCreases: rightCreases.group,
    },
    { prefersReducedMotion: false, onFinish: vi.fn() },
  )

  for (const crease of [leftCreases, rightCreases]) {
    const frames = crease.animate.mock.calls[0][0] as Keyframe[]
    expect(frames.some(({ opacity }) => Number(opacity) >= 0.8)).toBe(true)
    expect(frames.at(-1)?.opacity).toBe(0)
  }
})

test('uses only the eye animation for reduced motion', () => {
  const body = createAnimatedGroup()
  const eyes = createAnimatedGroup()
  const leftCreases = createAnimatedGroup()
  const rightCreases = createAnimatedGroup()

  startGhostTickle(
    {
      body: body.group,
      eyes: eyes.group,
      leftCreases: leftCreases.group,
      rightCreases: rightCreases.group,
    },
    { prefersReducedMotion: true, onFinish: vi.fn() },
  )

  expect(body.animate).not.toHaveBeenCalled()
  expect(leftCreases.animate).not.toHaveBeenCalled()
  expect(rightCreases.animate).not.toHaveBeenCalled()
  expect(eyes.animate).toHaveBeenCalledOnce()
})
```

These tests catch weakened compression, missing folds, a non-neutral final frame, and displacement under reduced motion.

- [ ] **Step 2: Run the tests and verify RED**

```powershell
pnpm.cmd test src/layout/Aside/components/AnimatedGhost/ghostTickle.dom.test.ts
```

Expected: FAIL because `ghostTickle.ts` and `startGhostTickle` do not exist.

- [ ] **Step 3: Implement the minimal controller**

Create `ghostTickle.ts` with these public types and behavior:

```ts
export interface IGhostTickleElements {
  body: SVGGElement
  eyes: SVGGElement
  leftCreases: SVGGElement
  rightCreases: SVGGElement
}

export interface IStartGhostTickleOptions {
  prefersReducedMotion: boolean
  onFinish: () => void
}

export interface IGhostTickleRun {
  body: Animation | null
  cancel: () => void
}
```

Use body keyframes with offsets `0, .16, .3, .45, .58, .72, .84, 1`, strongest transform `scaleX(0.84) scaleY(1.035)`, two weaker compressions, and exact final `scaleX(1) scaleY(1)`. Use `{ duration: 1_800, easing: 'cubic-bezier(.22,.75,.28,1)', fill: 'none' }` and set `animation.id = 'ghost-tickle-body'`.

Animate each crease group from opacity `0` to at least `.85` during the first compression, use weaker opacity peaks for the next two compressions, and end at opacity `0`. Set ids `ghost-tickle-left-creases` and `ghost-tickle-right-creases`.

Animate the eyes through three `scaleY(.2)` giggles and end at `scaleY(1)`. For reduced motion, animate only the eyes for `180ms`, set id `ghost-reduced-giggle`, and call `onFinish` from that animation. For normal motion, call `onFinish` only from the body animation. `cancel()` cancels every animation created by the run.

- [ ] **Step 4: Run the controller tests and verify GREEN**

```powershell
pnpm.cmd test src/layout/Aside/components/AnimatedGhost/ghostTickle.dom.test.ts
```

Expected: all controller tests pass.

- [ ] **Step 5: Commit using the configured user identity**

```powershell
git add src/layout/Aside/components/AnimatedGhost/ghostTickle.ts src/layout/Aside/components/AnimatedGhost/ghostTickle.dom.test.ts
git commit -m "feat: add stable ghost tickle controller"
```

### Task 2: Stable SVG nodes and visible crease artwork

**Files:**
- Modify: `src/layout/Aside/components/AnimatedGhost/AnimatedGhost.tsx`
- Modify: `src/layout/Aside/components/AnimatedGhost/AnimatedGhost.module.css`
- Modify: `e2e/aside-ghost.spec.ts`

**Interfaces:**
- Consumes: `startGhostTickle` and `IGhostTickleRun` from Task 1.
- Produces: stable `data-testid="aside-ghost-body"`, `aside-ghost-left-creases`, and `aside-ghost-right-creases` SVG groups.

- [ ] **Step 1: Replace the completion e2e test with failing continuity and fold assertions**

In `e2e/aside-ghost.spec.ts`, extend the settling test:

```ts
test('folds inward and settles without remounting the idle layers', async ({ page }) => {
  await page.goto('/')

  const trigger = (await revealAside(page)).getByTestId('aside-ghost-trigger')
  const body = trigger.getByTestId('aside-ghost-body')
  const sway = trigger.locator('[data-idle-layer="sway"]')
  const leftCreases = trigger.getByTestId('aside-ghost-left-creases')

  await sway.evaluate((node) => node.setAttribute('data-continuity-probe', 'preserved'))
  await trigger.click()

  await expect
    .poll(() => body.evaluate((node) => getComputedStyle(node).transform))
    .not.toBe('none')
  await expect
    .poll(() => leftCreases.evaluate((node) => Number(getComputedStyle(node).opacity)))
    .toBeGreaterThan(0.5)

  await expect(trigger).toHaveAttribute('data-tickling', 'false', { timeout: 2_300 })
  await expect(sway).toHaveAttribute('data-continuity-probe', 'preserved')
  await expect(body).toHaveCSS('transform', 'none')
  await expect(leftCreases).toHaveCSS('opacity', '0')
})
```

Update animation lookup in restart and reduced-motion tests to read `animation.id` instead of casting to `CSSAnimation.animationName`.

- [ ] **Step 2: Run the new e2e test and verify RED**

```powershell
pnpm.cmd build
pnpm.cmd exec playwright test e2e/aside-ghost.spec.ts --project=chromium --grep "folds inward"
```

Expected: FAIL because crease test ids and stable body refs do not exist, and the keyed subtree loses the continuity probe.

- [ ] **Step 3: Render stable groups and start the controller**

In `AnimatedGhost.tsx`:

- Replace `tickleRun` with boolean `isTickling`.
- Add refs for body, eyes, left creases, right creases, and the current `IGhostTickleRun`.
- Remove `key={tickleRun ?? 'idle'}` and all CSS tickle classes.
- On activation, cancel the current run and call `startGhostTickle` on the same referenced nodes.
- In `onFinish`, clear the run ref and set `isTickling(false)`.
- On unmount, cancel the active run.
- Add `data-idle-layer="sway"` to the existing sway group.
- Add `data-testid="aside-ghost-body"` to the stable wrapper.

Render two crease groups inside the body wrapper, using three short curved paths on each side:

```tsx
<g ref={leftCreasesRef} className={styles.creases} data-testid="aside-ghost-left-creases">
  <path d="M3.6 5.2 Q4.35 5.55 3.75 6.1" />
  <path d="M3.15 7.1 Q4.05 7.5 3.3 8.05" />
  <path d="M3.45 9 Q4.25 9.35 3.65 9.95" />
</g>
<g ref={rightCreasesRef} className={styles.creases} data-testid="aside-ghost-right-creases">
  <path d="M12.4 5.2 Q11.65 5.55 12.25 6.1" />
  <path d="M12.85 7.1 Q11.95 7.5 12.7 8.05" />
  <path d="M12.55 9 Q11.75 9.35 12.35 9.95" />
</g>
```

- [ ] **Step 4: Style neutral crease lines and remove obsolete CSS reactions**

In `AnimatedGhost.module.css`, remove `.tickleBody`, `.eyeGiggle`, and their tickle/reduced-giggle keyframes. Add:

```css
.creases {
  opacity: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 0.42;
  stroke-linecap: round;
  stroke-linejoin: round;
  pointer-events: none;
  transform-box: fill-box;
  transform-origin: center;
}
```

Keep all idle CSS keyframes unchanged.

- [ ] **Step 5: Build and verify GREEN**

```powershell
pnpm.cmd build
pnpm.cmd exec playwright test e2e/aside-ghost.spec.ts --project=chromium
```

Expected: all Chromium aside-ghost tests pass; the continuity probe survives completion.

- [ ] **Step 6: Commit using the configured user identity**

```powershell
git add src/layout/Aside/components/AnimatedGhost/AnimatedGhost.tsx src/layout/Aside/components/AnimatedGhost/AnimatedGhost.module.css e2e/aside-ghost.spec.ts
git commit -m "fix: settle ghost tickle without idle reset"
```

### Task 3: Full verification and authorship audit

**Files:**
- Verify only.

**Interfaces:**
- Consumes: completed stable animation implementation.
- Produces: fresh verification evidence and an authorship report before integration.

- [ ] **Step 1: Run project checks**

```powershell
pnpm.cmd check-format
pnpm.cmd check-types
pnpm.cmd check-lint
pnpm.cmd test
pnpm.cmd build
```

Expected: format, types, unit tests, and build exit 0; lint has 0 errors (the five existing hook warnings may remain).

- [ ] **Step 2: Run supported browser verification**

```powershell
pnpm.cmd exec playwright test e2e/aside-ghost.spec.ts --project=chromium --project=mobile-chrome --project=safari --project=mobile-safari
```

Expected: every selected Chromium/WebKit test passes. Separately reproduce Firefox `browserContext.newPage()`; if the environment-level Playwright failure remains before navigation, report it without attributing it to application code.

- [ ] **Step 3: Audit diff, worktree, and Git identity**

```powershell
git diff --check
git status --short
git log main..HEAD --format="%h | %an <%ae> | %cn <%ce> | %s"
```

Expected: no whitespace errors, no unrelated tracked changes, and every author/committer is `Nikita Kolosov <n.kolosov2003@mail.ru>`.
