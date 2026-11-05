import { expect, type Locator, test } from '@playwright/test'

import { revealAside } from './helpers/aside'

import { APPEARANCE_COOKIE_KEY, EAppearance } from '@/constants/theme.constants'

/** Frost accent the winter palette drives, which the snow's baked glow is tinted with. */
const WINTER_BRAND_COLOR = '#8fd3ff'

/** Check the snow raster reaches past its section without creating sideways scrolling. */
async function expectSnowOverflow(canvas: Locator) {
  await expect(async () => {
    const geometry = await canvas.evaluate((node) => {
      const field = node.parentElement
      const section = field?.parentElement
      if (!field || !section) throw new Error('Expected the snow field and its section.')
      const bounds = node.getBoundingClientRect()
      const sectionBounds = section.getBoundingClientRect()
      const root = document.documentElement
      const fieldStyle = getComputedStyle(field)
      const veilStyle = getComputedStyle(field, '::after')
      return {
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        bottom: bounds.bottom,
        fadeHeader: Number.parseFloat(fieldStyle.getPropertyValue('--snow-header-bottom')),
        veilPosition: veilStyle.position,
        veilTop: Number.parseFloat(veilStyle.top),
        veilHeight: Number.parseFloat(veilStyle.height),
        canvasHeight: bounds.height,
        clipPath: fieldStyle.clipPath,
        headerBottom: document.getElementById('page-header')?.getBoundingClientRect().bottom ?? 0,
        sectionTop: sectionBounds.top,
        sectionBottom: sectionBounds.bottom,
        viewportWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        pointerEvents: getComputedStyle(field).pointerEvents,
        mask: getComputedStyle(node).maskImage,
      }
    })

    expect(geometry.left).toBeCloseTo(0, 0)
    expect(geometry.right).toBeCloseTo(geometry.viewportWidth, 0)
    expect(geometry.top).toBeLessThan(geometry.sectionTop)
    expect(geometry.bottom).toBeGreaterThan(geometry.sectionBottom)
    expect(geometry.fadeHeader).toBeCloseTo(geometry.headerBottom, 0)
    expect(geometry.veilPosition).toBe('fixed')
    expect(geometry.veilTop).toBe(0)
    expect(geometry.veilHeight).toBeCloseTo(geometry.headerBottom + geometry.canvasHeight * 0.18, 0)
    expect(geometry.clipPath).toBe('inset(0px)')
    expect(geometry.mask.match(/linear-gradient/g)).toHaveLength(1)
    expect(geometry.mask).toContain('82%')
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth)
    expect(geometry.pointerEvents).toBe('none')
  }).toPass()
}

/** Seek the real winter tracks while holding unrelated idle motion at its initial pose. */
async function seekWinterPose(ghost: Locator, progress: number) {
  await ghost.evaluate((node, fraction) => {
    // Finish a mobile drawer entrance before comparing geometry across sampled poses.
    for (const animation of document.getAnimations()) {
      const effect = animation.effect as KeyframeEffect | null
      if (
        animation.playState === 'running' &&
        effect?.getTiming().iterations !== Infinity &&
        effect?.target instanceof Element &&
        effect.target.contains(node)
      ) {
        animation.finish()
      }
    }
    const winterTracks = [
      ...node.querySelectorAll(
        '[data-testid="aside-ghost-winter-hat"], [data-testid="aside-ghost-winter-hand"], [data-testid="aside-ghost-winter-clip"], [data-testid="aside-ghost-winter-hand-reveal"]',
      ),
    ].flatMap((part) => part.getAnimations())
    if (winterTracks.length !== 4) throw new Error('Expected all four winter animation tracks.')
    for (const animation of node.getAnimations({ subtree: true })) {
      // Preserve finite seasonal tracks at their stowed endpoint while sampling winter motion.
      if (animation.effect?.getTiming().iterations !== Infinity) continue
      animation.pause()
      // Cycle-relative poses compensate for CSS delay; global-clock checks deliberately do not.
      const delay = animation.effect.getTiming().delay ?? 0
      animation.currentTime = winterTracks.includes(animation) ? fraction * 12000 + delay : 0
    }
  }, progress)
}

/** Read visible geometry together so layout or an animation frame cannot separate the samples. */
async function winterGeometry(ghost: Locator) {
  return ghost.evaluate((node) => {
    if (!(node instanceof SVGSVGElement)) throw new Error('Expected the ghost SVG.')
    const outline = node.querySelector<SVGPathElement>('[data-testid="aside-ghost-outline"]')
    const clip = node.querySelector<SVGRectElement>('[data-testid="aside-ghost-winter-clip"]')
    const brim = node.querySelector<SVGRectElement>('[data-testid="aside-ghost-winter-brim"]')
    const hand = node.querySelector<SVGGElement>('[data-testid="aside-ghost-winter-hand"]')
    const reveal = node.querySelector<SVGRectElement>(
      '[data-testid="aside-ghost-winter-hand-reveal"]',
    )
    const outlineMatrix = outline?.getScreenCTM()
    const brimMatrix = brim?.getScreenCTM()
    const handMatrix = hand?.getScreenCTM()
    const clipMatrix = clip?.getScreenCTM()
    const svgMatrix = node.getScreenCTM()
    if (
      !clip ||
      !outlineMatrix ||
      !brim ||
      !brimMatrix ||
      !hand ||
      !handMatrix ||
      !reveal ||
      !clipMatrix ||
      !svgMatrix
    )
      throw new Error('Expected the complete winter artwork.')
    const handOrigin = new DOMPoint(14.1, 10).matrixTransform(handMatrix)
    const bodyOrigin = handOrigin.matrixTransform(outlineMatrix.inverse())
    const finger = new DOMPoint(14.1, 9)
      .matrixTransform(handMatrix)
      .matrixTransform(outlineMatrix.inverse())
    const contact = handOrigin.matrixTransform(brimMatrix.inverse())
    return {
      // Compare both ends through their own matrices; Firefox inflates rotated bounding boxes.
      edges: [1.5, 14.5].map((x) => {
        const clipped = new DOMPoint(x, clip.y.baseVal.value)
          .matrixTransform(clipMatrix)
          .matrixTransform(svgMatrix.inverse())
          .matrixTransform(outlineMatrix)
        const padded = new DOMPoint(
          x,
          brim.y.baseVal.value + brim.height.baseVal.value,
        ).matrixTransform(brimMatrix)
        const local = padded.matrixTransform(outlineMatrix.inverse())
        return {
          clip: { x: clipped.x, y: clipped.y },
          brim: { x: padded.x, y: padded.y },
          bodyLocal: { x: local.x, y: local.y },
        }
      }),
      hand: {
        x: bodyOrigin.x,
        y: bodyOrigin.y,
        fingerY: finger.y - bodyOrigin.y,
        opacity: Number(getComputedStyle(hand).opacity),
      },
      contact: { x: contact.x, y: contact.y },
      revealX: new DOMMatrix(getComputedStyle(reveal).transform).e,
      eyes: [...node.querySelectorAll<SVGCircleElement>('circle')]
        .filter((part) => part.getAttribute('r') === '0.7')
        .map((part) => {
          const matrix = part.getScreenCTM()
          if (!matrix) throw new Error('Expected an eye matrix.')
          const eye = new DOMPoint(part.cx.baseVal.value, part.cy.baseVal.value)
            .matrixTransform(matrix)
            .matrixTransform(brimMatrix.inverse())
          return { x: eye.x, y: eye.y }
        }),
    }
  })
}

/** Check that the moving crown clip follows the whole tilted brim edge. */
function expectAlignedWinterClip(pose: Awaited<ReturnType<typeof winterGeometry>>) {
  for (const edge of pose.edges) {
    expect(edge.clip.x).toBeCloseTo(edge.brim.x, 4)
    expect(edge.clip.y).toBeCloseTo(edge.brim.y, 4)
  }
}

/** Sample the shared winter epoch without compensating for each track's CSS delay. */
async function winterClockPose(ghost: Locator, globalTime: number) {
  await seekWinterPose(ghost, 0)
  return ghost.evaluate((node, time) => {
    for (const animation of node.getAnimations({ subtree: true })) {
      if (
        animation instanceof CSSAnimation &&
        /winter-(bob|breathe|sway|hat-slip|hand-lift|hand-reveal)/.test(animation.animationName)
      ) {
        animation.currentTime = time
      }
    }
    const outline = node.querySelector<SVGPathElement>('[data-testid="aside-ghost-outline"]')
    const hat = node.querySelector<SVGGElement>('[data-testid="aside-ghost-winter-hat"]')
    const outlineMatrix = outline?.getScreenCTM()
    const hatMatrix = hat?.getScreenCTM()
    if (!outlineMatrix || !hatMatrix) throw new Error('Expected winter clock geometry.')
    const center = new DOMPoint(8, 8).matrixTransform(outlineMatrix)
    const relativeHat = outlineMatrix.inverse().multiply(hatMatrix)
    const pivot = new DOMPoint(8, 4.55).matrixTransform(relativeHat)
    return {
      center: { x: center.x, y: center.y },
      hat: { angle: Math.atan2(relativeHat.b, relativeHat.a), y: pivot.y },
    }
  }, globalTime)
}

/** Verify the actual lower-right reversals and alternate hat falls within one winter cohort. */
async function expectWinterClock(ghost: Locator) {
  const startTimes = await ghost.evaluate(async (node) => {
    const owned = node
      .getAnimations({ subtree: true })
      .filter(
        (animation): animation is CSSAnimation =>
          animation instanceof CSSAnimation &&
          /winter-(bob|breathe|sway|hat-slip|hand-lift|hand-reveal)/.test(animation.animationName),
      )
    if (owned.length === 0) throw new Error('Expected a running winter animation cohort.')
    await Promise.all(owned.map((animation) => animation.ready))
    return owned.map((animation) => {
      if (animation.playState !== 'running' || typeof animation.startTime !== 'number') {
        throw new Error('Expected each winter track to share a running numeric epoch.')
      }
      return animation.startTime
    })
  })
  expect(Math.max(...startTimes) - Math.min(...startTimes)).toBeLessThan(1)
  const left = await winterClockPose(ghost, 4500)
  for (const [index, time] of [1500, 7500, 13500, 19500].entries()) {
    const before = await winterClockPose(ghost, time - 100)
    const turn = await winterClockPose(ghost, time)
    const after = await winterClockPose(ghost, time + 100)
    expect(turn.center.x).toBeGreaterThan(left.center.x)
    expect(turn.center.y).toBeGreaterThan(before.center.y)
    expect(turn.center.y).toBeGreaterThan(after.center.y)
    expect(turn.hat.angle).toBeCloseTo(0, 5)
    if (index % 2 === 1) {
      expect(after.hat.angle).toBeGreaterThan(turn.hat.angle + 0.001)
      expect(after.hat.y).toBeGreaterThan(turn.hat.y)
    } else {
      expect(before.hat.angle).toBeCloseTo(0, 5)
      expect(after.hat.angle).toBeCloseTo(0, 5)
      expect(after.hat.y).toBeCloseTo(turn.hat.y, 4)
    }
  }
}

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
    await expectSnowOverflow(canvas)

    // Read in the same task as scrolling so an asynchronous handler cannot conceal fade lag.
    const scrolledFade = await canvas.evaluate((node) => {
      const snowLayer = node.parentElement
      if (!snowLayer) throw new Error('Expected the snow field.')
      const before = getComputedStyle(snowLayer)
      const header = before.getPropertyValue('--snow-header-bottom')
      const fade = before.getPropertyValue('--snow-fade-height')
      window.scrollTo(0, 150)
      const after = getComputedStyle(snowLayer)
      const veil = getComputedStyle(snowLayer, '::after')
      return {
        position: veil.position,
        top: veil.top,
        isHeaderUnchanged: after.getPropertyValue('--snow-header-bottom') === header,
        isFadeUnchanged: after.getPropertyValue('--snow-fade-height') === fade,
      }
    })
    expect(scrolledFade).toEqual({
      position: 'fixed',
      top: '0px',
      isHeaderUnchanged: true,
      isFadeUnchanged: true,
    })
    await expectSnowOverflow(canvas)
    const clippedVeil = await canvas.evaluate((node) => {
      window.scrollTo(0, node.getBoundingClientRect().bottom + window.scrollY + 100)
      return getComputedStyle(node.parentElement ?? node).clipPath
    })
    expect(clippedVeil).toBe('inset(0px)')
    await page.evaluate(() => window.scrollTo(0, 0))

    const aside = page.getByTestId('aside-surface')
    if (await aside.isVisible()) {
      // Enable snow hit testing temporarily so pointer transparency cannot hide a stacking regression.
      const isAsideAboveSnow = await canvas.evaluate((node) => {
        const snowLayer = node.parentElement
        const surface = document.querySelector('[data-testid="aside-surface"]')
        if (!snowLayer || !surface) throw new Error('Expected the snow field and aside surface.')
        const originalPointerEvents = snowLayer.style.pointerEvents
        try {
          snowLayer.style.pointerEvents = 'auto'
          const bounds = surface.getBoundingClientRect()
          return surface.contains(
            document.elementFromPoint(
              bounds.left + bounds.width / 2,
              bounds.top + bounds.height / 2,
            ),
          )
        } finally {
          snowLayer.style.pointerEvents = originalPointerEvents
        }
      })
      expect(isAsideAboveSnow).toBe(true)
    }
  })

  for (const path of ['/no-such-page', '/articles/no-such-article']) {
    test(`snows beyond the not-found section at ${path}`, async ({ page }) => {
      const response = await page.goto(path)

      if (path === '/no-such-page') expect(response?.status()).toBe(404)
      await expect(page.getByTestId('not-found-link')).toBeVisible()
      await expect(page.getByTestId('not-found-link')).toHaveAttribute(
        'href',
        path === '/no-such-page' ? '/' : '/articles',
      )

      const canvas = page.getByTestId('home-sparkle-field')
      const field = canvas.locator('..')
      await expect(field).toHaveAttribute('data-preset', 'snow')
      await expect(field).toHaveAttribute('data-ready', 'true')
      await expectSnowOverflow(canvas)
      const scrollBounds = await canvas.evaluate((node) => {
        const footer = document.querySelector('footer')
        if (!footer) throw new Error('Expected the page footer.')
        return {
          canvasBottom: node.getBoundingClientRect().bottom,
          bodyBottom: document.body.getBoundingClientRect().bottom,
          footerBottom: footer.getBoundingClientRect().bottom + window.scrollY,
          scrollY: window.scrollY,
          scrollHeight: document.documentElement.scrollHeight,
        }
      })
      expect(scrollBounds.canvasBottom).toBeLessThanOrEqual(scrollBounds.bodyBottom + 1)
      expect(scrollBounds.scrollHeight).toBeLessThanOrEqual(
        Math.ceil(scrollBounds.bodyBottom + scrollBounds.scrollY) + 1,
      )
      expect(scrollBounds.footerBottom).toBeCloseTo(scrollBounds.scrollHeight, 0)
    })
  }

  test('keeps snow viewport-wide when the section stays at its maximum width', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.goto('/')
    const canvas = page.getByTestId('home-sparkle-field')
    await expect(canvas.locator('..')).toHaveAttribute('data-ready', 'true')
    await expectSnowOverflow(canvas)
    const section = canvas.locator('../..')
    const before = await section.boundingBox()
    if (!before) throw new Error('Expected the home section bounds.')

    await page.setViewportSize({ width: 1800, height: 900 })
    await expectSnowOverflow(canvas)
    const after = await section.boundingBox()
    if (!after) throw new Error('Expected the resized home section bounds.')
    expect(after.width).toBeCloseTo(before.width, 0)
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

  test('removes and restores the winter ghost artwork with the appearance', async ({ page }) => {
    await page.goto('/')
    const aside = await revealAside(page)
    const hat = aside.getByTestId('aside-ghost-winter-hat')
    const hand = aside.getByTestId('aside-ghost-winter-hand')
    const outline = aside.getByTestId('aside-ghost-outline')
    await expect(hat).toBeVisible()
    await expect(hand).toHaveCSS('opacity', '0')
    await expect(hat.getByTestId('aside-ghost-winter-brim')).toHaveAttribute(
      'fill',
      /-winter-white\)$/,
    )
    await expect(hat.getByTestId('aside-ghost-winter-pompom')).toHaveAttribute(
      'fill',
      /-winter-pompom\)$/,
    )
    await expect(hand.getByTestId('aside-ghost-winter-mitten')).toHaveAttribute(
      'fill',
      /-winter-red\)$/,
    )
    await expect(hand.getByTestId('aside-ghost-winter-mitten')).toHaveAttribute('d', /^M.+Q.+C.+Z$/)
    await expect(hand.getByTestId('aside-ghost-winter-cuff')).toHaveAttribute(
      'fill',
      /-winter-white\)$/,
    )
    await expect(outline).toHaveAttribute('clip-path', /-winter-outline\)$/)

    const toggle = page.getByTestId('appearance-toggle-switch')
    const closeProfile = aside.getByTestId('aside-close-profile')
    if (await closeProfile.isVisible()) await closeProfile.click()
    await toggle.click()
    await revealAside(page)
    await expect(hat).toHaveCount(0)
    await expect(hand).toHaveCount(0)
    await expect(aside.getByTestId('aside-ghost-winter-clip')).toHaveCount(0)
    await expect(aside.getByTestId('aside-ghost-winter-hand-reveal')).toHaveCount(0)
    await expect(outline).not.toHaveAttribute('clip-path')
    if (await closeProfile.isVisible()) await closeProfile.click()
    await toggle.click()
    await revealAside(page)
    await expect(hat).toBeVisible()
    await expect(hand).toBeAttached()
    await expect(outline).toHaveAttribute('clip-path', /-winter-outline\)$/)
  })

  test('tilts right and lifts the hat with a mitten emerging from behind the body', async ({
    page,
  }, testInfo) => {
    await page.goto('/')
    const ghost = (await revealAside(page)).getByTestId('aside-ghost')
    await seekWinterPose(ghost, 0)
    const rest = await winterGeometry(ghost)
    expectAlignedWinterClip(rest)
    expect(rest.eyes).toHaveLength(2)
    for (const eye of rest.eyes) expect(eye.y).toBeGreaterThan(5.3)
    await seekWinterPose(ghost, 0.76)
    const slipped = await winterGeometry(ghost)
    expect(slipped.eyes[0].y).toBeGreaterThan(5.3)
    expect(slipped.eyes[1].y).toBeGreaterThan(3.8)
    expect(slipped.eyes[1].y).toBeLessThan(5.3)
    expect(slipped.edges[1].brim.y).toBeGreaterThan(slipped.edges[0].brim.y)

    for (const progress of [0, 0.65, 0.705, 0.75, 0.78, 0.8, 0.83, 0.86, 0.89, 0.92, 0.94, 1]) {
      await seekWinterPose(ghost, progress)
      const pose = await winterGeometry(ghost)
      expectAlignedWinterClip(pose)
      if (progress <= 0.65 || progress >= 0.86) {
        for (const [index, edge] of pose.edges.entries()) {
          expect(edge.bodyLocal.x).toBeCloseTo(rest.edges[index].bodyLocal.x, 4)
          expect(edge.bodyLocal.y).toBeCloseTo(rest.edges[index].bodyLocal.y, 4)
        }
      }
      if (progress <= 0.65 || progress >= 0.94) {
        expect(pose.hand.opacity).toBe(0)
        expect(pose.hand.x).toBeCloseTo(13.6, 4)
        expect(pose.hand.y).toBeCloseTo(11, 4)
        expect(pose.hand.fingerY).toBeGreaterThan(0)
      }
      if (progress === 0.75 || progress === 0.92) {
        expect(pose.hand.opacity).toBe(1)
        expect(pose.hand.x).toBeGreaterThan(15)
        expect(pose.hand.fingerY).toBeGreaterThan(0)
      }
      if (progress >= 0.8 && progress <= 0.86) {
        expect(pose.revealX).toBe(-23)
        expect(pose.hand.opacity).toBe(1)
      } else if (progress === 0.78 || progress === 0.89) {
        expect([0, -23]).toContain(pose.revealX)
      } else {
        expect(pose.revealX).toBe(0)
      }
      if (progress >= 0.8 && progress <= 0.86) {
        expect(Math.hypot(pose.contact.x - 13.3, pose.contact.y - 4.8)).toBeLessThan(0.1)
        expect(pose.hand.fingerY).toBeLessThan(0)
      }
      if (progress === 0.78 || progress === 0.89) {
        expect(pose.hand.x).toBeCloseTo(16.7, 4)
        expect(pose.hand.y).toBeCloseTo(8.6, 4)
      }
      const box = await ghost.boundingBox()
      if (!box) throw new Error('Expected visible ghost bounds.')
      await testInfo.attach(`winter-ghost-pose-${progress}`, {
        body: await page.screenshot({
          clip: { x: box.x - 8, y: box.y - 10, width: box.width + 24, height: box.height + 20 },
        }),
        contentType: 'image/png',
      })
    }
    const trigger = ghost.locator('..')
    await trigger.click()
    await expect(trigger).toHaveAttribute('data-tickling', 'true')
    await expect(trigger).toHaveAttribute('data-tickling', 'false')
    await expect(ghost.getByTestId('aside-ghost-winter-hat')).toBeVisible()
  })

  test('starts falling on every second lower-right ascent and resets the cohort after toggling', async ({
    page,
  }) => {
    await page.goto('/')
    const aside = await revealAside(page)
    const ghost = aside.getByTestId('aside-ghost')
    await expectWinterClock(ghost)

    const closeProfile = aside.getByTestId('aside-close-profile')
    if (await closeProfile.isVisible()) await closeProfile.click()
    const toggle = page.getByTestId('appearance-toggle-switch')
    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)
    await toggle.click()
    await revealAside(page)
    await expectWinterClock(ghost)
  })

  test('keeps the hat and hand at rest with initial reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const ghost = (await revealAside(page)).getByTestId('aside-ghost')
    for (const part of ['hat', 'hand', 'clip', 'hand-reveal']) {
      await expect(ghost.getByTestId(`aside-ghost-winter-${part}`)).toHaveCSS(
        'animation-name',
        'none',
      )
      if (part !== 'hand')
        await expect(ghost.getByTestId(`aside-ghost-winter-${part}`)).toHaveCSS('transform', 'none')
    }
    const pose = await winterGeometry(ghost)
    expectAlignedWinterClip(pose)
    for (const eye of pose.eyes) expect(eye.y).toBeGreaterThan(5.3)
    expect(pose.hand.opacity).toBe(0)
    expect(pose.hand.fingerY).toBeGreaterThan(0)
    expect(pose.hand.y).toBeCloseTo(11, 4)
    expect(pose.revealX).toBe(0)
  })

  test('settles a slipped hat when reduced motion changes live', async ({ page }) => {
    await page.goto('/')
    const ghost = (await revealAside(page)).getByTestId('aside-ghost')
    await seekWinterPose(ghost, 0.8)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const part of ['hat', 'hand', 'clip', 'hand-reveal']) {
      const artwork = ghost.getByTestId(`aside-ghost-winter-${part}`)
      await expect(artwork).toHaveCSS('animation-name', 'none')
      if (part !== 'hand') await expect(artwork).toHaveCSS('transform', 'none')
    }
    const pose = await winterGeometry(ghost)
    expectAlignedWinterClip(pose)
    for (const eye of pose.eyes) expect(eye.y).toBeGreaterThan(5.3)
    expect(pose.hand.opacity).toBe(0)
    expect(pose.hand.fingerY).toBeGreaterThan(0)
    expect(pose.revealX).toBe(0)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await expectWinterClock(ghost)
    await seekWinterPose(ghost, 0)
    expect((await winterGeometry(ghost)).hand.opacity).toBe(0)
  })
})
