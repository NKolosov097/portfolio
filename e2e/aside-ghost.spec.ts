import { expect, test } from '@playwright/test'

import { APPEARANCE_COOKIE_KEY, EAppearance } from '@/constants/theme.constants'

import { revealAside as revealAsideImmediately } from './helpers/aside'
import { openLanguageMenu } from './helpers/language'

/** bob + sway + breathe on the body, plus the two eye animations. */
const EXPECTED_ANIMATION_COUNT = 5

/** The idle five plus lantern swing, clipped light and halo flicker in halloween. */
const EXPECTED_HALLOWEEN_ANIMATION_COUNT = 8

/** Frame sampling window for the 180ms reduced-motion giggle, which a single read can miss. */
const REDUCED_MOTION_SAMPLE_WINDOW_MS = 1_500

const ORIGINAL_ASIDE_BACKGROUND = 'rgb(18, 18, 18)'

/** Let finite lantern presentation settle before measuring its steady artwork. */
async function revealAside(page: import('@playwright/test').Page) {
  const aside = await revealAsideImmediately(page)
  const travel = aside.getByTestId('aside-ghost-lantern-travel')
  const isHalloween =
    (await page.locator('html').getAttribute('data-appearance')) === EAppearance.halloween
  await expect(travel).toHaveAttribute('data-present', String(isHalloween))
  await expect
    .poll(() =>
      travel.evaluate(
        (node) =>
          node
            .getAnimations({ subtree: true })
            .filter(
              (animation) =>
                animation.effect?.getTiming().iterations !== Infinity &&
                animation.playState === 'running',
            ).length,
      ),
    )
    .toBe(0)
  return aside
}

test.describe('aside ghost', () => {
  test('uses the aside surface color for the language menu', async ({ context, page }) => {
    await context.addCookies([
      { name: APPEARANCE_COOKIE_KEY, value: EAppearance.original, domain: 'localhost', path: '/' },
    ])
    await page.goto('/')

    const languageMenu = await openLanguageMenu(page)

    await expect(languageMenu).toHaveCSS('background-color', ORIGINAL_ASIDE_BACKGROUND)
  })

  test('uses the original aside surface on desktop', async ({ context, page }) => {
    await context.addCookies([
      { name: APPEARANCE_COOKIE_KEY, value: EAppearance.original, domain: 'localhost', path: '/' },
    ])
    await page.goto('/')

    await revealAside(page)

    await expect(page.getByTestId('aside-surface')).toHaveCSS(
      'background-color',
      ORIGINAL_ASIDE_BACKGROUND,
    )
  })

  test('uses the original aside surface in the mobile drawer', async ({ context, page }) => {
    await context.addCookies([
      { name: APPEARANCE_COOKIE_KEY, value: EAppearance.original, domain: 'localhost', path: '/' },
    ])
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

    /**
     * The restart click is dispatched inside the page, right after the listener that observes it.
     * Driving it from the test instead would race the `evaluate` round trip: when the click wins,
     * the listener is registered too late, nothing ever resolves, and the test hangs to its budget.
     */
    const restartResult = await trigger.evaluate((node: HTMLButtonElement) => {
      const previous = node
        .getAnimations({ subtree: true })
        .find((animation) => animation.id === 'ghost-tickle-body')

      if (!previous) throw new Error('The first tickle animation did not start.')

      // Hold a real active run midway through its timeline, independent of WebKit frame timing.
      previous.pause()
      previous.currentTime = Number(previous.effect!.getTiming().duration) / 2

      return new Promise<{ cancelledPrevious: boolean; startedNew: boolean }>((resolve) => {
        window.addEventListener(
          'click',
          () => {
            // Window bubbling runs after React's handler, before any remote round trip.
            const next = node
              .getAnimations({ subtree: true })
              .find((animation) => animation.id === 'ghost-tickle-body')

            resolve({
              cancelledPrevious: previous.playState === 'idle',
              startedNew: Boolean(next && next !== previous && next.playState === 'running'),
            })
          },
          { once: true },
        )

        node.click()
      })
    })

    expect(restartResult).toEqual({ cancelledPrevious: true, startedNew: true })
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

      // Trigger the real completion callback without depending on WebKit wall-clock progress.
      bodyAnimation.finish()

      return minimumScale
    })

    expect(minimumHorizontalScale).toBeLessThan(0.9)

    await expect(trigger).toHaveAttribute('data-tickling', 'false')
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
          let deadline = Number.POSITIVE_INFINITY

          // Sample right after React's click handler, before the brief animation can finish.
          window.addEventListener(
            'click',
            () => {
              deadline = performance.now() + windowMs

              for (const { id } of node.getAnimations({ subtree: true })) {
                if (id) seenIds.add(id)
              }
            },
            { once: true },
          )

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
      (node) =>
        node.getAnimations({ subtree: true }).filter((animation) => {
          const target = (animation.effect as KeyframeEffect | null)?.target
          return (
            animation.playState === 'running' &&
            !(target instanceof Element && target.closest('mask'))
          )
        }).length,
    )

    expect(runningAnimations).toBe(EXPECTED_HALLOWEEN_ANIMATION_COUNT)
  })

  test('runs only the idle body layers in the original appearance', async ({ context, page }) => {
    await context.addCookies([
      { name: APPEARANCE_COOKIE_KEY, value: EAppearance.original, domain: 'localhost', path: '/' },
    ])
    await page.goto('/')

    const ghost = (await revealAside(page)).getByTestId('aside-ghost')

    await expect(ghost).toBeVisible()

    const runningAnimations = await ghost.evaluate(
      (node) =>
        node
          .getAnimations({ subtree: true })
          .filter((animation) => animation.playState === 'running').length,
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

  test('shows a recognizable lantern at mascot size in halloween, and hides it in original', async ({
    context,
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    const halloweenGhost = (await revealAside(page)).getByTestId('aside-ghost')
    const halloweenLantern = halloweenGhost.getByTestId('aside-ghost-lantern')

    await expect(halloweenLantern).toBeVisible()

    await expect
      .poll(() =>
        halloweenGhost.locator('defs image').evaluate(async (node) => {
          const image = new Image()
          image.src = node.getAttribute('href') ?? ''
          return image.decode().then(
            () => true,
            () => false,
          )
        }),
      )
      .toBe(true)

    // Shared sprite pixels keep the frame steady while the clipped glass alone flickers.
    const sprite = await halloweenGhost.evaluate(async (node) => {
      const definition = node.querySelector('defs image')
      const href = definition?.getAttribute('href')
      if (!href) throw new Error('Expected the lantern sprite definition.')
      const image = new Image()
      image.src = href
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const canvasContext = canvas.getContext('2d')
      if (!canvasContext) throw new Error('Expected canvas support for visible sprite bounds.')
      canvasContext.drawImage(image, 0, 0)
      const { data } = canvasContext.getImageData(0, 0, canvas.width, canvas.height)
      let left = canvas.width
      let right = 0
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          if (data[(y * canvas.width + x) * 4 + 3] > 16) {
            left = Math.min(left, x)
            right = Math.max(right, x)
          }
        }
      }
      const visibleWidth = ((right - left + 1) / canvas.width) * 1122 * 0.007387 * 0.9 * (50 / 16)
      const overlay = node.querySelector('[data-testid="aside-ghost-lantern-light"]')
      return {
        visibleWidth,
        definitions: node.querySelectorAll('defs image').length,
        uses: node.querySelectorAll('use').length,
        hasClip: overlay?.getAttribute('clip-path')?.startsWith('url(#'),
        width: image.naturalWidth,
        height: image.naturalHeight,
        baseAnimations: node.querySelector('use')?.getAnimations().length,
      }
    })
    expect(sprite.visibleWidth).toBeGreaterThanOrEqual(18)
    expect(sprite.visibleWidth).toBeLessThanOrEqual(22)
    expect(sprite).toMatchObject({
      definitions: 1,
      uses: 2,
      hasClip: true,
      width: 154,
      height: 192,
      baseAnimations: 0,
    })

    // The mobile drawer keeps sliding in; two separate boundingBox() reads can straddle that
    // transition and compare a mid-slide ghost rect against a settled lantern rect (or vice versa),
    // producing impossible containment failures. Reading both rects in one synchronous callback
    // guarantees they describe the same frame.
    const { ghostBox, lanternBox } = await halloweenGhost.evaluate((ghostNode) => {
      const lanternNode = ghostNode.querySelector('[data-testid="aside-ghost-lantern"]')

      if (!lanternNode) throw new Error('Expected the ghost to contain its lantern.')

      const ghostRect = ghostNode.getBoundingClientRect()
      const lanternRect = lanternNode.getBoundingClientRect()

      return {
        ghostBox: {
          x: ghostRect.x,
          y: ghostRect.y,
          width: ghostRect.width,
          height: ghostRect.height,
        },
        lanternBox: {
          x: lanternRect.x,
          y: lanternRect.y,
          width: lanternRect.width,
          height: lanternRect.height,
        },
      }
    })
    expect(lanternBox.width).toBeGreaterThanOrEqual(18)
    // The DOM box includes preserved transparent padding; visible alpha is checked above.
    expect(lanternBox.width).toBeLessThanOrEqual(24)
    expect(lanternBox.height).toBeGreaterThanOrEqual(27)
    expect(lanternBox.height).toBeLessThanOrEqual(32)

    expect(lanternBox.x).toBeGreaterThanOrEqual(ghostBox.x)
    expect(lanternBox.y).toBeGreaterThanOrEqual(ghostBox.y)
    expect(lanternBox.x + lanternBox.width).toBeLessThanOrEqual(ghostBox.x + ghostBox.width)
    expect(lanternBox.y + lanternBox.height).toBeLessThanOrEqual(ghostBox.y + ghostBox.height)

    await context.addCookies([
      { name: APPEARANCE_COOKIE_KEY, value: EAppearance.original, domain: 'localhost', path: '/' },
    ])
    await page.goto('/')

    const originalLantern = (await revealAside(page))
      .getByTestId('aside-ghost')
      .getByTestId('aside-ghost-lantern')

    await expect(originalLantern.locator('..')).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, -5, -4.2)',
    )
  })

  test('loads the lantern WebP sibling when its primary image fails', async ({ page }) => {
    await page.route('**/lantern.avif', (route) => route.abort())
    await page.goto('/')
    const ghost = (await revealAside(page)).getByTestId('aside-ghost')
    const definition = ghost.locator('defs image')
    await expect(definition).toHaveAttribute('href', '/assets/img/halloween/lantern.webp')
    expect(
      await definition.evaluate(async (node) => {
        const image = new Image()
        image.src = node.getAttribute('href') ?? ''
        await image.decode()
        return image.naturalHeight
      }),
    ).toBe(192)
  })

  test('does not retry a failed lantern fallback', async ({ page }) => {
    let fallbackRequests = 0
    await page.route('**/lantern.avif', (route) => route.abort())
    await page.route('**/lantern.webp', (route) => {
      fallbackRequests += 1
      return route.abort()
    })
    await page.goto('/')
    const ghost = (await revealAside(page)).getByTestId('aside-ghost')
    await expect(ghost.locator('defs image')).toHaveAttribute(
      'href',
      '/assets/img/halloween/lantern.webp',
    )
    await expect.poll(() => fallbackRequests).toBeGreaterThan(0)
    const initialRequests = fallbackRequests
    await page.waitForTimeout(500)
    expect(fallbackRequests).toBe(initialRequests)
  })

  test('holds completely still when the visitor prefers reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    const ghost = (await revealAside(page)).getByTestId('aside-ghost')

    await expect(ghost).toBeVisible()

    const runningAnimations = await ghost.evaluate(
      (node) =>
        node
          .getAnimations({ subtree: true })
          .filter((animation) => animation.playState === 'running').length,
    )

    expect(runningAnimations).toBe(0)
  })

  test('swings the lantern gently around its handle', async ({ page }) => {
    await page.goto('/')
    const swing = (await revealAside(page)).getByTestId('aside-ghost-lantern-swing')
    await expect(swing).toHaveCSS('transform-box', 'view-box')
    await expect(swing).toHaveCSS('transform-origin', '12.15px 6.1px')

    const motion = await swing.evaluate((node) => {
      const animation = node.getAnimations()[0]
      if (!animation) throw new Error('The lantern swing did not start.')
      animation.pause()
      // Sampling its own timeline avoids races with the ghost bob and drawer transition.
      const angles = [0, 2300].map((time) => {
        animation.currentTime = time
        const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform)
        return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI
      })
      return {
        angles,
        duration: animation.effect?.getTiming().duration,
        iterations: animation.effect?.getTiming().iterations,
      }
    })
    expect(motion.duration).toBe(4600)
    expect(motion.iterations).toBe(Infinity)
    expect(motion.angles[0]).toBeCloseTo(-3, 1)
    expect(motion.angles[1]).toBeCloseTo(3, 1)
  })

  test('flickers the lantern flame continuously without moving it', async ({ page }) => {
    await page.goto('/')

    const flame = (await revealAside(page)).getByTestId('aside-ghost-lantern-light')

    await expect(flame).toBeVisible()

    const result = await flame.evaluate((node) => {
      const animation = node
        .getAnimations()
        .find((candidate) => candidate.effect?.getTiming().duration === 3700)

      if (!animation) throw new Error('The lantern flame animation did not start.')

      const timing = animation.effect!.getTiming()
      animation.pause()

      // Opacity should be a controlled read at each sampled point, never a bare transform.
      const readAt = (currentTime: number) => {
        animation.currentTime = currentTime
        const style = getComputedStyle(node)

        return { opacity: Number(style.opacity), transform: style.transform }
      }

      return {
        iterations: timing.iterations,
        samples: [0, 925, 1850, 2775].map(readAt),
      }
    })

    expect(result.iterations).toBe(Infinity)
    expect(result.samples.every((sample) => sample.transform === 'none')).toBe(true)

    const opacities = result.samples.map((sample) => sample.opacity)
    expect(new Set(opacities).size).toBeGreaterThan(1)
  })

  test('keeps the lantern flame at a stable opacity for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    const flame = (await revealAside(page)).getByTestId('aside-ghost-lantern-light')

    await expect(flame).toBeVisible()

    const hasLightAnimation = await flame.evaluate((node) => node.getAnimations().length > 0)

    expect(hasLightAnimation).toBe(false)

    await expect(flame).toHaveCSS('opacity', '0.9')
  })
  test('draws the loaded lantern on initial Halloween with settling inertia', async ({ page }) => {
    await page.addInitScript(() => {
      const original = Element.prototype.animate
      Element.prototype.animate = new Proxy(original, {
        apply(target, node, args) {
          const animation = Reflect.apply(target, node, args) as Animation
          if (typeof args[1] === 'object' && args[1]?.duration === 1150) animation.pause()
          return animation
        },
      })
    })
    await page.goto('/')
    const aside = await revealAsideImmediately(page)
    const travel = aside.getByTestId('aside-ghost-lantern-travel')
    const inertia = aside.getByTestId('aside-ghost-lantern-inertia')
    await expect(travel).toHaveAttribute('data-present', 'true')
    await expect
      .poll(() =>
        inertia.evaluate((node) =>
          node.getAnimations().some((animation) => animation.id === 'lantern-enter'),
        ),
      )
      .toBe(true)
    const poses = await inertia.evaluate((node) => {
      const animation = node.getAnimations().find((candidate) => candidate.id === 'lantern-enter')
      if (!animation) throw new Error('Expected initial lantern inertia.')
      return [0, 450, 900, 970, 1065, 1150].map((time) => {
        animation.currentTime = time
        const matrix = new DOMMatrix(getComputedStyle(node).transform)
        return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI
      })
    })
    expect(poses[0]).toBeCloseTo(0)
    expect(poses[1]).toBeCloseTo(0)
    expect(poses[2]).toBeCloseTo(0)
    expect(poses[3]).toBeCloseTo(5)
    expect(poses[4]).toBeCloseTo(-2)
    expect(poses[5]).toBeCloseTo(0)
    await expect(travel).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
  })

  test('keeps the initial original lantern fully occluded without a flash', async ({
    context,
    page,
  }) => {
    await context.addCookies([
      { name: APPEARANCE_COOKIE_KEY, value: EAppearance.original, domain: 'localhost', path: '/' },
    ])
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const aside = await revealAside(page)
    const ghost = aside.getByTestId('aside-ghost')
    const travel = aside.getByTestId('aside-ghost-lantern-travel')
    await expect(travel).toHaveAttribute('data-present', 'false')
    await expect(travel).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -5, -4.2)')
    expect(
      await aside
        .getByTestId('aside-ghost-lantern-inertia')
        .evaluate((node) => node.getAnimations().length),
    ).toBe(0)
    // Pin both captures to the same pixel grid while fonts and the mobile drawer settle.
    await ghost.evaluate((node) => {
      node.setAttribute('style', 'position:fixed;left:100px;top:100px')
    })
    await page.evaluate(() => document.fonts.ready)
    await expect
      .poll(() =>
        ghost.locator('defs image').evaluate(async (node) => {
          const image = new Image()
          image.src = node.getAttribute('href') ?? ''
          return image.decode().then(
            () => true,
            () => false,
          )
        }),
      )
      .toBe(true)
    const occluded = await ghost.screenshot()
    await travel.evaluate((node) => {
      node.setAttribute('visibility', 'hidden')
    })
    expect(await ghost.screenshot({ path: '.playwright-mcp/gesture-test-baseline.png' })).toEqual(
      occluded,
    )
  })

  test('stows, reverses and redraws the lantern continuously while tickled', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    const aside = await revealAside(page)
    const travel = aside.getByTestId('aside-ghost-lantern-travel')
    const inertia = aside.getByTestId('aside-ghost-lantern-inertia')
    const toggle = page.getByTestId('appearance-toggle-switch')
    await toggle.dispatchEvent('click')
    await expect(travel).toHaveAttribute('data-present', 'false')
    await expect(aside.getByTestId('aside-ghost-lantern')).toBeAttached()
    const before = await travel.evaluate((node) => {
      const animation = node.getAnimations()[0]
      animation?.pause()
      if (animation) animation.currentTime = 260
      return new DOMMatrix(getComputedStyle(node).transform).e
    })
    expect(before).toBeGreaterThan(0)
    expect(before).toBeLessThan(5.5)
    await toggle.dispatchEvent('click')
    await expect(travel).toHaveAttribute('data-present', 'true')
    await aside.getByTestId('aside-ghost-trigger').click()
    await toggle.dispatchEvent('click')
    await toggle.dispatchEvent('click')
    await expect(travel).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
    await expect
      .poll(() =>
        inertia.evaluate(
          (node) =>
            node.getAnimations().filter((animation) => animation.playState === 'running').length,
        ),
      )
      .toBe(0)
    await toggle.dispatchEvent('click')
    await expect(travel).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -5, -4.2)')
    await toggle.dispatchEvent('click')
    await page.goto('/?lantern-remount=1')
    expect(errors).toEqual([])
  })

  test('settles lantern travel and inertia immediately when reduced motion changes live', async ({
    page,
  }) => {
    await page.goto('/')
    const aside = await revealAside(page)
    const travel = aside.getByTestId('aside-ghost-lantern-travel')
    const inertia = aside.getByTestId('aside-ghost-lantern-inertia')
    await page.getByTestId('appearance-toggle-switch').dispatchEvent('click')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(travel).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -5, -4.2)')
    await expect.poll(() => inertia.evaluate((node) => node.getAnimations().length)).toBe(0)
    await page.getByTestId('appearance-toggle-switch').dispatchEvent('click')
    await expect(travel).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
    expect(await inertia.evaluate((node) => node.getAnimations().length)).toBe(0)
  })
  test('preserves the same idle lantern swing phase across appearance toggles', async ({
    page,
  }) => {
    await page.goto('/')
    const aside = await revealAside(page)
    const swing = aside.getByTestId('aside-ghost-lantern-swing')
    await swing.evaluate((node) => {
      const animation = node.getAnimations()[0]
      if (!animation) throw new Error('Expected idle swing.')
      animation.pause()
      animation.currentTime = 1150
      animation.id = 'retained-lantern-swing'
    })
    const before = await swing.evaluate((node) => getComputedStyle(node).transform)
    await page.getByTestId('appearance-toggle-switch').dispatchEvent('click')
    expect(await swing.evaluate((node) => node.getAnimations()[0]?.id)).toBe(
      'retained-lantern-swing',
    )
    await expect(swing).toHaveCSS('transform', before)
    await page.getByTestId('appearance-toggle-switch').dispatchEvent('click')
    expect(await swing.evaluate((node) => node.getAnimations()[0]?.id)).toBe(
      'retained-lantern-swing',
    )
    await expect(swing).toHaveCSS('transform', before)
  })
  test('turns outboard then returns behind the filled moving body mask', async ({ page }) => {
    await page.goto('/')
    const aside = await revealAside(page)
    const ghost = aside.getByTestId('aside-ghost')
    const travel = aside.getByTestId('aside-ghost-lantern-travel')
    const depth = ghost.getByTestId('aside-ghost-lantern-depth')
    // Fixed pixels isolate the masked artwork from surrounding text and drawer movement.
    await ghost.evaluate((node) => {
      node.setAttribute('style', 'position:fixed;left:100px;top:100px;z-index:999999')
      for (const animation of node.getAnimations({ subtree: true })) {
        animation.pause()
        if (animation.effect?.getTiming().iterations === Infinity) animation.currentTime = 0
      }
    })
    await page.getByTestId('appearance-toggle-switch').dispatchEvent('click')
    // Seek both persistent tracks together while holding separate settling inertia steady.
    const seekGesture = async (phase: number, depthPhase = phase) => {
      await ghost.evaluate(
        (node, sample) => {
          for (const animation of node.getAnimations({ subtree: true })) {
            animation.pause()
            if (animation.id === 'lantern-gesture-travel')
              animation.currentTime = sample.phase * 900
            if (animation.id === 'lantern-gesture-depth')
              animation.currentTime = sample.depthPhase * 900
            if (animation.id === 'lantern-exit') animation.currentTime = 90
          }
        },
        { phase, depthPhase },
      )
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      )
    }
    // Include the outboard turn beyond the SVG viewport instead of cropping it away.
    const box = await ghost.boundingBox()
    if (!box) throw new Error('Expected visible ghost bounds.')
    const capture = () =>
      page.screenshot({
        clip: { x: Math.floor(box.x - 10), y: Math.floor(box.y - 15), width: 100, height: 90 },
      })
    const positions = []
    for (const phase of [0, 0.25, 0.42, 0.55, 0.72, 0.88, 1]) {
      await seekGesture(phase)
      positions.push(
        await travel.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).e),
      )
    }
    expect(positions[0]).toBeCloseTo(0)
    expect(positions[2]).toBeCloseTo(5.5)
    expect(positions[3]).toBeCloseTo(5.5)
    expect(positions[4]).toBeCloseTo(2)
    expect(positions[6]).toBeCloseTo(-5)
    await seekGesture(0.42, 0)
    const outsideClip = {
      x: Math.ceil(box.x + box.width + 3),
      y: Math.floor(box.y - 15),
      width: 35,
      height: 90,
    }
    const outboardFront = await page.screenshot({ clip: outsideClip })
    await seekGesture(0.42, 1)
    expect((await page.screenshot({ clip: outsideClip })).equals(outboardFront)).toBe(true)
    await travel.evaluate((node) => node.setAttribute('visibility', 'hidden'))
    expect((await page.screenshot({ clip: outsideClip })).equals(outboardFront)).toBe(false)
    await travel.evaluate((node) => node.removeAttribute('visibility'))
    await seekGesture(0.72)
    const partial = await capture()
    await seekGesture(0.72, 0)
    expect((await capture()).equals(partial)).toBe(false)
    await seekGesture(0.72)
    await travel.evaluate((node) => node.setAttribute('visibility', 'hidden'))
    expect(await capture()).not.toEqual(partial)
    await travel.evaluate((node) => node.removeAttribute('visibility'))
    await seekGesture(1)
    const behind = await capture()
    await travel.evaluate((node) => node.setAttribute('visibility', 'hidden'))
    expect((await capture()).equals(behind)).toBe(true)
    expect(await depth.evaluate((node) => getComputedStyle(node).opacity)).toBe('1')
  })

  test('keeps both owned gesture tracks at the endpoint after an immediate reversal', async ({
    page,
  }) => {
    await page.goto('/')
    const aside = await revealAside(page)
    const travel = aside.getByTestId('aside-ghost-lantern-travel')
    await page.getByTestId('appearance-toggle-switch').dispatchEvent('click')
    await expect(travel).toHaveAttribute('data-present', 'false')
    await travel.evaluate((node) => {
      const ghost = node.closest('svg')
      if (!ghost) throw new Error('Expected ghost SVG.')
      for (const animation of ghost.getAnimations({ subtree: true })) {
        if (animation.id.startsWith('lantern-gesture-')) {
          animation.pause()
          animation.currentTime = 900
        }
      }
    })
    await page.getByTestId('appearance-toggle-switch').dispatchEvent('click')
    await page.getByTestId('appearance-toggle-switch').dispatchEvent('click')
    await expect(travel).toHaveAttribute('data-present', 'false')
    await expect
      .poll(() =>
        aside.getByTestId('aside-ghost').evaluate((node) =>
          node
            .getAnimations({ subtree: true })
            .filter((animation) => animation.id.startsWith('lantern-gesture-'))
            .map((animation) => ({
              time: animation.currentTime,
              running: animation.playState === 'running',
            })),
        ),
      )
      .toEqual([
        { time: 900, running: false },
        { time: 900, running: false },
      ])
  })
  test('keeps inertia neutral at the outboard turn and settles only after arrival', async ({
    page,
  }) => {
    // Hold the short neutralization long enough to inspect it on slower WebKit workers.
    await page.addInitScript(() => {
      Element.prototype.animate = new Proxy(Element.prototype.animate, {
        apply(target, node, args) {
          const animation = Reflect.apply(target, node, args) as Animation
          if (typeof args[1] === 'object' && args[1]?.duration === 90) animation.pause()
          return animation
        },
      })
    })
    await page.goto('/')
    const aside = await revealAside(page)
    const inertia = aside.getByTestId('aside-ghost-lantern-inertia')
    await page.getByTestId('appearance-toggle-switch').dispatchEvent('click')
    const exit = await inertia.evaluate((node) => {
      const animation = node.getAnimations().find((candidate) => candidate.id === 'lantern-exit')
      if (!animation) throw new Error('Expected exit neutralization.')
      const timing = animation.effect?.getTiming()
      const frames = (animation.effect as KeyframeEffect).getKeyframes()
      return { duration: timing?.duration, frames: frames.map((frame) => frame.transform) }
    })
    expect(exit.duration).toBe(90)
    expect(exit.frames.at(-1)).toBe('rotate(0deg)')
    await inertia.evaluate((node) =>
      node
        .getAnimations()
        .find((animation) => animation.id === 'lantern-exit')
        ?.finish(),
    )
    await expect.poll(() => inertia.evaluate((node) => node.getAnimations().length)).toBe(0)
    await expect(inertia).toHaveCSS('transform', 'none')
    await page.getByTestId('appearance-toggle-switch').dispatchEvent('click')
    const result = await inertia.evaluate((node) => {
      const animation = node.getAnimations().find((candidate) => candidate.id === 'lantern-enter')
      if (!animation || !animation.effect) throw new Error('Expected return settling.')
      animation.pause()
      const duration = Number(animation.effect.getTiming().duration)
      const arrival = duration - 250
      const angles = [Math.min(200, arrival), arrival, arrival + 70, arrival + 165, duration].map(
        (time) => {
          animation.currentTime = time
          const matrix = new DOMMatrix(getComputedStyle(node).transform)
          return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI
        },
      )
      return { duration, arrival, angles }
    })
    expect(result.angles[0]).toBeCloseTo(0)
    expect(result.angles[1]).toBeCloseTo(0)
    expect(result.angles[2]).toBeCloseTo(5)
    expect(result.angles[3]).toBeCloseTo(-2)
    expect(result.angles[4]).toBeCloseTo(0)
  })
})
