import { expect, test } from '@playwright/test'

import { revealAside } from './helpers/aside'

test.describe('aside avatar lightbox', () => {
  test('opens on click and closes via the close button', async ({ page }) => {
    await page.goto('/')

    const aside = await revealAside(page)

    await aside.getByTestId('aside-avatar-trigger').click()

    const lightbox = page.getByTestId('aside-avatar-lightbox')
    await expect(lightbox).toBeVisible()

    await page.getByTestId('aside-avatar-lightbox-close').click()

    await expect(lightbox).toBeHidden()
  })

  test('closes on Escape', async ({ page }) => {
    await page.goto('/')

    const aside = await revealAside(page)

    await aside.getByTestId('aside-avatar-trigger').click()

    const lightbox = page.getByTestId('aside-avatar-lightbox')
    await expect(lightbox).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(lightbox).toBeHidden()
  })

  test('closes on outside click', async ({ page }) => {
    await page.goto('/')

    const aside = await revealAside(page)

    await aside.getByTestId('aside-avatar-trigger').click()

    const lightbox = page.getByTestId('aside-avatar-lightbox')
    await expect(lightbox).toBeVisible()

    await page.mouse.click(5, 5)

    await expect(lightbox).toBeHidden()
  })
})
