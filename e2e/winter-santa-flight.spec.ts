import { expect, test } from '@playwright/test'

test.describe('winter Santa flight', () => {
  test('previews the actual model and route in one decorative canvas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/santa-preview')
    const host = page.getByTestId('santa-flight')
    await expect(host).toHaveAttribute('data-status', 'ready', { timeout: 30_000 })
    await expect(host).toHaveAttribute('data-backend', 'worker')
    await expect(host).toHaveAttribute('data-phase', 'model')
    const original = await host.locator('canvas').elementHandle()
    await expect(host).toHaveAttribute('aria-hidden', 'true')
    await expect(host).toHaveCSS('pointer-events', 'none')
    await page.getByRole('button', { name: 'Distant', exact: true }).click()
    await expect(host).toHaveAttribute('data-phase', 'distant')
    expect(await host.evaluate((node) => node.parentElement === document.body)).toBe(true)
    await expect(host).toHaveCSS('position', 'fixed')
    const viewport = await page.evaluate(() => ({
      // A stable scrollbar gutter can remain included in clientWidth; use the rendered root width.
      width: document.documentElement.getBoundingClientRect().width,
      height: innerHeight,
    }))
    await expect(host.locator('canvas')).toHaveCSS('width', `${viewport.width}px`)
    await expect(host.locator('canvas')).toHaveCSS('height', `${viewport.height}px`)
    const flightBounds = await host.boundingBox()
    expect(flightBounds).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height })
    expect(await host.locator('canvas').boundingBox()).toEqual(flightBounds)
    await page.getByRole('button', { name: 'Near', exact: true }).click()
    await expect(host).toHaveAttribute('data-phase', 'near')
    expect(await host.boundingBox()).toEqual(flightBounds)
    expect(
      await host.locator('canvas').evaluate((canvas, previous) => canvas === previous, original),
    ).toBe(true)
    await expect(page.getByRole('heading', { name: 'I’m Nikita Kolosov' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath('near.png') })
    await page.getByRole('button', { name: 'Model', exact: true }).click()
    await expect(host).toHaveAttribute('data-phase', 'model')
    expect(await host.evaluate((node) => node.parentElement === document.body)).toBe(false)
    expect(
      await host.locator('canvas').evaluate((canvas, previous) => canvas === previous, original),
    ).toBe(true)
    await expect(page.getByRole('button', { name: 'Model', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.screenshot({ path: test.info().outputPath('model.png') })
    await page.getByRole('button', { name: 'Live', exact: true }).click()
    await expect(host).toHaveAttribute('data-running', 'true')
    expect(await host.boundingBox()).toEqual(flightBounds)
    expect(errors).toEqual([])
  })

  test('never loads WebGL for reduced motion or original appearance', async ({
    page,
    context,
    baseURL,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const rendererPayloads: Promise<string>[] = []
    const modelRequests: string[] = []
    const workers: string[] = []
    page.on('worker', (worker) => workers.push(worker.url()))
    page.on('request', (request) => {
      if (/natural-(deer|santa).*\.glb/i.test(request.url())) modelRequests.push(request.url())
    })
    page.on('response', (response) => {
      if (/santaRenderer|santaModel|three.*\.js/i.test(response.url())) {
        rendererPayloads.push(response.text().catch(() => ''))
      }
    })
    await page.goto('/santa-preview')
    await expect(page.getByRole('button', { name: 'Model', exact: true })).toBeVisible()
    await page.waitForTimeout(800)
    await expect(page.getByTestId('santa-flight').locator('canvas')).toHaveCount(0)
    // Turbopack's eager async-loader metadata contains no renderer or Three implementation.
    const payloads = await Promise.all(rendererPayloads)
    expect(payloads.filter((source) => !source.includes('(ecmascript, async loader)'))).toEqual([])
    if (!baseURL) throw new Error('Expected an application origin.')
    await context.addCookies([{ name: 'portfolio-appearance', value: 'original', url: baseURL }])
    await page.goto('/')
    await expect(page.getByTestId('santa-flight')).toHaveCount(0)
    expect(modelRequests).toEqual([])
    expect(workers).toEqual([])
  })

  test('puts the body portal above the heading and below usable shell controls, then cleans up', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    const host = page.getByTestId('santa-flight')
    await expect(host).toHaveAttribute('data-status', 'ready', { timeout: 30_000 })
    expect(await host.evaluate((node) => node.parentElement === document.body)).toBe(true)
    await expect(host).toHaveCSS('position', 'fixed')
    await expect(host).toHaveCSS('z-index', '0')
    await expect(page.getByTestId('appearance-toggle-switch')).toBeEnabled()
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
    await expect(host).toHaveCSS('visibility', 'hidden')
    await expect(host).toHaveAttribute('data-running', 'false')
    await page.evaluate(() => scrollTo(0, 0))
    await expect(host).toHaveCSS('visibility', 'visible')
    await page.getByTestId('appearance-toggle-switch').click()
    await expect(host).toHaveCount(0)
  })
  test('uses the same model and canvas when worker rendering is unsupported', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen', {
        value: undefined,
        configurable: true,
      })
    })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const errors: string[] = []
    const workers: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('worker', (worker) => workers.push(worker.url()))
    await page.goto('/santa-preview')
    const host = page.getByTestId('santa-flight')
    await expect(host).toHaveAttribute('data-status', 'ready', { timeout: 30_000 })
    await expect(host).toHaveAttribute('data-backend', 'main')
    await expect(host).toHaveAttribute('data-phase', 'model')
    const canvas = await host.locator('canvas').elementHandle()
    await page.getByRole('button', { name: 'Near', exact: true }).click()
    await expect(host).toHaveAttribute('data-phase', 'near')
    await expect(host.locator('canvas')).toHaveCount(1)
    expect(
      await host.locator('canvas').evaluate((node, original) => node === original, canvas),
    ).toBe(true)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(host.locator('canvas')).toHaveCount(0)
    expect(workers).toEqual([])
    expect(errors).toEqual([])
  })
})
