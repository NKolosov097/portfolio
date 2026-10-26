import { expect, type Locator } from '@playwright/test'

/**
 * Gap between the two position reads, in milliseconds. Long enough that any running animation
 * moves a measurable distance, short enough to stay cheap inside a poll.
 *
 * Deliberately a timer rather than `requestAnimationFrame`. Measured in WebKit against this app:
 * one page runs rAF at ~51 ms per frame, but two contexts side by side push it to ~126 ms and a
 * loaded CI runner stalls it further - while `setTimeout` holds ~15 ms throughout. A frame-based
 * probe therefore spends its whole poll budget waiting to be scheduled and reports
 * `Timeout exceeded while waiting on the predicate` even though the element came to rest long ago.
 */
const SETTLE_SAMPLE_MS = 32

/** Resolves to `true` once the element has stopped moving and owns the point a click would land on. */
const isSettledHitTarget = (locator: Locator): Promise<boolean> =>
  locator.evaluate(async (node, sampleMs: number) => {
    const previous = node.getBoundingClientRect()

    await new Promise<void>((resolve) => setTimeout(resolve, sampleMs))

    const { top, left, width, height } = node.getBoundingClientRect()

    if (top !== previous.top || left !== previous.left || width !== previous.width) {
      return false
    }

    return node.contains(document.elementFromPoint(left + width / 2, top + height / 2))
  }, SETTLE_SAMPLE_MS)

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
