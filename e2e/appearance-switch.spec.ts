import { expect, test } from '@playwright/test'

import { APPEARANCE_COOKIE_KEY, EAppearance } from '@/constants/theme.constants'

test.describe('original appearance', () => {
  test('serves original HTML and hydrates without seasonal artwork or a switch', async ({
    page,
    request,
  }) => {
    const response = await request.get('/')
    expect(response.ok()).toBe(true)
    expect(await response.text()).toMatch(/<html\b[^>]*data-appearance="original"/)

    await page.goto('/')

    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)
    await expect(page.getByTestId('home-sparkle-field')).toBeAttached()
    await expect(page.getByTestId('home-halloween-art')).toHaveCount(0)
    await expect(page.getByTestId('appearance-toggle-switch')).toHaveCount(0)
  })

  for (const value of [EAppearance.original, EAppearance.halloween, 'unknown', '']) {
    test(`ignores the ${value || 'empty'} cookie across rendering, reload and articles`, async ({
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
      expect(await response.text()).toMatch(/<html\b[^>]*data-appearance="original"/)

      await page.goto('/')
      await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)
      await expect(page.getByTestId('home-sparkle-field')).toBeAttached()
      await expect(page.getByTestId('home-halloween-art')).toHaveCount(0)
      await expect(page.getByTestId('appearance-toggle-switch')).toHaveCount(0)

      await page.reload()
      await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)

      await page.goto('/articles')
      await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)
    })
  }

  for (const width of [320, 390, 1440]) {
    test(`keeps the language control, tabs and original headings in bounds at ${width}px`, async ({
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
        if (!box) throw new Error('Expected the original hero heading to be laid out.')
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
