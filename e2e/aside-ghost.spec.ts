import { expect, test } from '@playwright/test'

import { revealAside } from './helpers/aside'
import { openLanguageMenu } from './helpers/language'

/** bob + sway + breathe on the body, plus the two eye animations. */
const EXPECTED_ANIMATION_COUNT = 5

/** Frame sampling window for the 180ms reduced-motion giggle, which a single read can miss. */
const REDUCED_MOTION_SAMPLE_WINDOW_MS = 1_500
const ORIGINAL_ASIDE_BACKGROUND = 'rgb(18, 18, 18)'

test.describe('aside ghost', () => {
  test('uses the aside surface color for the language menu', async ({ page }) => {
    await page.goto('/')

    const languageMenu = await openLanguageMenu(page)

    await expect(languageMenu).toHaveCSS('background-color', ORIGINAL_ASIDE_BACKGROUND)
  })

  test('uses the original aside surface on desktop', async ({ page }) => {
    await page.goto('/')

    await revealAside(page)

    await expect(page.getByTestId('aside-surface')).toHaveCSS(
      'background-color',
      ORIGINAL_ASIDE_BACKGROUND,
    )
  })

  test('uses the original aside surface in the mobile drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const drawer = await revealAside(page)

    await expect(drawer).toHaveCSS('background-color', ORIGINAL_ASIDE_BACKGROUND)
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

  test('folds toward its center without marks and settles without remounting', async ({ page }) => {
    await page.goto('/')

    const trigger = (await revealAside(page)).getByTestId('aside-ghost-trigger')
    const body = trigger.getByTestId('aside-ghost-body')
    const sway = trigger.locator('[data-idle-layer="sway"]')

    await expect(trigger.getByTestId('aside-ghost-left-creases')).toHaveCount(0)
    await expect(trigger.getByTestId('aside-ghost-right-creases')).toHaveCount(0)
    await expect(body).toHaveCSS('transform-box', 'fill-box')

    const transformOrigin = await body.evaluate((node) => getComputedStyle(node).transformOrigin)
    const [originX, originY] = transformOrigin.split(' ').map(Number.parseFloat)

    expect(originX).toBeGreaterThan(0)
    expect(originY).toBeGreaterThan(0)

    await sway.evaluate((node) => node.setAttribute('data-continuity-probe', 'preserved'))
    await trigger.click()

    const minimumHorizontalScale = await trigger.evaluate((node) => {
      const bodyAnimation = node
        .getAnimations({ subtree: true })
        .find((animation) => animation.id === 'ghost-tickle-body')
      const bodyNode = node.querySelector<SVGGElement>('[data-testid="aside-ghost-body"]')

      if (!bodyAnimation || !bodyNode) {
        throw new Error('The body tickle animation did not start')
      }

      bodyAnimation.pause()
      let minimumScale = 1

      for (let currentTime = 0; currentTime <= 1_800; currentTime += 20) {
        bodyAnimation.currentTime = currentTime
        const transform = getComputedStyle(bodyNode).transform
        const scale = transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a

        minimumScale = Math.min(minimumScale, scale)
      }

      bodyAnimation.currentTime = 0
      bodyAnimation.play()

      return minimumScale
    })

    expect(minimumHorizontalScale).toBeLessThan(0.9)

    await expect(trigger).toHaveAttribute('data-tickling', 'false', { timeout: 2_300 })
    await expect(sway).toHaveAttribute('data-continuity-probe', 'preserved')
    await expect(body).toHaveCSS('transform', 'none')
  })

  test('uses only brief eye feedback for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    const trigger = (await revealAside(page)).getByTestId('aside-ghost-trigger')

    const collectedAnimationIds = trigger.evaluate(
      (node, windowMs) =>
        new Promise<string[]>((resolve) => {
          const seenIds = new Set<string>()
          const deadline = performance.now() + windowMs

          const sample = () => {
            for (const { id } of node.getAnimations({ subtree: true })) {
              if (id) seenIds.add(id)
            }

            if (performance.now() >= deadline) {
              resolve([...seenIds])
              return
            }

            requestAnimationFrame(sample)
          }

          sample()
        }),
      REDUCED_MOTION_SAMPLE_WINDOW_MS,
    )

    await trigger.click()

    const animationIds = await collectedAnimationIds

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
