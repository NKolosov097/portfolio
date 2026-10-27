import { expect, test } from '@playwright/test'

import en from '@public/locales/en.json'

import { clickWhenSettled } from './helpers/interaction'

import { ETabID } from '@/constants/header.constants'
import { APPEARANCE_COOKIE_KEY, EAppearance } from '@/constants/theme.constants'

/** This suite exercises the original sparkle field, which only renders in the original appearance. */
test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: APPEARANCE_COOKIE_KEY, value: EAppearance.original, domain: 'localhost', path: '/' },
  ])
})

test.describe('home sparkle field', () => {
  test('fades the field in behind the hero', async ({ page }) => {
    await page.goto('/')

    const canvas = page.getByTestId('home-sparkle-field')

    await expect(canvas).toBeAttached()

    const field = page.locator('[data-testid="home-sparkle-field"]').locator('..')

    await expect(field).toHaveAttribute('data-ready', 'true')
    await expect(field).toHaveAttribute('data-motion', 'animated')
  })

  test('leaves the headline fully readable', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByTestId('home-sparkle-field')).toBeAttached()
    await expect(page.locator(`section#${ETabID.home} h2`)).toBeVisible()
    await expect(page.locator(`section#${ETabID.home} h3`)).toBeVisible()
  })

  test('holds a still frame when the visitor prefers reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    const field = page.locator('[data-testid="home-sparkle-field"]').locator('..')

    await expect(field).toBeAttached()
    await expect(field).toHaveAttribute('data-motion', 'static')
  })

  test('stops animating once the hero is scrolled away', async ({ page }) => {
    await page.goto('/')

    const field = page.locator('[data-testid="home-sparkle-field"]').locator('..')

    await expect(field).toHaveAttribute('data-ready', 'true')

    await clickWhenSettled(page.getByRole('tab', { name: en.headerTabs.resume }))
    await expect(page.locator(`section#${ETabID.resume}`)).toBeInViewport({ timeout: 10_000 })

    await expect(field).toHaveAttribute('data-running', 'false', { timeout: 10_000 })
  })

  test('never blocks the pointer from reaching the hero', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByTestId('home-sparkle-field')).toBeAttached()

    const isTransparentToPointer = await page
      .locator('[data-testid="home-sparkle-field"]')
      .locator('..')
      .evaluate((node) => getComputedStyle(node).pointerEvents === 'none')

    expect(isTransparentToPointer).toBe(true)
  })
})
