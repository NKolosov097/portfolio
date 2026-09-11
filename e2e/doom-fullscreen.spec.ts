import { expect, test, type Page } from '@playwright/test'

import en from '@public/locales/en.json'

const startGame = async (page: Page) => {
  await page.goto('/')
  const play = page.getByTestId('doom-play-button')
  await play.scrollIntoViewIfNeeded()
  await expect(play).toHaveText(en.resume.retroArcadePlay)
  await play.click()
  await expect(page.getByRole('button', { name: en.resume.retroArcadeStop })).toBeVisible({
    timeout: 15_000,
  })
}

const expectViewportScreen = async (page: Page) => {
  await expect
    .poll(() =>
      page.getByTestId('doom-screen').evaluate((screen) => {
        const rect = screen.getBoundingClientRect()
        return Math.max(
          Math.abs(rect.x),
          Math.abs(rect.y),
          Math.abs(rect.width - window.innerWidth),
          Math.abs(rect.height - window.innerHeight),
        )
      }),
    )
    .toBeLessThanOrEqual(1)
}

const expectExitControlOnTop = async (page: Page) => {
  const exit = page.getByRole('button', { name: en.resume.retroArcadeExitFullscreen, exact: true })
  expect(
    await exit.evaluate((button) => {
      // Inert elements are skipped by hit testing even when they visually cover the HUD.
      // Temporarily restore hit testing to check the actual stacking order.
      const background = Array.from(document.querySelectorAll<HTMLElement>('[inert]'))
      background.forEach((element) => {
        element.inert = false
      })
      try {
        const rect = button.getBoundingClientRect()
        return [rect.x + 4, rect.x + rect.width / 2, rect.right - 4].every((x) =>
          button.contains(document.elementFromPoint(x, rect.y + rect.height / 2)),
        )
      } finally {
        background.forEach((element) => {
          element.inert = true
        })
      }
    }),
  ).toBe(true)
}

for (const capability of ['missing', 'rejected'] as const) {
  test(`expands without restarting the game when fullscreen is ${capability}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript((mode) => {
      Object.defineProperty(Element.prototype, 'requestFullscreen', {
        configurable: true,
        value:
          mode === 'missing'
            ? undefined
            : () => Promise.reject(new TypeError('Fullscreen is unavailable')),
      })
    }, capability)
    await page.setViewportSize({ width: 393, height: 851 })
    await startGame(page)

    const screen = page.getByTestId('doom-screen')
    const canvas = page.getByTestId('doom-canvas')
    const originalCanvas = await canvas.elementHandle()
    const expand = page.getByRole('button', { name: en.resume.retroArcadeFullscreen, exact: true })
    await expect(expand).toBeVisible()
    const scrollY = await page.evaluate(() => window.scrollY)
    await expand.click()
    await expectViewportScreen(page)
    await expect(screen).toHaveAttribute('role', 'dialog')
    await expect(screen).toHaveAttribute('aria-modal', 'true')
    await expect(screen).toHaveAccessibleName(en.resume.retroArcadeHeader)
    await expect(
      page.getByRole('button', { name: en.resume.retroArcadeExitFullscreen, exact: true }),
    ).toBeVisible()
    await expect(canvas).toBeFocused()
    await expectExitControlOnTop(page)
    if (capability === 'missing') {
      await page.screenshot({ path: test.info().outputPath('portrait.png') })
    }

    await page.setViewportSize({ width: 851, height: 393 })
    await expectViewportScreen(page)
    await expect(canvas).toHaveCSS('object-fit', 'contain')
    await expectExitControlOnTop(page)
    if (capability === 'missing') {
      await page.screenshot({ path: test.info().outputPath('landscape.png') })
    }
    const touchControls = page.getByTestId('doom-touch-controls')
    if (await touchControls.isVisible()) {
      await expect(page.getByRole('button', { name: en.resume.retroArcadeUse })).toBeInViewport()
      await page.getByRole('button', { name: en.resume.retroArcadeUse }).tap()
    }

    await page.setViewportSize({ width: 393, height: 851 })
    await page
      .getByRole('button', { name: en.resume.retroArcadeExitFullscreen, exact: true })
      .click()
    await expect(expand).toBeFocused()
    await expect(screen).not.toHaveAttribute('aria-modal')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scrollY, 0)
    expect(await originalCanvas?.evaluate((element) => element.isConnected)).toBe(true)
    await expect(page.getByTestId('doom-play-button')).toHaveCount(0)

    await expand.click()
    await page.getByRole('button', { name: en.resume.retroArcadeStop }).click()
    await expect(page.getByTestId('doom-play-button')).toBeFocused()
    await expect(screen).not.toHaveAttribute('aria-modal')
    expect(await page.evaluate(() => document.body.style.position)).not.toBe('fixed')
    expect(errors).toEqual([])
  })
}

test('keeps keyboard focus in the expanded game and restores it on Escape', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Element.prototype, 'requestFullscreen', { value: undefined })
  })
  await startGame(page)
  const canvas = page.getByTestId('doom-canvas')
  const stop = page.getByRole('button', { name: en.resume.retroArcadeStop })
  const expand = page.getByRole('button', { name: en.resume.retroArcadeFullscreen, exact: true })
  await canvas.focus()
  await page.keyboard.press('Tab')
  await expect(stop).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(expand).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(canvas).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  const lastControl = page.getByTestId('doom-screen').getByRole('button').last()
  await expect(lastControl).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(canvas).toBeFocused()
  // The background is unavailable to keyboard users and assistive technology.
  const backgroundButton = page.locator('header button:visible').last()
  await backgroundButton.evaluate((button: HTMLButtonElement) => button.focus())
  await expect(canvas).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(expand).toBeFocused()
  await expect(page.getByTestId('doom-screen')).not.toHaveAttribute('aria-modal')
  await backgroundButton.evaluate((button: HTMLButtonElement) => button.focus())
  await expect(backgroundButton).toBeFocused()
})

test('uses native fullscreen when available and follows a browser exit', async ({ page }) => {
  await startGame(page)
  test.skip(
    !(await page.evaluate(() => Boolean(document.fullscreenEnabled))),
    'This browser does not provide native fullscreen',
  )
  await page.getByRole('button', { name: en.resume.retroArcadeFullscreen, exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement?.getAttribute('data-testid')))
    .toBe('doom-screen')
  await page.evaluate(() => document.exitFullscreen())
  await expect(
    page.getByRole('button', { name: en.resume.retroArcadeFullscreen, exact: true }),
  ).toBeFocused()
  await expect(page.getByTestId('doom-screen')).not.toHaveAttribute('aria-modal')
})
