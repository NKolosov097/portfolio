# Mobile Aside Swipe-to-Close Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let mobile visitors close the aside profile `Drawer` by swiping left, with the panel following the finger and snapping closed or back to rest depending on distance/speed.

**Architecture:** A pure helper module (`swipeGesture.ts`) decides swipe axis and close/no-close outcomes from plain numbers - fully unit-testable with Vitest, no DOM. A `useSwipeToClose` hook wires `touchstart`/`touchmove`/`touchend`/`touchcancel` listeners onto a ref and writes `element.style.transform` imperatively (no React state per frame). `MobileAside` attaches the hook to its existing `#aside-card` div. Playwright covers the real browser behavior end to end.

**Tech Stack:** React 19, TypeScript (strict), Gravity UI `Drawer`, Vitest 4 (node project), Playwright 1.62.

## Global Constraints

- No new npm dependencies - implement the gesture with native touch events only (per spec's Goals/Non-goals).
- Only a leftward swipe closes the panel; rightward drag is clamped to the resting position and never closes it (per spec Architecture/Gesture logic).
- Desktop `Aside` (`src/layout/Aside/Aside.tsx`) and the `Drawer`'s `placement`/veil behavior are unchanged (per spec Non-goals).
- Respect `prefers-reduced-motion`: the snap-back-to-rest animation is skipped (instant) when the user prefers reduced motion (per spec Gesture logic / Edge cases).
- Strict TypeScript: no `any`, no type assertions; prefix booleans with `is`/`has`; JSDoc on interface/type fields and non-`useState` variables; module-level constants in `UPPER_SNAKE_CASE` (per CLAUDE.md).

---

### Task 1: Pure swipe-gesture helpers

**Files:**

- Create: `src/layout/Aside/hooks/swipeGesture.ts`
- Test: `src/layout/Aside/hooks/swipeGesture.test.ts`

**Interfaces:**

- Produces (consumed by Task 2's hook):
  - `SWIPE_AXIS_LOCK_THRESHOLD_PX: number`
  - `SWIPE_CLOSE_DISTANCE_RATIO: number`
  - `SWIPE_CLOSE_VELOCITY_PX_PER_MS: number`
  - `type TSwipeAxis = 'horizontal' | 'vertical'`
  - `interface ISwipeDelta { dx: number; dy: number }`
  - `resolveSwipeAxis(delta: ISwipeDelta): TSwipeAxis | null`
  - `interface IShouldCloseOnSwipeEndParams { dx: number; durationMs: number; panelWidthPx: number }`
  - `shouldCloseOnSwipeEnd(params: IShouldCloseOnSwipeEndParams): boolean`
  - `clampSwipeTranslateX(dx: number): number`

- [ ] **Step 1: Write the failing tests**

Create `src/layout/Aside/hooks/swipeGesture.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  clampSwipeTranslateX,
  resolveSwipeAxis,
  shouldCloseOnSwipeEnd,
} from '@/layout/Aside/hooks/swipeGesture'

describe('resolveSwipeAxis', () => {
  it('stays undecided below the lock threshold', () => {
    expect(resolveSwipeAxis({ dx: 3, dy: 2 })).toBeNull()
  })

  it('locks horizontal once dx dominates past the threshold', () => {
    expect(resolveSwipeAxis({ dx: -30, dy: 4 })).toBe('horizontal')
  })

  it('locks vertical once dy dominates past the threshold', () => {
    expect(resolveSwipeAxis({ dx: 4, dy: 30 })).toBe('vertical')
  })

  it('treats an equal-magnitude diagonal as vertical', () => {
    expect(resolveSwipeAxis({ dx: -20, dy: 20 })).toBe('vertical')
  })
})

describe('shouldCloseOnSwipeEnd', () => {
  it('closes once the leftward distance passes the ratio of the panel width', () => {
    expect(shouldCloseOnSwipeEnd({ dx: -100, durationMs: 400, panelWidthPx: 390 })).toBe(true)
  })

  it('does not close on a short, slow leftward drag', () => {
    expect(shouldCloseOnSwipeEnd({ dx: -40, durationMs: 400, panelWidthPx: 390 })).toBe(false)
  })

  it('closes on a short but fast flick', () => {
    expect(shouldCloseOnSwipeEnd({ dx: -40, durationMs: 50, panelWidthPx: 390 })).toBe(true)
  })

  it('never closes on a rightward drag', () => {
    expect(shouldCloseOnSwipeEnd({ dx: 250, durationMs: 10, panelWidthPx: 390 })).toBe(false)
  })

  it('falls back to the distance check when duration is zero', () => {
    expect(shouldCloseOnSwipeEnd({ dx: -10, durationMs: 0, panelWidthPx: 390 })).toBe(false)
    expect(shouldCloseOnSwipeEnd({ dx: -200, durationMs: 0, panelWidthPx: 390 })).toBe(true)
  })
})

describe('clampSwipeTranslateX', () => {
  it('passes a leftward delta through unchanged', () => {
    expect(clampSwipeTranslateX(-120)).toBe(-120)
  })

  it('clamps a rightward delta to zero', () => {
    expect(clampSwipeTranslateX(45)).toBe(0)
  })

  it('leaves zero at zero', () => {
    expect(clampSwipeTranslateX(0)).toBe(0)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/layout/Aside/hooks/swipeGesture.test.ts`
Expected: FAIL - `swipeGesture.ts` does not exist yet (module not found).

- [ ] **Step 3: Implement the helpers**

Create `src/layout/Aside/hooks/swipeGesture.ts`:

```ts
/** Minimum total finger movement, in px, before a swipe's axis is decided. */
export const SWIPE_AXIS_LOCK_THRESHOLD_PX = 8

/** Fraction of the panel's width a leftward swipe must cross to count as a close. */
export const SWIPE_CLOSE_DISTANCE_RATIO = 0.25

/** Minimum leftward speed, in px/ms, that closes the panel even under the distance ratio. */
export const SWIPE_CLOSE_VELOCITY_PX_PER_MS = 0.5

/** Which axis a swipe has locked onto, once movement is large enough to tell. */
export type TSwipeAxis = 'horizontal' | 'vertical'

export interface ISwipeDelta {
  /** Horizontal movement since the gesture started, in px (negative = left). */
  dx: number
  /** Vertical movement since the gesture started, in px (negative = up). */
  dy: number
}

/**
 * Decides which axis a swipe belongs to from the movement seen so far.
 * Returns `null` while the movement is still too small to tell (axis stays unlocked).
 */
export const resolveSwipeAxis = ({ dx, dy }: ISwipeDelta): TSwipeAxis | null => {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_AXIS_LOCK_THRESHOLD_PX) {
    return null
  }

  return Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
}

export interface IShouldCloseOnSwipeEndParams {
  /** Horizontal movement over the whole gesture, in px (negative = left). */
  dx: number
  /** Wall-clock duration of the gesture, in ms. */
  durationMs: number
  /** Width of the dragged panel, in px - the distance threshold scales off this. */
  panelWidthPx: number
}

/** Decides whether a finished horizontal swipe should close the panel. Rightward drags never close it. */
export const shouldCloseOnSwipeEnd = ({
  dx,
  durationMs,
  panelWidthPx,
}: IShouldCloseOnSwipeEndParams): boolean => {
  const leftwardDistance = Math.max(0, -dx)
  const velocity = durationMs > 0 ? leftwardDistance / durationMs : 0

  return (
    leftwardDistance > panelWidthPx * SWIPE_CLOSE_DISTANCE_RATIO ||
    velocity > SWIPE_CLOSE_VELOCITY_PX_PER_MS
  )
}

/** Clamps a drag offset so the panel can't be dragged past its resting position. */
export const clampSwipeTranslateX = (dx: number): number => Math.min(0, dx)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/layout/Aside/hooks/swipeGesture.test.ts`
Expected: PASS (14 tests)

- [ ] **Step 5: Commit**

```bash
git add src/layout/Aside/hooks/swipeGesture.ts src/layout/Aside/hooks/swipeGesture.test.ts
git commit -m "feat: add pure swipe-gesture decision helpers for the aside drawer"
```

---

### Task 2: `useSwipeToClose` hook

**Files:**

- Create: `src/layout/Aside/hooks/useSwipeToClose.ts`

**Interfaces:**

- Consumes (from Task 1): `resolveSwipeAxis`, `shouldCloseOnSwipeEnd`, `clampSwipeTranslateX`, `type TSwipeAxis` - exact signatures above.
- Produces (consumed by Task 3):
  - `interface IUseSwipeToCloseParams { ref: RefObject<HTMLElement | null>; onClose: () => void; isEnabled: boolean }`
  - `useSwipeToClose(params: IUseSwipeToCloseParams): void`

There is no automated test for this task in isolation (it's DOM/effect wiring over already-tested pure logic); Task 4's Playwright suite is the test cycle for this hook's actual behavior in a browser. This mirrors the project's existing split - Vitest for pure logic, Playwright for rendered/DOM behavior (see `README.md` § Testing).

- [ ] **Step 1: Implement the hook**

Create `src/layout/Aside/hooks/useSwipeToClose.ts`:

```ts
'use client'

import { type RefObject, useEffect } from 'react'

import {
  clampSwipeTranslateX,
  resolveSwipeAxis,
  shouldCloseOnSwipeEnd,
  type TSwipeAxis,
} from '@/layout/Aside/hooks/swipeGesture'

/** Inline transition applied only while snapping back to rest; drag frames stay transition-free. */
const SNAP_BACK_TRANSITION = 'transform 0.2s ease'

/** Media query used to skip the snap-back animation for visitors who prefer reduced motion. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export interface IUseSwipeToCloseParams {
  /** Element the swipe is read from and dragged via inline `transform`. */
  ref: RefObject<HTMLElement | null>
  /** Called once a swipe crosses the close threshold. */
  onClose: () => void
  /** Gates the listeners; attach only while the panel is actually open. */
  isEnabled: boolean
}

/**
 * Wires touch-driven swipe-to-close onto `ref`: drags it under the finger while a horizontal
 * swipe is in progress, closes past a distance/velocity threshold, otherwise snaps back to rest.
 */
export const useSwipeToClose = ({ ref, onClose, isEnabled }: IUseSwipeToCloseParams): void => {
  useEffect(() => {
    const element = ref.current

    if (!isEnabled || !element) {
      return
    }

    // Clears any leftover drag offset from a previous open/close cycle before this one starts.
    element.style.transform = ''
    element.style.transition = ''

    /** Touch X at gesture start, in viewport px. */
    let startX = 0
    /** Touch Y at gesture start, in viewport px. */
    let startY = 0
    /** `event.timeStamp` at gesture start, used to derive release velocity. */
    let startTime = 0
    /** Axis this gesture has locked onto, or `null` before enough movement to decide. */
    let axis: TSwipeAxis | null = null

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        return
      }

      const [touch] = event.touches

      startX = touch.clientX
      startY = touch.clientY
      startTime = event.timeStamp
      axis = null
      // Stops any in-flight snap-back transition so a re-grab tracks the finger immediately.
      element.style.transition = ''
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        return
      }

      const [touch] = event.touches
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY

      if (axis === null) {
        axis = resolveSwipeAxis({ dx, dy })
      }

      if (axis === 'horizontal') {
        event.preventDefault()
        element.style.transform = `translateX(${clampSwipeTranslateX(dx)}px)`
      }
    }

    const endGesture = (event: TouchEvent) => {
      const isHorizontalSwipe = axis === 'horizontal'

      axis = null

      if (!isHorizontalSwipe) {
        return
      }

      const [touch] = event.changedTouches
      const dx = touch.clientX - startX
      const durationMs = event.timeStamp - startTime

      if (shouldCloseOnSwipeEnd({ dx, durationMs, panelWidthPx: element.offsetWidth })) {
        onClose()

        return
      }

      const isReducedMotionPreferred = window.matchMedia(REDUCED_MOTION_QUERY).matches

      if (!isReducedMotionPreferred) {
        element.style.transition = SNAP_BACK_TRANSITION
      }

      element.style.transform = ''
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', endGesture)
    element.addEventListener('touchcancel', endGesture)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', endGesture)
      element.removeEventListener('touchcancel', endGesture)
    }
  }, [ref, onClose, isEnabled])
}
```

Note the deliberate absence of a style reset in the cleanup function: when the gesture itself
calls `onClose()`, `isEnabled` flips to `false` and this effect tears down immediately - resetting
`transform` there would snap the dragged content back to `0` for one frame right before the
`Drawer`'s own exit animation starts, which reads as a visible jump. Leaving the inline `transform`
in place lets it exit together with the `Drawer`. The reset at the top of the effect guarantees the
next time the drawer opens, it starts from a clean slate regardless of how the previous one closed.

- [ ] **Step 2: Type-check**

Run: `pnpm check-types`
Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/layout/Aside/hooks/useSwipeToClose.ts
git commit -m "feat: add useSwipeToClose touch-gesture hook"
```

---

### Task 3: Wire the hook into `MobileAside`

**Files:**

- Modify: `src/layout/Aside/components/MobileAside/MobileAside.tsx`
- Modify: `src/layout/Aside/aside.module.css`

**Interfaces:**

- Consumes (from Task 2): `useSwipeToClose({ ref, onClose, isEnabled }): void`

- [ ] **Step 1: Attach a ref and the hook in `MobileAside`**

Modify `src/layout/Aside/components/MobileAside/MobileAside.tsx`:

```tsx
'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import styles from '@/layout/Aside/aside.module.css'

import { Button, Drawer } from '@gravity-ui/uikit'

import { AsideContent } from '@/layout/Aside/components/AsideContent/AsideContent'

import { useSwipeToClose } from '@/layout/Aside/hooks/useSwipeToClose'
import { useAsideStore } from '@/providers/stores/AsideStore.provider'
import { CircleXmark } from '@gravity-ui/icons'

export const MobileAside = () => {
  const { t } = useTranslation()

  const { isOpenDrawer, setIsOpenDrawer } = useAsideStore((state) => state)

  const cardRef = useRef<HTMLDivElement>(null)

  const handleCloseDrawer = useCallback(() => {
    setIsOpenDrawer(false)
  }, [])

  useSwipeToClose({ ref: cardRef, onClose: handleCloseDrawer, isEnabled: isOpenDrawer })

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsOpenDrawer(false)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <Drawer
      open={isOpenDrawer}
      onOpenChange={(isOpen) => !isOpen && handleCloseDrawer()}
      className={styles.drawer}
      contentClassName={styles.drawerItem}
    >
      <div
        id="aside-card"
        ref={cardRef}
        data-testid="aside-drawer"
        className={styles.drawerItemContent}
      >
        <Button
          data-testid="aside-close-profile"
          view="flat"
          pin="circle-circle"
          size="m"
          aria-label={t('aside.closeProfile')}
          className={styles.closeIcon}
          onClick={handleCloseDrawer}
        >
          <CircleXmark />
        </Button>
        <AsideContent />
      </div>
    </Drawer>
  )
}
```

- [ ] **Step 2: Let the browser's native vertical scroll win by default**

In `src/layout/Aside/aside.module.css`, add `touch-action: pan-y;` to `.drawerItemContent` so the
browser doesn't fight our `touchmove` handler for the vertical axis before it locks:

```css
.drawerItemContent {
  position: relative;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  max-height: 100vh;
  max-height: 100dvh;
  padding: 10px;
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  background-color: var(--aside-bg-color);
}
```

- [ ] **Step 3: Type-check and lint**

Run: `pnpm check-types && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Manual smoke check**

Run: `pnpm dev`, open the site at a viewport ≤1024px wide (or use browser dev tools' device
toolbar), open the aside via the header button, and drag left on the panel with a mouse (Chrome
DevTools' touch emulation forwards mouse drags as touch events when device toolbar is active).
Confirm the panel follows the drag and either closes or snaps back depending on distance.

- [ ] **Step 5: Commit**

```bash
git add src/layout/Aside/components/MobileAside/MobileAside.tsx src/layout/Aside/aside.module.css
git commit -m "feat: swipe left to close the mobile aside drawer"
```

---

### Task 4: Playwright coverage for the swipe gesture

**Files:**

- Create: `e2e/aside-swipe.spec.ts`

**Interfaces:**

- Consumes (from `e2e/helpers/aside.ts`): `revealAside(page: Page): Promise<Locator>`

- [ ] **Step 1: Write the failing e2e tests**

Create `e2e/aside-swipe.spec.ts`:

```ts
import { expect, type Locator, test } from '@playwright/test'

import { revealAside } from './helpers/aside'

/** Dispatches a synthetic single-finger touch event on `locator`'s element at the given point. */
const dispatchTouch = (
  locator: Locator,
  type: 'touchstart' | 'touchmove' | 'touchend',
  clientX: number,
  clientY: number,
) =>
  locator.evaluate(
    (node, { type, clientX, clientY }) => {
      const touch = new Touch({ identifier: 0, target: node, clientX, clientY })
      const isEnd = type === 'touchend'

      node.dispatchEvent(
        new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: isEnd ? [] : [touch],
          changedTouches: [touch],
        }),
      )
    },
    { type, clientX, clientY },
  )

/** Plays back a left/right/up/down drag as touchstart, a few touchmove steps, then touchend. */
const swipe = async (
  locator: Locator,
  { fromX, fromY, toX, toY }: { fromX: number; fromY: number; toX: number; toY: number },
) => {
  const steps = 5

  await dispatchTouch(locator, 'touchstart', fromX, fromY)

  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps

    await dispatchTouch(
      locator,
      'touchmove',
      fromX + (toX - fromX) * progress,
      fromY + (toY - fromY) * progress,
    )
  }

  await dispatchTouch(locator, 'touchend', toX, toY)
}

test.describe('mobile aside swipe-to-close', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
  })

  test('closes when swiping left past the distance threshold', async ({ page }) => {
    await page.goto('/')

    const drawer = await revealAside(page)

    test.skip(
      !(await drawer.evaluate(() => typeof window.TouchEvent === 'function')),
      'this browser project does not implement the TouchEvent constructor',
    )

    await swipe(drawer, { fromX: 340, fromY: 400, toX: 40, toY: 400 })

    await expect(drawer).toBeHidden()
  })

  test('snaps back on a short, slow leftward drag', async ({ page }) => {
    await page.goto('/')

    const drawer = await revealAside(page)

    test.skip(
      !(await drawer.evaluate(() => typeof window.TouchEvent === 'function')),
      'this browser project does not implement the TouchEvent constructor',
    )

    await dispatchTouch(drawer, 'touchstart', 340, 400)
    await dispatchTouch(drawer, 'touchmove', 300, 400)
    // Slows the drag down so release velocity stays under the flick threshold.
    await page.waitForTimeout(200)
    await dispatchTouch(drawer, 'touchend', 300, 400)

    await expect(drawer).toBeVisible()
  })

  test('leaves a vertical drag inside the content to native scrolling', async ({ page }) => {
    await page.goto('/')

    const drawer = await revealAside(page)

    test.skip(
      !(await drawer.evaluate(() => typeof window.TouchEvent === 'function')),
      'this browser project does not implement the TouchEvent constructor',
    )

    await swipe(drawer, { fromX: 195, fromY: 700, toX: 195, toY: 200 })

    await expect(drawer).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the tests to verify the first one fails**

Run: `pnpm exec playwright test e2e/aside-swipe.spec.ts --project=mobile-chrome`
Expected: FAIL on `closes when swiping left past the distance threshold` - `useSwipeToClose` is
already implemented by this point in the plan, so if this fails, re-check Task 3's wiring before
proceeding (there is no separate "before" state to compare against, since this task runs after
the feature is built - the point of this step is to confirm the test actually exercises the
gesture rather than trivially passing).

If it does NOT fail (i.e. it already passes), skip to Step 4 - Task 3 already made this pass.

- [ ] **Step 3: Fix any wiring issues found**

If the test fails for a reason other than a missing feature (e.g. wrong test id, wrong viewport
assumption), fix the test or the component per whatever the failure message indicates, referring
back to Task 3's `MobileAside.tsx` changes.

- [ ] **Step 4: Run the full spec to verify all three tests pass**

Run: `pnpm exec playwright test e2e/aside-swipe.spec.ts --project=mobile-chrome --project=mobile-safari --project=mobile-firefox`
Expected: PASS, or a clean `skipped` for any project whose browser lacks the `TouchEvent`
constructor.

- [ ] **Step 5: Run the existing mobile-drawer and aside-ghost specs for regressions**

Run: `pnpm exec playwright test e2e/mobile-drawer.spec.ts e2e/aside-ghost.spec.ts`
Expected: PASS - confirms the new `touch-action` CSS and ref wiring didn't break the existing
open/close-by-button and ghost-animation coverage.

- [ ] **Step 6: Commit**

```bash
git add e2e/aside-swipe.spec.ts
git commit -m "test: cover swipe-to-close for the mobile aside drawer"
```

---

## Final Validation

- [ ] Run `pnpm check-types && pnpm lint` - must be clean before considering this plan done (per
      CLAUDE.md's Validation section).
- [ ] Run `pnpm test` (Vitest) - confirms Task 1's helpers still pass alongside the rest of the
      suite.
- [ ] Run `pnpm test:e2e` - confirms the full Playwright suite (all six projects) passes, not just
      the new spec.
