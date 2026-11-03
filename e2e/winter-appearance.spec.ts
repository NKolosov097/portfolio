import { expect, test } from '@playwright/test'

import { APPEARANCE_COOKIE_KEY, EAppearance } from '@/constants/theme.constants'

/** Frost accent the winter palette drives, which the snow's baked glow is tinted with. */
const WINTER_BRAND_COLOR = 'rgb(143, 211, 255)'

test.describe('winter appearance', () => {
  test('defaults to winter and snows behind the hero', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.winter)
    await expect(page.locator('html')).toHaveCSS('--g-color-line-brand', WINTER_BRAND_COLOR)

    const canvas = page.getByTestId('home-sparkle-field')
    await expect(canvas).toBeAttached()

    const field = canvas.locator('..')
    await expect(field).toHaveAttribute('data-ready', 'true')
    await expect(field).toHaveAttribute('data-motion', 'animated')
    await expect(field).toHaveAttribute('data-preset', 'snow')
  })

  test('snows behind the not-found page too', async ({ page }) => {
    const response = await page.goto('/no-such-page')

    expect(response?.status()).toBe(404)
    await expect(page.getByTestId('not-found-link')).toBeVisible()

    const field = page.getByTestId('home-sparkle-field').locator('..')
    await expect(field).toHaveAttribute('data-preset', 'snow')
    await expect(field).toHaveAttribute('data-ready', 'true')
  })

  test('toggles to original, persists the cookie, and survives reload', async ({
    page,
    context,
  }) => {
    await page.goto('/')

    const toggle = page.getByTestId('appearance-toggle-switch')
    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)
    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    const cookies = await context.cookies()
    const appearanceCookie = cookies.find(({ name }) => name === APPEARANCE_COOKIE_KEY)

    expect(appearanceCookie?.value).toBe(EAppearance.original)

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)
  })

  test('toggles back to winter and keeps the field mounted either way', async ({ page }) => {
    await page.goto('/')

    const toggle = page.getByTestId('appearance-toggle-switch')
    await expect(page.getByTestId('home-sparkle-field')).toBeAttached()

    const field = page.getByTestId('home-sparkle-field').locator('..')

    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)
    await expect(field).toHaveAttribute('data-preset', 'sparkles')
    await expect(field).toHaveAttribute('data-ready', 'true')

    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.winter)
    await expect(field).toHaveAttribute('data-preset', 'snow')
    await expect(field).toHaveAttribute('data-ready', 'true')
  })
})
