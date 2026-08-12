import { expect, test } from '@playwright/test'

import { revealAside } from './helpers/aside'

/** bob + sway + breathe on the body, plus the two eye animations. */
const EXPECTED_ANIMATION_COUNT = 5
const SOFT_CHARCOAL = 'rgb(37, 37, 37)'

test.describe('aside ghost', () => {
  test('uses the soft charcoal surface on desktop', async ({ page }) => {
    await page.goto('/')

    await revealAside(page)

    await expect(page.getByTestId('aside-surface')).toHaveCSS('background-color', SOFT_CHARCOAL)
  })

  test('uses the soft charcoal surface in the mobile drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const drawer = await revealAside(page)

    await expect(drawer).toHaveCSS('background-color', SOFT_CHARCOAL)
  })

  test('starts the tickle reaction by pointer and keyboard', async ({ page }) => {
    await page.goto('/')

    const aside = await revealAside(page)
    const trigger = aside.getByTestId('aside-ghost-trigger')

    await expect(trigger).toHaveRole('button')
    await trigger.click()
    await expect(trigger).toHaveAttribute('data-tickling', 'true')

    await expect
      .poll(() =>
        trigger.evaluate((node) =>
          node
            .getAnimations({ subtree: true })
            .some((animation) => animation.id === 'ghost-tickle-body'),
        ),
      )
      .toBe(true)

    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveAttribute('data-tickling', 'true')
  })

  test('restarts an active tickle reaction', async ({ page }) => {
    await page.goto('/')

    const trigger = (await revealAside(page)).getByTestId('aside-ghost-trigger')

    await trigger.click()
    await page.waitForTimeout(350)

    const elapsedBeforeRestart = await trigger.evaluate((node) => {
      const animation = node
        .getAnimations({ subtree: true })
        .find((candidate) => candidate.id === 'ghost-tickle-body')

      return Number(animation?.currentTime ?? 0)
    })

    await trigger.click()

    await expect
      .poll(() =>
        trigger.evaluate((node) => {
          const animation = node
            .getAnimations({ subtree: true })
            .find((candidate) => candidate.id === 'ghost-tickle-body')

          return Number(animation?.currentTime ?? Number.POSITIVE_INFINITY)
        }),
      )
      .toBeLessThan(elapsedBeforeRestart)
  })

  test('folds inward and settles without remounting the idle layers', async ({ page }) => {
    await page.goto('/')

    const trigger = (await revealAside(page)).getByTestId('aside-ghost-trigger')
    const body = trigger.getByTestId('aside-ghost-body')
    const sway = trigger.locator('[data-idle-layer="sway"]')
    const leftCreases = trigger.getByTestId('aside-ghost-left-creases')

    await sway.evaluate((node) => node.setAttribute('data-continuity-probe', 'preserved'))
    await trigger.click()

    await expect
      .poll(() => body.evaluate((node) => getComputedStyle(node).transform))
      .not.toBe('none')
    await expect
      .poll(() => leftCreases.evaluate((node) => Number(getComputedStyle(node).opacity)))
      .toBeGreaterThan(0.5)

    await expect(trigger).toHaveAttribute('data-tickling', 'false', { timeout: 2_300 })
    await expect(sway).toHaveAttribute('data-continuity-probe', 'preserved')
    await expect(body).toHaveCSS('transform', 'none')
    await expect(leftCreases).toHaveCSS('opacity', '0')
  })

  test('uses only brief eye feedback for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    const trigger = (await revealAside(page)).getByTestId('aside-ghost-trigger')

    await trigger.click()

    const animationIds = await trigger.evaluate((node) =>
      node.getAnimations({ subtree: true }).map(({ id }) => id),
    )

    expect(animationIds).not.toContain('ghost-tickle-body')
    expect(animationIds).toContain('ghost-reduced-giggle')
    await expect(trigger).toHaveAttribute('data-tickling', 'false', { timeout: 500 })
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
