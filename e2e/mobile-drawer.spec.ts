import { expect, test } from '@playwright/test'

import { clickWhenSettled } from './helpers/interaction'

import { APPEARANCE_COOKIE_KEY, EAppearance } from '@/constants/theme.constants'

test.describe('profile drawer on narrow viewports', () => {
  test('replaces the sidebar and opens and closes on demand', async ({ page }) => {
    await page.goto('/')

    const openProfileButton = page.getByTestId('header-open-profile')

    await openProfileButton.waitFor({ state: 'attached' })

    test.skip(
      !(await openProfileButton.isVisible()),
      'this viewport renders the sidebar, so there is no drawer',
    )

    await expect(page.getByTestId('aside-sidebar')).toBeHidden()
    await expect(page.getByTestId('aside-drawer')).toHaveCount(0)

    await openProfileButton.click()

    const drawer = page.getByTestId('aside-drawer')

    await expect(drawer).toBeVisible()
    await expect(drawer.getByTestId('aside-ghost')).toBeVisible()

    await clickWhenSettled(drawer.getByTestId('aside-close-profile'))

    await expect(drawer).toBeHidden()
  })

  // Exercise the real seasonal toggle while guarding the decorative layer's input pass-through.
  test('shows winter edge frost with clearance for the close control', async ({
    page,
    context,
    baseURL,
  }) => {
    if (!baseURL) throw new Error('Expected a configured base URL for appearance cookies.')
    await context.addCookies([
      { name: APPEARANCE_COOKIE_KEY, value: EAppearance.winter, url: new URL('/', baseURL).href },
    ])
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const opener = page.getByTestId('header-open-profile')
    await clickWhenSettled(opener)

    const drawer = page.getByTestId('aside-drawer')
    const frost = drawer.getByTestId('aside-frost-mobile')
    const close = drawer.getByTestId('aside-close-profile')
    await expect(frost).toBeVisible()
    await expect(drawer).toHaveCSS('border-radius', '0px')
    await expect(frost.locator('clipPath rect')).toHaveAttribute('rx', '0')
    await expect(frost).toHaveCSS('opacity', '1')
    await expect(frost).toHaveAttribute('aria-hidden', 'true')
    await expect(frost).toHaveAttribute('focusable', 'false')
    await expect(frost).toHaveCSS('pointer-events', 'none')
    await expect(frost).toHaveCSS('mask-image', /radial-gradient\(.+24px.+32px\)/)

    // Wait for the drawer entrance before checking which element receives the close-button tap.
    await expect
      .poll(() =>
        close.evaluate((button) => {
          const bounds = button.getBoundingClientRect()
          return button.contains(
            document.elementFromPoint(
              bounds.left + bounds.width / 2,
              bounds.top + bounds.height / 2,
            ),
          )
        }),
      )
      .toBe(true)

    const definitionIds = await page
      .locator('svg defs [id]')
      .evaluateAll((definitions) => definitions.map((definition) => definition.id))
    expect(definitionIds.length).toBeGreaterThan(0)
    expect(new Set(definitionIds).size).toBe(definitionIds.length)

    await clickWhenSettled(close)
    await expect(drawer).toBeHidden()
    await page.getByTestId('appearance-toggle-switch').click()
    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)
    await clickWhenSettled(opener)
    await expect(drawer).toBeVisible()
    await expect(frost).toHaveCSS('opacity', '0')
  })

  for (const width of [390, 834]) {
    // A short viewport exposes the scroll regression without changing the profile content.
    test(`keeps the close button reachable after scrolling at ${width}px`, async ({
      page,
      browserName,
    }) => {
      await page.setViewportSize({ width, height: 480 })
      await page.goto('/')

      const opener = page.getByTestId('header-open-profile')
      await clickWhenSettled(opener)

      const drawer = page.getByTestId('aside-drawer')
      const close = drawer.getByTestId('aside-close-profile')
      const ghost = drawer.getByTestId('aside-ghost-trigger')
      const home = drawer.locator('a[href="/"]')
      const avatar = drawer.getByTestId('aside-avatar-trigger')
      const scrollContent = drawer.locator('[class*="drawerScrollContent"]')
      const controls = browserName === 'webkit' ? [ghost, avatar] : [ghost, home, avatar]

      await expect(close).toHaveCount(1)
      await expect(close).toHaveAccessibleName(/^(Close profile|Закрыть профиль)$/)
      await close.focus()
      await expect(close).toBeFocused()
      for (const control of controls) {
        await page.keyboard.press('Tab')
        await expect(control).toBeFocused()
      }

      // Measure relative to the drawer so its entrance animation cannot skew the offsets.
      const closePosition = () =>
        close.evaluate((button) => {
          const bounds = button.getBoundingClientRect()
          const drawerRoot = button.parentElement
          if (!drawerRoot) throw new Error('Close button must belong to the drawer')
          const drawerBounds = drawerRoot.getBoundingClientRect()

          return {
            top: bounds.top - drawerBounds.top,
            right: drawerBounds.right - bounds.right,
            width: bounds.width,
            height: bounds.height,
            hit: button.contains(
              document.elementFromPoint(
                bounds.left + bounds.width / 2,
                bounds.top + bounds.height / 2,
              ),
            ),
          }
        })

      await expect
        .poll(closePosition)
        .toEqual({ top: 10, right: 10, width: 24, height: 24, hit: true })

      // Scroll the real overflow owner to its end rather than only dispatching a wheel event.
      const scroll = await scrollContent.evaluate((node) => {
        node.scrollTop = node.scrollHeight
        return {
          top: node.scrollTop,
          maximum: node.scrollHeight - node.clientHeight,
        }
      })
      expect(scroll.maximum).toBeGreaterThan(0)
      expect(scroll.top).toBe(scroll.maximum)
      await expect
        .poll(closePosition)
        .toEqual({ top: 10, right: 10, width: 24, height: 24, hit: true })

      for (const control of controls.slice(0, -1).reverse()) {
        await page.keyboard.press('Shift+Tab')
        await expect(control).toBeFocused()
      }
      await page.keyboard.press('Shift+Tab')
      await expect(close).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(drawer).toBeHidden()
      await expect(opener).toBeFocused()

      await page.keyboard.press('Enter')
      await expect(drawer).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(drawer).toBeHidden()
      await expect(opener).toBeFocused()
    })
  }
})
