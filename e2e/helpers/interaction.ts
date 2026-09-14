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

/** Waits until a visible target has stopped moving and owns its center point. */
export const waitUntilSettled = async (locator: Locator): Promise<void> => {
  await expect(locator).toBeVisible()

  await locator.scrollIntoViewIfNeeded()

  await expect.poll(() => isSettledHitTarget(locator)).toBe(true)
}

/** Clicks a target only after it has stopped moving. */
export const clickWhenSettled = async (locator: Locator): Promise<void> => {
  await waitUntilSettled(locator)

  await locator.click()
}
