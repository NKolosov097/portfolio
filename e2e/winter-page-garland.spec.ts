import { expect, type Locator, type Page, test } from '@playwright/test'

import { APPEARANCE_COOKIE_KEY, EAppearance } from '@/constants/theme.constants'

/** Cover both published articles and the independent root/article not-found views. */
const ROUTES = [
  '/',
  '/articles',
  '/articles/ai-boilerplate-senior-engineers',
  '/articles/two-states-are-enough',
  '/garland-audit-missing',
  '/articles/garland-audit-missing',
] as const

/** Wait for the transform endpoint because entering winter becomes opaque before it settles. */
async function expectGarlandEndpoint(garland: Locator, isWinter: boolean) {
  await expect(garland).toHaveCSS('opacity', isWinter ? '1' : '0')
  await expect
    .poll(() =>
      garland.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).f),
    )
    .toBe(isWinter ? 0 : -24)
  await expect
    .poll(() =>
      garland
        .getByTestId('winter-page-garland-artwork')
        .evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).d),
    )
    .toBeCloseTo(isWinter ? 1 : 0.7, 5)
}

/** Retarget through the real control and pause the owned placement, sag, and opacity tracks. */
async function toggleGarlandMotion(garland: Locator) {
  return garland.evaluate(async (node) => {
    getComputedStyle(node).getPropertyValue('transform')
    const toggle = document.querySelector<HTMLElement>('[data-testid="appearance-toggle-switch"]')
    if (!toggle) throw new Error('Expected the appearance control.')
    toggle.click()
    await Promise.resolve()
    const artwork = node.querySelector('[data-testid="winter-page-garland-artwork"]')
    if (!artwork) throw new Error('Expected the hanging artwork.')
    const y = new DOMMatrixReadOnly(getComputedStyle(node).transform).f
    const scale = new DOMMatrixReadOnly(getComputedStyle(artwork).transform).d
    const transitions = node
      .getAnimations({ subtree: true })
      .filter((animation): animation is CSSTransition => animation instanceof CSSTransition)
    const transforms = transitions.filter(
      (animation) => animation.transitionProperty === 'transform',
    )
    if (transforms.length !== 2) throw new Error('Expected placement and sag transform tracks.')
    for (const transition of transitions) transition.pause()
    await Promise.all(transitions.map((transition) => transition.ready))
    return {
      y,
      scale,
      durations: transforms.map((transition) => transition.effect?.getTiming().duration).sort(),
    }
  })
}

/** Seek owned placement and sag on a common elapsed clock, including the delayed hide. */
async function sampleGarlandMotion(garland: Locator, elapsedTimes: number[]) {
  return garland.evaluate((node, progress) => {
    const artwork = node.querySelector('[data-testid="winter-page-garland-artwork"]')
    if (!artwork) throw new Error('Expected the hanging artwork.')
    const transitions = node.getAnimations({ subtree: true })
    return progress.map((elapsed) => {
      for (const transition of transitions) {
        const timing = transition.effect?.getTiming()
        if (!timing || typeof timing.duration !== 'number')
          throw new Error('Expected timed motion.')
        transition.currentTime = Math.min(elapsed, timing.duration + (timing.delay ?? 0))
      }
      const style = getComputedStyle(node)
      const matrix = new DOMMatrixReadOnly(style.transform)
      const artworkStyle = getComputedStyle(artwork)
      const scale = new DOMMatrixReadOnly(artworkStyle.transform).d
      const originY = Number.parseFloat(artworkStyle.transformOrigin.split(' ')[1])
      return {
        y: matrix.f,
        x: matrix.e,
        scale,
        opacity: style.opacity,
        peak: matrix.f + originY + scale * (1 - originY),
        sag: matrix.f + originY + scale * (16 - originY),
      }
    })
  }, elapsedTimes)
}

/** Release only owned subtree transitions before checking both live final endpoints. */
async function resumeGarlandMotion(garland: Locator) {
  await garland.evaluate((node) => {
    for (const animation of node.getAnimations({ subtree: true })) {
      if (animation instanceof CSSTransition) animation.play()
    }
  })
}

/** Measure against the viewport so content-column limits cannot masquerade as full-width art. */
async function expectViewportGarland(page: Page) {
  const garland = page.getByTestId('winter-page-garland')
  await expect(garland).toHaveCount(1)
  await expect(page.locator('body > [data-testid="winter-page-garland"]')).toHaveCount(1)
  await expect(page.locator('#page-header [data-testid="winter-page-garland"]')).toHaveCount(0)
  await expectGarlandEndpoint(garland, true)
  await expect(garland).toHaveCSS('position', 'fixed')
  const geometry = await garland.evaluate((node) => {
    const { left, top, width, height } = node.getBoundingClientRect()
    return {
      left,
      top,
      width,
      height,
      viewport: document.documentElement.getBoundingClientRect().width,
    }
  })
  expect(geometry.left).toBe(0)
  expect(geometry.top).toBe(0)
  expect(geometry.width).toBe(geometry.viewport)
  expect(geometry.height).toBe(24)
}

/** Preserve real header and tab bounds together when comparing appearance endpoints. */
async function headerGeometry(page: Page) {
  return page.locator('#page-header').evaluate((header) =>
    [header, ...header.querySelectorAll('[role="tab"]')].map((node) => {
      const { x, y, width, height } = node.getBoundingClientRect()
      return { x, y, width, height }
    }),
  )
}

test.describe('winter page garland', () => {
  test('pins attachments while the hanging sections rebound and lifts while visible', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    expect(
      await page.evaluate(() => CSS.supports('transition-timing-function', 'linear(0, 1)')),
    ).toBe(true)
    const garland = page.getByTestId('winter-page-garland')
    const toggle = page.getByTestId('appearance-toggle-switch')
    await expect(toggle).toBeEnabled()
    await toggle.click()
    await expectGarlandEndpoint(garland, false)

    expect((await toggleGarlandMotion(garland)).durations).toEqual([320, 900])
    const descent = await sampleGarlandMotion(garland, [0, 160, 320])
    expect(descent[0].y).toBeCloseTo(-24, 3)
    expect(descent[1].y).toBeGreaterThan(descent[0].y)
    expect(descent[1].y).toBeLessThan(0)
    expect(descent[2].y).toBeCloseTo(0, 3)
    const entry = await sampleGarlandMotion(garland, [468, 630, 765, 900])
    for (const [index, scale] of [1.09, 0.964, 1.015, 1].entries()) {
      expect(entry[index].scale).toBeCloseTo(scale, 3)
    }
    expect(entry[0].sag).toBeGreaterThan(16)
    expect(entry[1].sag).toBeLessThan(16)
    expect(entry[2].sag).toBeGreaterThan(16)
    expect(Math.abs(entry[1].sag - 16)).toBeLessThan(Math.abs(entry[0].sag - 16))
    expect(Math.abs(entry[2].sag - 16)).toBeLessThan(Math.abs(entry[1].sag - 16))
    expect(entry[3].sag).toBeCloseTo(16, 3)
    for (const sample of entry) {
      expect(sample.y).toBeCloseTo(0, 3)
      expect(sample.peak).toBeCloseTo(1, 3)
      expect(sample.x).toBe(0)
      expect(sample.opacity).toBe('1')
    }
    await resumeGarlandMotion(garland)
    await expectGarlandEndpoint(garland, true)

    expect((await toggleGarlandMotion(garland)).durations).toEqual([360, 360])
    const [midpoint] = await sampleGarlandMotion(garland, [180])
    expect(midpoint.y).toBeLessThan(0)
    expect(midpoint.y).toBeGreaterThan(-24)
    expect(midpoint.scale).toBeGreaterThan(0.7)
    expect(midpoint.scale).toBeLessThan(1)
    expect(midpoint.opacity).toBe('1')
    await resumeGarlandMotion(garland)
    await expectGarlandEndpoint(garland, false)
  })

  test('reverses from its displayed transform without leaving a stale hide', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    const garland = page.getByTestId('winter-page-garland')
    await page.getByTestId('appearance-toggle-switch').click()
    await expectGarlandEndpoint(garland, false)
    await toggleGarlandMotion(garland)
    const [entering] = await sampleGarlandMotion(garland, [160])
    const reverseExit = await toggleGarlandMotion(garland)
    expect(reverseExit.y).toBeCloseTo(entering.y, 1)
    expect(reverseExit.scale).toBeCloseTo(entering.scale, 3)
    const [exiting] = await sampleGarlandMotion(garland, [90])
    const reverseEntry = await toggleGarlandMotion(garland)
    expect(reverseEntry.y).toBeCloseTo(exiting.y, 1)
    expect(reverseEntry.scale).toBeCloseTo(exiting.scale, 3)
    await resumeGarlandMotion(garland)
    await expectGarlandEndpoint(garland, true)
    await expect(page.getByTestId('appearance-toggle-switch')).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  for (const route of ROUTES) {
    test(`decorates the whole viewport once on ${route}`, async ({ page }) => {
      await page.goto(route)
      await expectViewportGarland(page)
      await expect(page.getByTestId('winter-header-decoration')).toHaveCount(0)
    })
  }

  test('stays at the viewport top while scrolling beyond the content width limit', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 851 })
    await page.goto('/articles/two-states-are-enough')
    await expect(page.getByTestId('article-content-two-states-are-enough')).toBeVisible()
    await expectViewportGarland(page)
    await page.evaluate(() => window.scrollTo(0, 600))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    await expectViewportGarland(page)
  })

  for (const appearance of [EAppearance.original, EAppearance.winter]) {
    test(`loads the ${appearance} artwork endpoint from the appearance cookie`, async ({
      context,
      page,
      baseURL,
    }) => {
      if (!baseURL) throw new Error('Expected the configured test origin.')
      await context.addCookies([{ name: APPEARANCE_COOKIE_KEY, value: appearance, url: baseURL }])
      await page.goto('/')

      const decoration = page.getByTestId('winter-page-garland')
      await expect(page.locator('html')).toHaveAttribute('data-appearance', appearance)
      await expectGarlandEndpoint(decoration, appearance === EAppearance.winter)
      await expect(decoration).toHaveAttribute('aria-hidden', 'true')
      await expect(decoration).toHaveCSS('pointer-events', 'none')
      await expect(decoration.locator('a, button, input, [tabindex]')).toHaveCount(0)
      await expect(page.getByTestId('winter-header-icicles')).toHaveCount(0)
      expect(
        await decoration.evaluate((node) => node.getAnimations({ subtree: true }).length),
      ).toBe(0)
    })
  }

  test('moves both ways without moving navigation and settles rapid reversals', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    const decoration = page.getByTestId('winter-page-garland')
    const toggle = page.getByTestId('appearance-toggle-switch')
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('tab').first()).toBeEnabled()
    const winterGeometry = await headerGeometry(page)

    await toggle.click()
    await expectGarlandEndpoint(decoration, false)
    expect(await headerGeometry(page)).toEqual(winterGeometry)
    await toggle.click()
    await expectGarlandEndpoint(decoration, true)
    expect(await headerGeometry(page)).toEqual(winterGeometry)

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await expectGarlandEndpoint(decoration, true)
    expect(await headerGeometry(page)).toEqual(winterGeometry)

    await page.getByRole('tab').first().click()
    await page.getByRole('button', { name: 'change language' }).click()
    await expect(page.getByRole('menuitem', { name: 'English', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('fits narrow viewports and lets the profile control open its drawer', async ({ page }) => {
    await page.goto('/')
    for (const width of [320, 393]) {
      await page.setViewportSize({ width, height: 851 })
      await expect(page.getByTestId('winter-page-garland')).toHaveCSS('opacity', '1')
      const geometry = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }))
      expect(geometry.content).toBeLessThanOrEqual(geometry.viewport)
    }
    await page.getByTestId('header-open-profile').click()
    await expect(page.getByTestId('aside-drawer')).toBeVisible()
  })

  test('uses immediate endpoints when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const decoration = page.getByTestId('winter-page-garland')
    await expect(decoration).toHaveCSS('transition-duration', '0s')
    await page.getByTestId('appearance-toggle-switch').click()
    await expectGarlandEndpoint(decoration, false)
    expect(await decoration.evaluate((node) => node.getAnimations({ subtree: true }).length)).toBe(
      0,
    )
    await page.getByTestId('appearance-toggle-switch').click()
    await expectGarlandEndpoint(decoration, true)
    await expect(decoration).toHaveCSS('transition-duration', '0s')
    expect(await decoration.evaluate((node) => node.getAnimations({ subtree: true }).length)).toBe(
      0,
    )
  })
})
