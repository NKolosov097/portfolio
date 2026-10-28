import { type Page } from '@playwright/test'

/**
 * Ceiling on a frame wait, in milliseconds. Long enough that a healthy page always delivers its
 * two frames first, short enough that a stalled compositor costs a fraction of a test budget.
 */
const FRAME_WAIT_CEILING_MS = 250

/**
 * Waits for the page to paint after a seek, without betting the test on it.
 *
 * Two frames are what WebKit needs before a seeked animation shows up in computed styles and in a
 * screenshot, so a real frame is still preferred. Blocking on one is the trap: this repo measured
 * rAF at ~51ms per frame on a single page, ~126ms with two contexts side by side, and stalling
 * much further on a loaded CI runner, while `setTimeout` held ~15ms throughout - see the note on
 * SETTLE_SAMPLE_MS in ./interaction. An uncapped wait of this shape consumed a whole 90s budget
 * on mobile Safari. Racing the frames against a timer keeps the accuracy and drops the stall:
 * styles are already current when the timer wins, since a seek applies synchronously.
 */
export const waitForPaint = (page: Page): Promise<void> =>
  page.evaluate(
    (ceilingMs) =>
      new Promise<void>((resolve) => {
        let hasSettled = false
        const settle = () => {
          if (hasSettled) return
          hasSettled = true
          resolve()
        }
        requestAnimationFrame(() => requestAnimationFrame(settle))
        setTimeout(settle, ceilingMs)
      }),
    FRAME_WAIT_CEILING_MS,
  )
