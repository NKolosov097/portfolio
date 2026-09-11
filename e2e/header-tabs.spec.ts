import { expect, test } from '@playwright/test'

/** Viewport below the breakpoint where the header tab strip switches to its compact metrics. */
const NARROW_VIEWPORT = { width: 393, height: 851 }

/** Observe the first second in which the tabs are present, including the hydration frames. */
const SAMPLE_WINDOW_MS = 1_000

const COMPACT_METRICS = { height: '36px', gap: '24px', fontSize: '13px', lineHeight: '18px' }
const LARGE_METRICS = { height: '40px', gap: '28px', fontSize: '15px', lineHeight: '20px' }

declare global {
  interface Window {
    headerTabMetricSamples?: (typeof COMPACT_METRICS)[]
    headerTabSamplingDone?: boolean
  }
}

/**
 * Runs before page scripts to catch a post-mount size switch. Read the size metrics rather than
 * glyph widths: Inter uses font-display: swap, so loading it can change widths without changing these metrics.
 */
const recordHeaderTabMetrics = (sampleWindowMs: number) => {
  window.headerTabMetricSamples = []
  window.headerTabSamplingDone = false
  let startedAt: number | undefined

  const sample = () => {
    const tab = document.querySelector('[role="tablist"] [role="tab"]')
    const title = tab?.querySelector('.g-tabs-legacy__item-title')

    if (tab && title) {
      startedAt ??= performance.now()
      const tabStyle = getComputedStyle(tab)
      const titleStyle = getComputedStyle(title)

      window.headerTabMetricSamples?.push({
        height: tabStyle.height,
        gap: tabStyle.marginInlineEnd,
        fontSize: titleStyle.fontSize,
        lineHeight: titleStyle.lineHeight,
      })
    }

    if (startedAt !== undefined && performance.now() - startedAt >= sampleWindowMs) {
      window.headerTabSamplingDone = true
    } else {
      requestAnimationFrame(sample)
    }
  }

  requestAnimationFrame(sample)
}

test.describe('header tabs layout stability', () => {
  test.use({ viewport: NARROW_VIEWPORT })

  test('uses compact size metrics from the first frame', async ({ page }) => {
    await page.addInitScript(recordHeaderTabMetrics, SAMPLE_WINDOW_MS)
    await page.goto('/')
    await page.waitForFunction(() => window.headerTabSamplingDone)

    const samples = await page.evaluate(() => window.headerTabMetricSamples ?? [])

    expect(samples.length).toBeGreaterThan(1)
    expect(samples).toEqual(Array(samples.length).fill(COMPACT_METRICS))
  })

  test('uses compact metrics below 500px and large metrics from 500px when resized', async ({
    page,
  }) => {
    await page.goto('/')

    const tab = page.getByRole('tab').first()
    const title = tab.locator('.g-tabs-legacy__item-title')

    for (const { width, metrics } of [
      { width: 393, metrics: COMPACT_METRICS },
      { width: 499, metrics: COMPACT_METRICS },
      { width: 500, metrics: LARGE_METRICS },
      { width: 800, metrics: LARGE_METRICS },
      { width: 393, metrics: COMPACT_METRICS },
    ]) {
      await page.setViewportSize({ width, height: NARROW_VIEWPORT.height })
      await expect(tab).toHaveCSS('height', metrics.height)
      await expect(tab).toHaveCSS('margin-inline-end', metrics.gap)
      await expect(title).toHaveCSS('font-size', metrics.fontSize)
      await expect(title).toHaveCSS('line-height', metrics.lineHeight)
    }
  })
})
