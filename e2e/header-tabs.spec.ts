import { expect, test } from '@playwright/test'

/** Viewport below the breakpoint where the header tab strip switches to its compact metrics. */
const NARROW_VIEWPORT = { width: 393, height: 851 }

/** How long the in-page recorder keeps sampling tab widths after navigation, in milliseconds. */
const SAMPLE_WINDOW_MS = 1_000

declare global {
  interface Window {
    /** Width of the first header tab captured on every animation frame after navigation. */
    headerTabWidthSamples?: number[]
  }
}

/**
 * Runs before any page script so the first sample lands on the first painted frame - a width read
 * over the Playwright wire would arrive too late to catch a shift that settles within ~100ms.
 */
const recordHeaderTabWidths = (sampleWindowMs: number) => {
  window.headerTabWidthSamples = []

  const startedAt = performance.now()

  const sample = () => {
    const tab = document.querySelector('[role="tab"]')

    if (tab) {
      window.headerTabWidthSamples?.push(Math.round(tab.getBoundingClientRect().width * 100) / 100)
    }

    if (performance.now() - startedAt < sampleWindowMs) {
      requestAnimationFrame(sample)
    }
  }

  requestAnimationFrame(sample)
}

test.describe('header tabs layout stability', () => {
  test.use({ viewport: NARROW_VIEWPORT })

  test('keeps the compact tab strip at its settled width from the first frame', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.addInitScript(recordHeaderTabWidths, SAMPLE_WINDOW_MS)
    await page.reload({ waitUntil: 'commit' })
    await page.waitForTimeout(SAMPLE_WINDOW_MS + 500)

    const widths = await page.evaluate(() => window.headerTabWidthSamples ?? [])
    const settledWidth = widths.at(-1)

    expect(widths.length).toBeGreaterThan(0)
    expect([...new Set(widths)]).toEqual([settledWidth])
  })
})
