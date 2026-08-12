import { expect, test } from '@playwright/test'

import { revealAside } from './helpers/aside'

/** bob + sway + breathe on the body, plus the two eye animations. */
const EXPECTED_ANIMATION_COUNT = 5
const SOFT_CHARCOAL = 'rgb(37, 37, 37)'

test.describe('aside ghost', () => {
  test('uses the soft charcoal surface on desktop', async ({ page }) => {
    await page.goto('/')

    await revealAside(page)

    await expect(page.getByTestId('aside-surface')).toHaveCSS(
      'background-color',
      SOFT_CHARCOAL,
    )
  })

  test('uses the soft charcoal surface in the mobile drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const drawer = await revealAside(page)

    await expect(drawer).toHaveCSS('background-color', SOFT_CHARCOAL)
  })

  test('runs every layer of its animation', async ({ page }) => {
    await page.goto('/')

    const ghost = (await revealAside(page)).getByTestId('aside-ghost')

    await expect(ghost).toBeVisible()

    const runningAnimations = await ghost.evaluate(
      (node) => node.getAnimations({ subtree: true }).length,
    )

    expect(runningAnimations).toBe(EXPECTED_ANIMATION_COUNT)
  })

  test('actually moves rather than sitting on a static first frame', async ({ page }) => {
    await page.goto('/')

    const ghost = (await revealAside(page)).getByTestId('aside-ghost')

    await expect(ghost).toBeVisible()

    const readTransform = () => ghost.evaluate((node) => getComputedStyle(node).transform)

    const firstFrame = await readTransform()

    await page.waitForTimeout(800)

    expect(await readTransform()).not.toBe(firstFrame)
  })

  test('holds completely still when the visitor prefers reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    const ghost = (await revealAside(page)).getByTestId('aside-ghost')

    await expect(ghost).toBeVisible()

    const runningAnimations = await ghost.evaluate(
      (node) => node.getAnimations({ subtree: true }).length,
    )

    expect(runningAnimations).toBe(0)
  })
})
