import { expect, test } from '@playwright/test'

import { APPEARANCE_COOKIE_KEY, EAppearance } from '@/constants/theme.constants'

/** Both appearances share one hero layout, so headings must not shift when toggling either way. */
const MAX_HEADING_DRIFT_PX = 0.5

test.describe('appearance switch', () => {
  test('defaults to the halloween appearance with no cookie set', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.halloween)
    await expect(page.getByTestId('home-halloween-art')).toBeVisible()
    await expect(page.getByTestId('home-halloween-web-start')).toHaveCount(0)
    await expect(page.getByTestId('home-halloween-web-end')).toHaveCount(0)
  })

  test('toggles to original, persists the cookie, and survives reload', async ({
    page,
    context,
  }) => {
    await page.goto('/')

    const toggle = page.getByTestId('appearance-toggle-switch')
    await toggle.click()

    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)
    await expect(page.getByTestId('home-sparkle-field')).toBeAttached()
    await expect(page.getByTestId('home-halloween-art')).toHaveCount(0)

    const cookies = await context.cookies()
    const appearanceCookie = cookies.find((cookie) => cookie.name === APPEARANCE_COOKIE_KEY)

    expect(appearanceCookie?.value).toBe(EAppearance.original)

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)
  })

  test('toggles back to halloween, restoring the art and removing the original field', async ({
    page,
  }) => {
    await page.goto('/')

    const toggle = page.getByTestId('appearance-toggle-switch')
    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)

    await toggle.click()

    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.halloween)
    await expect(page.getByTestId('home-halloween-art')).toBeVisible()
    await expect(page.getByTestId('home-sparkle-field')).toHaveCount(0)
  })

  test('is keyboard operable with both Enter and Space', async ({ page }) => {
    await page.goto('/')

    const toggle = page.getByTestId('appearance-toggle-switch')
    await toggle.focus()
    await page.keyboard.press('Enter')

    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)

    await page.keyboard.press(' ')

    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.halloween)
  })

  test('persists across route navigation', async ({ page }) => {
    await page.goto('/')

    await page.getByTestId('appearance-toggle-switch').click()
    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)

    await page.goto('/articles')
    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)
  })

  for (const width of [320, 390]) {
    test(`keeps the switch, globe and tabs apart and in bounds at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.goto('/')

      const toggle = page.getByTestId('appearance-toggle-switch')
      const globe = page.getByRole('button', { name: 'change language' })
      const tabs = page.getByRole('tablist')

      const [toggleBox, globeBox, tabsBox] = await Promise.all([
        toggle.boundingBox(),
        globe.boundingBox(),
        tabs.boundingBox(),
      ])

      if (!toggleBox || !globeBox || !tabsBox) {
        throw new Error('Expected the toggle, globe and tabs to all be laid out.')
      }

      expect(toggleBox.width).toBeGreaterThanOrEqual(44)
      expect(toggleBox.height).toBeGreaterThan(toggleBox.width)

      const track = page.getByTestId('appearance-toggle-track')
      const trackBox = await track.boundingBox()

      if (!trackBox) {
        throw new Error('Expected the switch track to be laid out.')
      }

      expect(trackBox.height).toBeGreaterThan(trackBox.width)

      // Stacked column: the globe sits above the switch, both centered on the same axis.
      expect(globeBox.y + globeBox.height).toBeLessThanOrEqual(toggleBox.y)
      expect(
        Math.abs(globeBox.x + globeBox.width / 2 - (toggleBox.x + toggleBox.width / 2)),
      ).toBeLessThanOrEqual(2)

      const toggleIntersectsTabs =
        toggleBox.x < tabsBox.x + tabsBox.width &&
        toggleBox.x + toggleBox.width > tabsBox.x &&
        toggleBox.y < tabsBox.y + tabsBox.height &&
        toggleBox.y + toggleBox.height > tabsBox.y

      const globeIntersectsTabs =
        globeBox.x < tabsBox.x + tabsBox.width &&
        globeBox.x + globeBox.width > tabsBox.x &&
        globeBox.y < tabsBox.y + tabsBox.height &&
        globeBox.y + globeBox.height > tabsBox.y

      expect(toggleIntersectsTabs).toBe(false)
      expect(globeIntersectsTabs).toBe(false)

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const innerWidth = await page.evaluate(() => window.innerWidth)

      expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
    })
  }

  for (const width of [320, 390]) {
    test(`places the mobile artwork above an unclipped headline at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.goto('/')

      const art = page.getByTestId('home-halloween-art')
      const headline = page.locator('section#home h2').first()
      const profession = page.locator('section#home h3').first()

      await expect(art).toBeVisible()
      await expect(headline).toBeVisible()
      await expect(profession).toBeVisible()
      await page.evaluate(() => document.fonts.ready)

      const [artBox, headlineBox] = await Promise.all([art.boundingBox(), headline.boundingBox()])

      if (!artBox || !headlineBox) {
        throw new Error('Expected both the artwork and the headline to be laid out.')
      }

      expect(artBox.y + artBox.height).toBeLessThanOrEqual(headlineBox.y)

      // Neither heading's content box should overflow its own element, i.e. the surname/sparkle fit.
      for (const heading of [headline, profession]) {
        const overflowsOwnBox = await heading.evaluate(
          (node) => node.scrollWidth > node.clientWidth + 1,
        )
        expect(overflowsOwnBox).toBe(false)

        const headingBox = await heading.boundingBox()
        if (!headingBox) {
          throw new Error('Expected the heading to be laid out.')
        }

        // Neither heading should spill past the viewport itself.
        expect(headingBox.x + headingBox.width).toBeLessThanOrEqual(width + 1)
      }

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(scrollWidth).toBeLessThanOrEqual(width)
    })
  }

  for (const width of [320, 390, 1440]) {
    test(`keeps the heading geometry stable across both toggle directions at ${width}px`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.setViewportSize({ width, height: 844 })
      await page.goto('/')

      const headline = page.locator('section#home h2').first()
      const profession = page.locator('section#home h3').first()
      const toggle = page.getByTestId('appearance-toggle-switch')

      await expect(headline).toBeVisible()
      await expect(profession).toBeVisible()
      await page.evaluate(() => document.fonts.ready)

      // Reads both heading boxes together so before/after comparisons reflect the same paint.
      const readGeometry = async () => {
        const [headlineBox, professionBox] = await Promise.all([
          headline.boundingBox(),
          profession.boundingBox(),
        ])

        if (!headlineBox || !professionBox) {
          throw new Error('Expected both headings to be laid out.')
        }

        return { headlineBox, professionBox }
      }

      const beforeToOriginal = await readGeometry()
      await toggle.click()
      await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)
      const afterToOriginal = await readGeometry()

      const beforeToHalloween = await readGeometry()
      await toggle.click()
      await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.halloween)
      const afterToHalloween = await readGeometry()

      for (const [before, after] of [
        [beforeToOriginal, afterToOriginal],
        [beforeToHalloween, afterToHalloween],
      ] as const) {
        for (const key of ['headlineBox', 'professionBox'] as const) {
          for (const axis of ['x', 'y', 'width', 'height'] as const) {
            expect(Math.abs(before[key][axis] - after[key][axis])).toBeLessThanOrEqual(
              MAX_HEADING_DRIFT_PX,
            )
          }
        }
      }
    })
  }

  test('stops retrying when both switch image formats fail', async ({ page }) => {
    const requests: string[] = []
    await page.route('**/switch-pumpkin.*', async (route) => {
      requests.push(route.request().url())
      await route.abort()
    })
    const fallbackFailed = page.waitForEvent('requestfailed', (request) =>
      request.url().endsWith('/switch-pumpkin.webp'),
    )
    await page.goto('/')
    await fallbackFailed
    await expect(page.getByTestId('appearance-toggle-pumpkin-body')).toHaveAttribute(
      'href',
      '/assets/img/halloween/switch-pumpkin.webp',
    )
    expect(requests.filter((url) => url.endsWith('.avif')).length).toBeLessThanOrEqual(2)
    expect(requests.filter((url) => url.endsWith('.webp'))).toHaveLength(1)
    await expect(page.getByTestId('appearance-toggle-switch')).toBeEnabled()
  })

  for (const width of [320, 1440]) {
    test(`keeps the photographic pumpkin clear of the globe in both appearances at ${width}px`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.setViewportSize({ width, height: 844 })
      await page.goto('/')
      const toggle = page.getByTestId('appearance-toggle-switch')
      const body = page.getByTestId('appearance-toggle-pumpkin-body')
      const icon = toggle.locator('svg')
      await expect(icon).toHaveCSS('overflow', 'visible')
      await expect(icon).toHaveCSS('width', '30px')
      await expect(icon).toHaveCSS('height', '30px')
      await expect(icon).toHaveCSS('margin-bottom', '-6px')
      await expect(body).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet')
      // Waits for the actual rendered source, including the compatibility fallback, to decode.
      await expect
        .poll(() =>
          body.evaluate(async (node) => {
            const image = new Image()
            image.src = node.getAttribute('href') ?? ''
            return image.decode().then(
              () => true,
              () => false,
            )
          }),
        )
        .toBe(true)
      const alpha = await body.evaluate(async (node) => {
        const image = new Image()
        image.src = node.getAttribute('href') ?? ''
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Expected a raster alpha measurement context.')
        context.drawImage(image, 0, 0)
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
        let left = canvas.width,
          top = canvas.height,
          right = 0,
          bottom = 0,
          transparent = 0
        for (let y = 0; y < canvas.height; y += 1) {
          for (let x = 0; x < canvas.width; x += 1) {
            const opacity = data[(y * canvas.width + x) * 4 + 3]
            if (opacity === 0) transparent += 1
            if (opacity > 16) {
              left = Math.min(left, x)
              top = Math.min(top, y)
              right = Math.max(right, x + 1)
              bottom = Math.max(bottom, y + 1)
            }
          }
        }
        return { width: canvas.width, height: canvas.height, left, top, right, bottom, transparent }
      })
      expect(alpha.width).toBe(128)
      expect(alpha.height).toBe(128)
      expect(alpha.transparent).toBeGreaterThan(0)
      expect(alpha.right).toBeGreaterThan(alpha.left)
      const positions = []
      for (const checked of ['true', 'false']) {
        await expect(toggle).toHaveAttribute('aria-checked', checked)
        const [imageBox, globeBox, trackBox] = await Promise.all([
          body.boundingBox(),
          page.getByRole('button', { name: 'change language' }).boundingBox(),
          page.getByTestId('appearance-toggle-track').boundingBox(),
        ])
        if (!imageBox || !globeBox || !trackBox)
          throw new Error('Expected header controls to be laid out.')
        expect(imageBox.width).toBeCloseTo(imageBox.height, 1)
        expect(imageBox.width).toBeCloseTo(30, 1)
        const visible = {
          x: imageBox.x + (alpha.left / alpha.width) * imageBox.width,
          y: imageBox.y + (alpha.top / alpha.height) * imageBox.height,
          right: imageBox.x + (alpha.right / alpha.width) * imageBox.width,
          bottom: imageBox.y + (alpha.bottom / alpha.height) * imageBox.height,
        }
        // The track is 28px wide and vertical at every width, so one bound covers both.
        expect(visible.x).toBeGreaterThanOrEqual(trackBox.x - 1)
        expect(visible.right).toBeLessThanOrEqual(trackBox.x + 28 + 1)
        // Only the halloween thumb sits at the top, where the carving overhangs the track.
        if (checked === 'true') expect(visible.y).toBeLessThan(trackBox.y)
        expect(
          visible.x < globeBox.x + globeBox.width &&
            visible.right > globeBox.x &&
            visible.y < globeBox.y + globeBox.height &&
            visible.bottom > globeBox.y,
        ).toBe(false)
        positions.push(imageBox)
        await toggle.click()
      }
      // Unchecked slides straight down the track; the thumb never moves sideways.
      expect(positions[1].y - positions[0].y).toBeCloseTo(32, 1)
      expect(positions[1].x).toBeCloseTo(positions[0].x, 1)
    })
  }
})
