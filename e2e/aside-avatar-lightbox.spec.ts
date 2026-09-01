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

  test.describe('inside the mobile drawer', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
    })

    test('closing via the close button leaves the drawer open', async ({ page }) => {
      await page.goto('/')

      const drawer = await revealAside(page)

      await drawer.getByTestId('aside-avatar-trigger').click()

      const lightbox = page.getByTestId('aside-avatar-lightbox')
      await expect(lightbox).toBeVisible()

      await page.getByTestId('aside-avatar-lightbox-close').click()

      await expect(lightbox).toBeHidden()
      await expect(drawer).toBeVisible()
    })

    test('closing via Escape leaves the drawer open', async ({ page }) => {
      await page.goto('/')

      const drawer = await revealAside(page)

      await drawer.getByTestId('aside-avatar-trigger').click()

      const lightbox = page.getByTestId('aside-avatar-lightbox')
      await expect(lightbox).toBeVisible()

      await page.keyboard.press('Escape')

      await expect(lightbox).toBeHidden()
      await expect(drawer).toBeVisible()
    })

    test('closing via outside click leaves the drawer open', async ({ page }) => {
      await page.goto('/')

      const drawer = await revealAside(page)

      await drawer.getByTestId('aside-avatar-trigger').click()

      const lightbox = page.getByTestId('aside-avatar-lightbox')
      await expect(lightbox).toBeVisible()

      await page.mouse.click(5, 5)

      await expect(lightbox).toBeHidden()
      await expect(drawer).toBeVisible()
    })
  })
})
