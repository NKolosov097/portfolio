import { type Page } from '@playwright/test'

/**
 * Default ceiling, for callers that read computed styles after the seek. Those are correct the
 * moment currentTime is set, so the frame is a courtesy and the wait should stay cheap - one
 * caller runs it 116 times in a single test.
 */
const FRAME_WAIT_CEILING_MS = 250

/**
 * Ceiling for callers that screenshot after the seek. A capture is only as good as the frame
 * behind it, so here the frame is the point rather than a courtesy, and the cap exists purely to
 * stop a dead compositor hanging the test. WebKit was measured at ~126ms per frame with two
 * contexts side by side and spikes well past that under load, which 250ms does not cover.
 */
export const PAINT_CEILING_MS = 2_000

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
export const waitForPaint = (page: Page, ceilingMs = FRAME_WAIT_CEILING_MS): Promise<void> =>
  page.evaluate(
    (ceiling) =>
      new Promise<void>((resolve) => {
        let hasSettled = false
        const settle = () => {
          if (hasSettled) return
          hasSettled = true
          resolve()
        }
        requestAnimationFrame(() => requestAnimationFrame(settle))
        setTimeout(settle, ceiling)
      }),
    ceilingMs,
  )
