import { expect, test } from '@playwright/test'

/** The staged reveal (ground -> pumpkin -> ignition -> sparks) runs over this window. */
const REVEAL_SAMPLES_MS = [75, 400, 600, 1200] as const

/**
 * Pauses every Web Animations API animation on the scene, scrubs them all to the
 * same deterministic `currentTime`, then waits a frame so WebKit's computed
 * styles (which apply on the next frame, not synchronously) have caught up.
 */
async function seekScene(page: import('@playwright/test').Page, timeMs: number) {
  await page.evaluate((ms) => {
    const scene = document.querySelector('[data-testid="halloween-scene"]')
    if (!scene) {
      throw new Error('Expected the halloween scene to be in the DOM.')
    }

    const animations = scene.getAnimations({ subtree: true })
    for (const animation of animations) {
      animation.pause()
      animation.currentTime = ms
    }
  }, timeMs)

  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )
}

/** Reads the computed opacity of a single scene layer by its `data-testid`. */
async function layerOpacity(page: import('@playwright/test').Page, testId: string) {
  return page
    .getByTestId(testId)
    .evaluate((node) => Number.parseFloat(getComputedStyle(node).opacity))
}

test.describe('halloween hero motion', () => {
  test('stages ground, pumpkin, ignition and sparks in order', async ({ page }) => {
    await page.goto('/')

    const scene = page.getByTestId('halloween-scene')
    await expect(scene).toHaveAttribute('data-ready', 'true')

    await seekScene(page, REVEAL_SAMPLES_MS[0])
    await expect.poll(() => layerOpacity(page, 'halloween-ground')).toBeGreaterThan(0)
    expect(await layerOpacity(page, 'halloween-pumpkin')).toBe(0)
    expect(await layerOpacity(page, 'halloween-ignition')).toBe(0)
    expect(await layerOpacity(page, 'halloween-sparks')).toBe(0)

    await seekScene(page, REVEAL_SAMPLES_MS[1])
    await expect.poll(() => layerOpacity(page, 'halloween-ground')).toBeCloseTo(1, 1)
    expect(await layerOpacity(page, 'halloween-pumpkin')).toBeGreaterThan(0)
    expect(await layerOpacity(page, 'halloween-ignition')).toBe(0)

    await seekScene(page, REVEAL_SAMPLES_MS[2])
    await expect.poll(() => layerOpacity(page, 'halloween-ignition')).toBeGreaterThan(0)
    expect(await layerOpacity(page, 'halloween-sparks')).toBe(0)

    await seekScene(page, REVEAL_SAMPLES_MS[3])
    await expect.poll(() => layerOpacity(page, 'halloween-ground')).toBeCloseTo(1, 1)
    await expect.poll(() => layerOpacity(page, 'halloween-pumpkin')).toBeCloseTo(1, 1)
    await expect.poll(() => layerOpacity(page, 'halloween-ignition')).toBeCloseTo(1, 1)
    await expect.poll(() => layerOpacity(page, 'halloween-sparks')).toBeCloseTo(1, 1)
  })

  test('keeps candle glow evolving indefinitely after the reveal settles', async ({ page }) => {
    await page.goto('/')

    const scene = page.getByTestId('halloween-scene')
    await expect(scene).toHaveAttribute('data-ready', 'true')

    // Reads settled styles after seeking across a paint boundary in every engine.
    const readRunningStyles = async (timeMs: number) => {
      await seekScene(page, timeMs)
      return page.evaluate(() => {
        const sceneNode = document.querySelector('[data-testid="halloween-scene"]')
        if (!sceneNode) {
          throw new Error('Expected the halloween scene to be in the DOM.')
        }

        const candleLightNode = sceneNode.querySelector('[data-testid="halloween-candle-light"]')
        const shell = sceneNode.querySelector('[data-testid="halloween-pumpkin"]')
        if (!shell) throw new Error('Expected the steady pumpkin shell.')

        if (!candleLightNode) {
          throw new Error('Expected the candle light wrapper to be in the DOM.')
        }

        return {
          candleOpacity: Number.parseFloat(getComputedStyle(candleLightNode).opacity),
          candleTransform: getComputedStyle(candleLightNode).transform,
          shellOpacity: getComputedStyle(shell).opacity,
          shellTransform: getComputedStyle(shell).transform,
        }
      })
    }

    const atSixSeconds = await readRunningStyles(6_000)
    const atTwelveSeconds = await readRunningStyles(12_000)

    // The candle glow only breathes opacity, within a restrained irregular envelope, and never moves.
    expect(atSixSeconds.candleOpacity).toBeGreaterThanOrEqual(0.45)
    expect(atSixSeconds.candleOpacity).toBeLessThanOrEqual(0.82)
    expect(atTwelveSeconds.candleOpacity).toBeGreaterThanOrEqual(0.45)
    expect(atTwelveSeconds.candleOpacity).toBeLessThanOrEqual(0.82)
    expect(atSixSeconds.candleOpacity).not.toBe(atTwelveSeconds.candleOpacity)
    expect(atSixSeconds.candleTransform).toBe('none')
    expect(atTwelveSeconds.candleTransform).toBe('none')
    expect(atSixSeconds.shellOpacity).toBe('1')
    expect(atTwelveSeconds.shellOpacity).toBe(atSixSeconds.shellOpacity)
    expect(atTwelveSeconds.shellTransform).toBe(atSixSeconds.shellTransform)
    const candle = page.getByTestId('halloween-candle-light')
    await expect(candle.locator('use')).toHaveCount(1)
    expect(await candle.evaluate((node) => node.parentElement?.getAttribute('clip-path'))).toMatch(
      /^url\(#.+-openings\)$/,
    )
    await expect(scene.locator('defs clipPath polygon')).toHaveCount(4)
    await expect(scene.locator('defs image[data-asset="pumpkin"]')).toHaveAttribute('width', '1254')
    await expect(scene.locator('defs image[data-asset="pumpkin"]')).toHaveAttribute(
      'height',
      '1254',
    )

    const candleIsInfinite = await page.evaluate(() => {
      const candleLightNode = document.querySelector('[data-testid="halloween-candle-light"]')
      if (!candleLightNode) {
        throw new Error('Expected the candle light wrapper to be in the DOM.')
      }

      return candleLightNode.getAnimations().some((animation) => {
        const effect = animation.effect as KeyframeEffect | null
        return effect?.getTiming().iterations === Infinity
      })
    })

    expect(candleIsInfinite).toBe(true)
  })

  test('keeps the candle glow running without @supports CSS', async ({ page }) => {
    await page.goto('/')

    const scene = page.getByTestId('halloween-scene')
    await expect(scene).toHaveAttribute('data-ready', 'true')

    // Strip every @supports-gated rule from accessible stylesheets via the CSSOM, so only
    // the ordinary, unconditional keyframe animations can be driving motion below.
    await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        const removeSupportsRules = (rules: CSSRuleList) => {
          for (let i = rules.length - 1; i >= 0; i -= 1) {
            const rule = rules[i]
            if (rule instanceof CSSSupportsRule) {
              const parent = rule.parentRule as CSSGroupingRule | null
              if (parent) {
                parent.deleteRule(i)
              } else {
                rule.parentStyleSheet?.deleteRule(i)
              }
            } else if ('cssRules' in rule) {
              removeSupportsRules((rule as CSSGroupingRule).cssRules)
            }
          }
        }

        try {
          removeSupportsRules(sheet.cssRules)
        } catch {
          // Cross-origin stylesheets can't be inspected; nothing to strip there.
        }
      }
    })

    const candleAt = (timeMs: number) =>
      page.evaluate((ms) => {
        const node = document.querySelector('[data-testid="halloween-candle-light"]')
        if (!node) {
          throw new Error('Expected the candle light wrapper to be in the DOM.')
        }

        for (const animation of node.getAnimations()) {
          animation.pause()
          animation.currentTime = ms
        }

        const style = getComputedStyle(node)
        return { opacity: Number.parseFloat(style.opacity), transform: style.transform }
      }, timeMs)

    const candleAtZero = await candleAt(0)
    const candleAtMid = await candleAt(1_350)

    expect(candleAtZero.opacity).not.toBe(candleAtMid.opacity)
    expect(candleAtZero.opacity).toBeGreaterThanOrEqual(0.45)
    expect(candleAtZero.opacity).toBeLessThanOrEqual(0.82)
    expect(candleAtMid.opacity).toBeGreaterThanOrEqual(0.45)
    expect(candleAtMid.opacity).toBeLessThanOrEqual(0.82)
    expect(candleAtZero.transform).toBe('none')
    expect(candleAtMid.transform).toBe('none')

    const fireTestIds = await page.evaluate(
      () =>
        document.querySelectorAll(
          '[data-testid="halloween-fire"], [data-testid="halloween-fire-flicker"]',
        ).length,
    )
    expect(fireTestIds).toBe(0)
  })

  test('keeps eighteen rising sparks behind the pumpkin with continuous coverage and invisible resets', async ({
    page,
  }) => {
    // Sampling eighteen sparks across the cycle fills most of the default budget on larger WebKit
    // profiles on its own, and overran it whenever a parallel worker competed for the CPU.
    test.slow()
    await page.goto('/')
    await expect(page.getByTestId('halloween-scene')).toHaveAttribute('data-ready', 'true')
    const sparks = page.getByTestId('halloween-spark')
    await expect(sparks).toHaveCount(18)
    expect(
      await page.getByTestId('halloween-sparks').evaluate((node) => {
        const pumpkin = document.querySelector('[data-testid="halloween-pumpkin"]')
        return Boolean(
          pumpkin && node.compareDocumentPosition(pumpkin) & Node.DOCUMENT_POSITION_FOLLOWING,
        )
      }),
    ).toBe(true)
    const timings = await sparks.evaluateAll((nodes) =>
      nodes.map((node) => {
        const timing = node.getAnimations()[0]?.effect?.getTiming()
        if (!timing) throw new Error('Expected a spark animation.')
        return { duration: Number(timing.duration), delay: timing.delay ?? 0 }
      }),
    )
    for (const time of [1200, 4000, 8000, 12000, 16000, 20000, 24000, 28000]) {
      await seekScene(page, time)
      expect(
        await sparks.evaluateAll((nodes) =>
          nodes.some((node) => Number(getComputedStyle(node).opacity) > 0.2),
        ),
      ).toBe(true)
    }
    for (let index = 0; index < timings.length; index += 1) {
      const { duration, delay } = timings[index]
      const heights = []
      for (const phase of [0.1, 0.5, 0.9]) {
        await seekScene(page, duration * (1 + phase) + delay)
        heights.push(
          await sparks
            .nth(index)
            .evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).f),
        )
      }
      expect(heights[1]).toBeLessThan(heights[0])
      expect(heights[2]).toBeLessThan(heights[1])
      for (const offset of [-1, 0, 1]) {
        await seekScene(page, duration * 2 + delay + offset)
        const opacities = await sparks.evaluateAll((nodes) =>
          nodes.map((node) => Number(getComputedStyle(node).opacity)),
        )
        expect(opacities[index]).toBeLessThan(0.001)
        expect(opacities.some((opacity, other) => other !== index && opacity > 0.2)).toBe(true)
      }
    }
  })

  test('switches sparks to a quiet static composition at runtime', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('halloween-scene')).toHaveAttribute('data-ready', 'true')
    const spark = page.getByTestId('halloween-spark').first()
    expect(await spark.evaluate((node) => node.getAnimations().length)).toBe(1)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(spark).toHaveCSS('opacity', '0.55')
    await expect(spark).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -100)')
    expect(await spark.evaluate((node) => node.getAnimations().length)).toBe(0)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    expect(await spark.evaluate((node) => node.getAnimations().length)).toBe(1)
  })

  test('restages correctly after repeated original/halloween toggling', async ({ page }) => {
    await page.goto('/')

    const toggle = page.getByTestId('appearance-toggle-switch')
    const scene = page.getByTestId('halloween-scene')

    for (let toggleCount = 0; toggleCount < 2; toggleCount += 1) {
      await toggle.click()
      await toggle.click()
      await expect(scene).toHaveAttribute('data-ready', 'true')

      await seekScene(page, REVEAL_SAMPLES_MS[0])
      expect(await layerOpacity(page, 'halloween-pumpkin')).toBe(0)
      expect(await layerOpacity(page, 'halloween-ignition')).toBe(0)
      await expect.poll(() => layerOpacity(page, 'halloween-ground')).toBeGreaterThan(0)

      await seekScene(page, REVEAL_SAMPLES_MS[3])
      await expect.poll(() => layerOpacity(page, 'halloween-sparks')).toBeCloseTo(1, 1)
    }
  })

  // Confirms every layer sprite is a distinct <defs> asset and that the
  // legacy, since-removed fire and ember sprites never resurface.
  test('defines three distinct asset hrefs without the legacy fire or midnight-ember sprites', async ({
    page,
    browserName,
  }) => {
    await page.goto('/')

    const scene = page.getByTestId('halloween-scene')
    await expect(scene).toHaveAttribute('data-ready', 'true')

    const hrefs = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll('[data-testid="halloween-scene"] defs image[data-asset]'),
      ).map((image) => image.getAttribute('href')),
    )

    expect(new Set(hrefs).size).toBe(3)
    const pumpkin = scene.locator('defs image[data-asset="pumpkin"]')
    await expect(pumpkin).toHaveAttribute('href', /\/layer-pumpkin\.(avif|webp)$/)
    /*
     * Chromium decodes AVIF everywhere, so it must keep the primary format. WebKit is not asserted
     * by name: the Linux build decodes AVIF while the Windows one does not, so pinning it to WebP
     * made the result depend on the runner's codec support rather than on this code. The fallback
     * itself is covered deterministically by the sibling test that aborts the AVIF request.
     */
    if (browserName === 'chromium') await expect(pumpkin).toHaveAttribute('href', /\.avif$/)
    expect(
      await pumpkin.evaluate(async (node) => {
        const image = new Image()
        image.src = node.getAttribute('href') ?? ''
        await image.decode()
        return { width: image.naturalWidth, height: image.naturalHeight }
      }),
    ).toEqual({ width: 1254, height: 1254 })
    expect(hrefs.some((href) => /smoke|ember/.test(href ?? ''))).toBe(false)
    expect(hrefs.some((href) => href?.includes('layer-fire'))).toBe(false)
  })

  test('decodes the hero WebP sibling when AVIF fails', async ({ page }) => {
    await page.route('**/layer-pumpkin.avif', (route) => route.abort())
    await page.goto('/')
    const scene = page.getByTestId('halloween-scene')
    await expect(scene).toHaveAttribute('data-ready', 'true')
    const pumpkin = scene.locator('defs image[data-asset="pumpkin"]')
    await expect(pumpkin).toHaveAttribute('href', '/assets/img/halloween/layer-pumpkin.webp')
    expect(
      await pumpkin.evaluate(async (node) => {
        const image = new Image()
        image.src = node.getAttribute('href') ?? ''
        await image.decode()
        return image.naturalWidth
      }),
    ).toBe(1254)
  })

  test('settles hero readiness without retrying when both pumpkin formats fail', async ({
    page,
  }) => {
    let fallbackRequests = 0
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.route('**/layer-pumpkin.avif', (route) => route.abort())
    await page.route('**/layer-pumpkin.webp', (route) => {
      fallbackRequests += 1
      return route.abort()
    })
    await page.goto('/')
    const scene = page.getByTestId('halloween-scene')
    await expect(scene).toHaveAttribute('data-ready', 'true')
    await expect(scene.locator('defs image[data-asset="pumpkin"]')).toHaveAttribute(
      'href',
      '/assets/img/halloween/layer-pumpkin.webp',
    )
    await page.waitForTimeout(500)
    const settledRequests = fallbackRequests
    await page.waitForTimeout(500)
    expect(fallbackRequests).toBe(settledRequests)
    expect(fallbackRequests).toBeGreaterThan(0)
    expect(errors).toEqual([])
  })

  // Exercises the `decode().catch(() => undefined)` branch: a sprite that
  // fails to load must not leave readiness stuck, and the rest of the scene
  // still stages normally.
  test('still reaches readiness when a sprite fails to decode', async ({ page }) => {
    await page.route('**/layer-ground-glow.webp', (route) => route.abort())
    await page.goto('/')

    const scene = page.getByTestId('halloween-scene')
    await expect(scene).toHaveAttribute('data-ready', 'true')

    await seekScene(page, REVEAL_SAMPLES_MS[3])
    await expect.poll(() => layerOpacity(page, 'halloween-ground')).toBeGreaterThan(0)
    await expect.poll(() => layerOpacity(page, 'halloween-pumpkin')).toBeGreaterThan(0)
    await expect.poll(() => layerOpacity(page, 'halloween-ignition')).toBeGreaterThan(0)
  })

  test('shows the complete static scene immediately when motion is reduced', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    const scene = page.getByTestId('halloween-scene')
    await expect(scene).toHaveAttribute('data-ready', 'true')

    for (const testId of [
      'halloween-ground',
      'halloween-pumpkin',
      'halloween-ignition',
      'halloween-candle-light',
      'halloween-sparks',
    ]) {
      await expect
        .poll(() => layerOpacity(page, testId), {
          message: `${testId} should be visible`,
        })
        .toBeGreaterThan(0)
    }

    const runningAnimationCount = await page.evaluate(() => {
      const sceneNode = document.querySelector('[data-testid="halloween-scene"]')
      if (!sceneNode) {
        throw new Error('Expected the halloween scene to be in the DOM.')
      }

      return sceneNode
        .getAnimations({ subtree: true })
        .filter((animation) => animation.playState === 'running').length
    })

    expect(runningAnimationCount).toBe(0)
    expect(await layerOpacity(page, 'halloween-candle-light')).toBe(0.65)

    await expect(page.getByTestId('halloween-spark').first()).toHaveCSS('opacity', '0.55')
  })
})
