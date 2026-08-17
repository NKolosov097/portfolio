import { expect, type Locator, test } from '@playwright/test'

import { revealAside } from './helpers/aside'

/**
 * Whether this browser can construct synthetic touch events at all. WebKit exposes a `Touch`
 * global (so `typeof window.Touch` alone is not a reliable check), but throws "Illegal
 * constructor" when it's actually called with `new` — only Chromium and Firefox support that.
 */
const hasSyntheticTouchSupport = (locator: Locator) =>
  locator.evaluate((node) => {
    try {
      new Touch({ identifier: 0, target: node, clientX: 0, clientY: 0 })

      return true
    } catch {
      return false
    }
  })

/** Dispatches a synthetic single-finger touch event on `locator`'s element at the given point. */
const dispatchTouch = (
  locator: Locator,
  type: 'touchstart' | 'touchmove' | 'touchend',
  clientX: number,
  clientY: number,
) =>
  locator.evaluate(
    (node, touchInit) => {
      const touch = new Touch({
        identifier: 0,
        target: node,
        clientX: touchInit.clientX,
        clientY: touchInit.clientY,
      })
      const isEnd = touchInit.type === 'touchend'

      node.dispatchEvent(
        new TouchEvent(touchInit.type, {
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
      !(await hasSyntheticTouchSupport(drawer)),
      'this browser project does not implement synthetic touch events',
    )

    await swipe(drawer, { fromX: 340, fromY: 400, toX: 40, toY: 400 })

    await expect(drawer).toBeHidden()
  })

  test('snaps back on a short, slow leftward drag', async ({ page }) => {
    await page.goto('/')

    const drawer = await revealAside(page)

    test.skip(
      !(await hasSyntheticTouchSupport(drawer)),
      'this browser project does not implement synthetic touch events',
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
      !(await hasSyntheticTouchSupport(drawer)),
      'this browser project does not implement synthetic touch events',
    )

    await swipe(drawer, { fromX: 195, fromY: 700, toX: 195, toY: 200 })

    await expect(drawer).toBeVisible()
  })
})
