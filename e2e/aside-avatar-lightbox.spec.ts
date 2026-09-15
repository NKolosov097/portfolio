import { expect, test, type Page } from '@playwright/test'

import { revealAside } from './helpers/aside'
import { clickWhenSettled } from './helpers/interaction'

/** Rectangles of the lightbox photo and its close button, sampled in the same frame. */
interface ILightboxBoxes {
  /** Border box of the rendered photo. */
  photoBox: DOMRect
  /** Border box of the close button. */
  closeBox: DOMRect
}

/** Samples the photo and close button in the same frame. */
const measureLightbox = (page: Page): Promise<ILightboxBoxes> =>
  page.evaluate(() => {
    const photo = document.querySelector<HTMLElement>('[data-testid="aside-avatar-lightbox-image"]')
    const close = document.querySelector<HTMLElement>('[data-testid="aside-avatar-lightbox-close"]')

    if (!photo || !close) throw new Error('The lightbox photo or its close button is not mounted.')

    return {
      photoBox: photo.getBoundingClientRect().toJSON(),
      closeBox: close.getBoundingClientRect().toJSON(),
    }
  })

/** The source photo is square; its rendered box must stay square so the rounded corners and the
 *  close button anchor to the photo itself instead of a viewport-shaped letterbox. */
const SQUARE_TOLERANCE_PX = 1

/** Opens the lightbox from the aside on the current viewport and measures it once settled. */
const openSettledLightbox = async (page: Page): Promise<ILightboxBoxes> => {
  await page.goto('/')

  const aside = await revealAside(page)

  await clickWhenSettled(aside.getByTestId('aside-avatar-trigger'))

  const photo = page.getByTestId('aside-avatar-lightbox-image')
  await expect(photo).toBeVisible()

  return measureLightbox(page)
}

/** Asserts the sizing contract shared by every viewport: square photo, close button on top of it. */
const expectSquarePhotoWithCloseInside = ({ photoBox, closeBox }: ILightboxBoxes): void => {
  expect(Math.abs(photoBox.width - photoBox.height)).toBeLessThanOrEqual(SQUARE_TOLERANCE_PX)

  expect(closeBox.x).toBeGreaterThanOrEqual(photoBox.x)
  expect(closeBox.y).toBeGreaterThanOrEqual(photoBox.y)
  expect(closeBox.x + closeBox.width).toBeLessThanOrEqual(photoBox.x + photoBox.width)
  expect(closeBox.y + closeBox.height).toBeLessThanOrEqual(photoBox.y + photoBox.height)
}

test.describe('aside avatar lightbox', () => {
  // These tests cover behavior and geometry, so unrelated UI motion is disabled for stability.
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('opens on click and closes via the close button', async ({ page }) => {
    await page.goto('/')

    const aside = await revealAside(page)

    await clickWhenSettled(aside.getByTestId('aside-avatar-trigger'))

    const lightbox = page.getByTestId('aside-avatar-lightbox')
    await expect(lightbox).toBeVisible()

    await clickWhenSettled(page.getByTestId('aside-avatar-lightbox-close'))

    await expect(lightbox).toBeHidden()
  })

  test('closes on Escape', async ({ page }) => {
    await page.goto('/')

    const aside = await revealAside(page)

    await clickWhenSettled(aside.getByTestId('aside-avatar-trigger'))

    const lightbox = page.getByTestId('aside-avatar-lightbox')
    await expect(lightbox).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(lightbox).toBeHidden()
  })

  test('closes on outside click', async ({ page }) => {
    await page.goto('/')

    const aside = await revealAside(page)

    await clickWhenSettled(aside.getByTestId('aside-avatar-trigger'))

    const lightbox = page.getByTestId('aside-avatar-lightbox')
    await expect(lightbox).toBeVisible()

    await page.mouse.click(5, 5)

    await expect(lightbox).toBeHidden()
  })

  const LIGHTBOX_VIEWPORTS = [
    { width: 1440, height: 720 },
    { width: 900, height: 1200 },
    { width: 1280, height: 1024 },
  ]

  for (const viewport of LIGHTBOX_VIEWPORTS) {
    test(`keeps the photo square and the close button on it at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport)

      expectSquarePhotoWithCloseInside(await openSettledLightbox(page))
    })
  }

  test('keeps the photo square and the close button on it at the project viewport', async ({
    page,
  }) => {
    expectSquarePhotoWithCloseInside(await openSettledLightbox(page))
  })

  test.describe('inside the mobile drawer', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
    })

    test('closing via the close button leaves the drawer open', async ({ page }) => {
      await page.goto('/')

      const drawer = await revealAside(page)

      await clickWhenSettled(drawer.getByTestId('aside-avatar-trigger'))

      const lightbox = page.getByTestId('aside-avatar-lightbox')
      await expect(lightbox).toBeVisible()

      await clickWhenSettled(page.getByTestId('aside-avatar-lightbox-close'))

      await expect(lightbox).toBeHidden()
      await expect(drawer).toBeVisible()
    })

    test('closing via Escape leaves the drawer open', async ({ page }) => {
      await page.goto('/')

      const drawer = await revealAside(page)

      await clickWhenSettled(drawer.getByTestId('aside-avatar-trigger'))

      const lightbox = page.getByTestId('aside-avatar-lightbox')
      await expect(lightbox).toBeVisible()

      await page.keyboard.press('Escape')

      await expect(lightbox).toBeHidden()
      await expect(drawer).toBeVisible()
    })

    test('closing via outside click leaves the drawer open', async ({ page }) => {
      await page.goto('/')

      const drawer = await revealAside(page)

      await clickWhenSettled(drawer.getByTestId('aside-avatar-trigger'))

      const lightbox = page.getByTestId('aside-avatar-lightbox')
      await expect(lightbox).toBeVisible()

      await page.mouse.click(5, 5)

      await expect(lightbox).toBeHidden()
      await expect(drawer).toBeVisible()
    })
  })
})
