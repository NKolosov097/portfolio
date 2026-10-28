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
    /**
     * Two equal boxes cannot tell a finished animation from a stalled one. The drawer slide
     * starves for frames while the aside mounts and holds one position for 50-130ms mid-flight,
     * which reads as settled and sends the click to where the target no longer is. Ask the
     * animation instead: whatever moves this node runs on the node or one of its ancestors.
     * Endless idle motion is left to the sampling below, which is all that can judge it.
     */
    const isCarriedByRunningAnimation = document.getAnimations().some((animation) => {
      if (animation.playState !== 'running') return false
      const effect = animation.effect as KeyframeEffect | null
      if (effect?.getTiming().iterations === Infinity) return false
      return effect?.target instanceof Element && effect.target.contains(node)
    })

    if (isCarriedByRunningAnimation) {
      return false
    }

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

  /**
   * A DOM scroll rather than `scrollIntoViewIfNeeded`, which first waits for Playwright's own
   * stability check - two matching bounding boxes an animation frame apart. The hero runs a
   * permanent canvas animation, and frame scheduling degrades under concurrency, so that wait can
   * outlast the whole test budget. The probe below already covers coming to rest.
   */
  await locator.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' }))

  await expect.poll(() => isSettledHitTarget(locator), { timeout: SETTLE_TIMEOUT }).toBe(true)

  await locator.click({ force: true })
}
