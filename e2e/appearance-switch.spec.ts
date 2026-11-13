import { expect, test } from '@playwright/test'

import { APPEARANCE_COOKIE_KEY, EAppearance } from '@/constants/theme.constants'

// The idle-deferred sparkle chunk can mount after the default deadline on contended WebKit.
const SPARKLE_MOUNT_TIMEOUT = 15_000

test.describe('seasonal appearance', () => {
  test('serves winter HTML and hydrates with an enabled appearance switch', async ({
    page,
    request,
  }) => {
    const response = await request.get('/')
    expect(response.ok()).toBe(true)
    expect(await response.text()).toMatch(/<html\b[^>]*data-appearance="winter"/)

    await page.goto('/')

    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.winter)
    await expect(page.getByTestId('home-sparkle-field')).toBeAttached({
      timeout: SPARKLE_MOUNT_TIMEOUT,
    })
    await expect(page.getByTestId('home-halloween-art')).toHaveCount(0)
    await expect(page.getByTestId('appearance-toggle-switch')).toBeEnabled()
  })

  // Sample native corner transitions at a fixed time so theme switching cannot pass by snapping.
  test('interpolates aside corners in both appearance directions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.setViewportSize({ width: 1_440, height: 900 })
    await page.goto('/')

    const card = page.getByTestId('aside-surface')
    await expect(page.getByTestId('appearance-toggle-switch')).toBeEnabled()
    await expect(card).toHaveCSS('border-top-left-radius', '22px')

    for (const target of [8, 22]) {
      const radius = await card.evaluate(async (node) => {
        const toggle = document.querySelector<HTMLElement>(
          '[data-testid="appearance-toggle-switch"]',
        )
        if (!toggle) throw new Error('Expected the appearance control.')
        getComputedStyle(node).getPropertyValue('border-top-left-radius')
        toggle.click()
        await Promise.resolve()
        getComputedStyle(node).getPropertyValue('border-top-left-radius')
        const corners = node
          .getAnimations()
          .filter(
            (animation): animation is CSSTransition =>
              animation instanceof CSSTransition &&
              /^border-.*-radius$/.test(animation.transitionProperty),
          )
        const corner = corners.find(
          (animation) => animation.transitionProperty === 'border-top-left-radius',
        )
        if (!corner) throw new Error('Expected the native aside corner transition.')
        corner.pause()
        await corner.ready
        corner.currentTime = 350
        const middle = Number.parseFloat(getComputedStyle(node).borderTopLeftRadius)
        for (const animation of corners) animation.finish()
        return { middle, end: Number.parseFloat(getComputedStyle(node).borderTopLeftRadius) }
      })

      expect(radius.middle).toBeGreaterThan(8)
      expect(radius.middle).toBeLessThan(22)
      expect(radius.end).toBe(target)
      await expect(card).toHaveCSS('border-top-left-radius', `${target}px`)
    }
  })

  for (const { value, expected } of [
    { value: EAppearance.original, expected: EAppearance.original },
    { value: EAppearance.winter, expected: EAppearance.winter },
    { value: EAppearance.halloween, expected: EAppearance.winter },
    { value: 'unknown', expected: EAppearance.winter },
    { value: '', expected: EAppearance.winter },
  ]) {
    test(`resolves the ${value || 'empty'} cookie to ${expected} across rendering, reload and articles`, async ({
      page,
      context,
      baseURL,
    }) => {
      if (!baseURL) throw new Error('Expected a configured base URL for appearance cookies.')
      await context.addCookies([
        { name: APPEARANCE_COOKIE_KEY, value, url: new URL('/', baseURL).href },
      ])
      const response = await context.request.get('/')
      expect(response.ok()).toBe(true)
      expect(await response.text()).toMatch(
        new RegExp(`<html\\b[^>]*data-appearance="${expected}"`),
      )

      await page.goto('/')
      await expect(page.locator('html')).toHaveAttribute('data-appearance', expected)
      await expect(page.getByTestId('home-sparkle-field')).toBeAttached({
        timeout: SPARKLE_MOUNT_TIMEOUT,
      })
      await expect(page.getByTestId('home-halloween-art')).toHaveCount(0)
      await expect(page.getByTestId('appearance-toggle-switch')).toBeEnabled()

      await page.reload()
      await expect(page.locator('html')).toHaveAttribute('data-appearance', expected)

      await page.goto('/articles')
      await expect(page.locator('html')).toHaveAttribute('data-appearance', expected)
    })
  }

  for (const width of [320, 390, 1440]) {
    test(`keeps the language control, tabs and winter headings in bounds at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.goto('/')
      await page.evaluate(() => document.fonts.ready)

      const globe = page.getByRole('button', { name: 'change language' })
      const tabs = page.getByRole('tablist')
      await expect(globe).toBeVisible()
      await expect(tabs).toBeVisible()
      const [globeBox, tabsBox] = await Promise.all([globe.boundingBox(), tabs.boundingBox()])
      if (!globeBox || !tabsBox) {
        throw new Error('Expected the language control and tabs to be laid out.')
      }

      for (const box of [globeBox, tabsBox]) {
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
      }
      expect(
        globeBox.x < tabsBox.x + tabsBox.width &&
          globeBox.x + globeBox.width > tabsBox.x &&
          globeBox.y < tabsBox.y + tabsBox.height &&
          globeBox.y + globeBox.height > tabsBox.y,
      ).toBe(false)

      for (const heading of [
        page.locator('section#home h2').first(),
        page.locator('section#home h3').first(),
      ]) {
        await expect(heading).toBeVisible()
        const box = await heading.boundingBox()
        if (!box) throw new Error('Expected the winter hero heading to be laid out.')
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
        expect(await heading.evaluate((node) => node.scrollWidth > node.clientWidth + 1)).toBe(
          false,
        )
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      )
    })
  }
})
