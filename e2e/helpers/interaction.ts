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
 * Clicks once the target has stopped moving. Popups animate into place and the header tab strip
 * re-measures after mount, so a click sent too early lands where the target no longer is.
 */
export const clickWhenSettled = async (locator: Locator): Promise<void> => {
  await expect(locator).toBeVisible()
  await expect.poll(() => isSettledHitTarget(locator)).toBe(true)

  await locator.click()
}
