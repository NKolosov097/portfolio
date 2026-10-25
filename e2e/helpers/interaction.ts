import { expect, type Locator } from '@playwright/test'

/** Resolves to `true` once the element has stopped moving and owns the point a click would land on. */
const isSettledHitTarget = (locator: Locator): Promise<boolean> =>
  locator.evaluate(async (node) => {
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    const previous = node.getBoundingClientRect()

    await nextFrame()

    const { top, left, width, height } = node.getBoundingClientRect()

    if (top !== previous.top || left !== previous.left || width !== previous.width) {
      return false
    }

    return node.contains(document.elementFromPoint(left + width / 2, top + height / 2))
  })

/**
 * Ceiling for an animation to come to rest. This gates a click rather than asserting anything, so
 * it tracks how slow the machine is, not how long the UI is allowed to take.
 */
const SETTLE_TIMEOUT = 30_000

/**
 * Clicks once the target has stopped moving. Popups animate into place and the header tab strip
 * re-measures after mount, so a click sent too early lands where the target no longer is.
 */
export const clickWhenSettled = async (locator: Locator): Promise<void> => {
  await expect(locator).toBeVisible()

  await locator.scrollIntoViewIfNeeded()

  await expect.poll(() => isSettledHitTarget(locator), { timeout: SETTLE_TIMEOUT }).toBe(true)

  await locator.click({ force: true })
}
