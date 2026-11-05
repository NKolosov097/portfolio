import { expect, type Locator, type Page, test } from '@playwright/test'

import { revealAside } from './helpers/aside'

import en from '@public/locales/en.json'

import { APPEARANCE_COOKIE_KEY, EAppearance } from '@/constants/theme.constants'

/** Public pages include both independent not-found render paths. */
const ROUTES = [
  '/',
  '/articles',
  '/articles/ai-boilerplate-senior-engineers',
  '/articles/two-states-are-enough',
  '/focus-audit-missing',
  '/articles/focus-audit-missing',
] as const

/** Wait for streamed content and client-only controls before inventorying focus targets. */
async function openReadyPage(page: Page, route: string) {
  await page.goto(`${route}?lang=en`)
  await expect(page.getByTestId('appearance-toggle-switch')).toBeEnabled()
  if (route === '/') {
    await expect(page.getByTestId('contact-form')).toHaveAttribute('aria-busy', 'false')
    await expect(page.locator('#contact-message')).toBeEnabled()
    await expect(page.getByTestId('doom-play-button')).toBeVisible()
  } else if (route === '/articles') {
    await expect(page.getByTestId('article-list-item-two-states-are-enough')).toBeVisible()
  } else if (route.endsWith('missing')) {
    await expect(page.getByTestId('not-found-link')).toBeVisible()
  } else {
    await expect(page.getByTestId(`article-content-${route.split('/').at(-1)}`)).toBeVisible()
    if (route.endsWith('two-states-are-enough')) {
      await expect(page.getByTestId('combination-grid').getByRole('button').first()).toBeEnabled()
      await expect(page.getByTestId('pattern-gallery').getByRole('button').first()).toBeEnabled()
    }
  }
  await page.keyboard.press('Tab')
}

/** Inspect the painted target, including Gravity's pseudo-element rather than its button box. */
async function expectFocusRing(control: Locator, pseudo: string | null = null) {
  await control.focus()
  await expect(control).toBeFocused()
  await expect
    .poll(() =>
      control.evaluate((node, pseudoElement) => {
        const style = getComputedStyle(node, pseudoElement)
        const probe = document.createElement('span')
        probe.style.color = 'var(--g-color-line-brand)'
        node.append(probe)
        const accent = getComputedStyle(probe).color
        probe.remove()
        return [style.outlineStyle, style.outlineWidth, style.outlineColor === accent]
      }, pseudo),
    )
    .toEqual(['solid', '2px', true])
}

/** Audit offscreen controls too; focus may be drawn on an input wrapper or a tab child. */
async function expectPageFocus(page: Page) {
  await page.keyboard.press('Tab')
  const audit = await page.evaluate(async () => {
    const probe = document.createElement('span')
    probe.style.color = 'var(--g-color-line-brand)'
    document.body.append(probe)
    const accent = getComputedStyle(probe).color
    probe.remove()
    const failures: string[] = []
    let count = 0
    const controls = document.querySelectorAll<HTMLElement>(
      'a[href], button, input, textarea, select, [tabindex]',
    )
    for (const control of controls) {
      const style = getComputedStyle(control)
      if (
        control.tabIndex < 0 ||
        control.matches(':disabled') ||
        control.closest('[inert], [aria-hidden="true"]') ||
        style.visibility !== 'visible' ||
        !control.getClientRects().length
      ) {
        continue
      }
      control.focus({ preventScroll: true })
      count++
      // Component-specific underline transitions can outrank the reduced-motion wildcard.
      const readPaint = () => {
        const inputContent = control.closest('.g-text-input__content, .g-text-area__content')
        const root = control.closest('.g-switch, .g-checkbox, .g-radio') ?? control
        const targets = [root, ...root.querySelectorAll('*')]
        const hasRing = targets.some((target) =>
          [null, '::before', '::after'].some((pseudo) => {
            const paint = getComputedStyle(target, pseudo)
            return (
              paint.outlineStyle === 'solid' &&
              paint.outlineWidth === '2px' &&
              paint.outlineColor === accent
            )
          }),
        )
        const inputPaint = inputContent && getComputedStyle(inputContent)
        const hasUnderline =
          inputPaint?.borderBottomStyle === 'solid' &&
          inputPaint.borderBottomWidth === '1px' &&
          inputPaint.borderBottomColor === accent
        return {
          hasIndicator: hasRing || hasUnderline === true,
          hasFocus: document.activeElement === control,
          isFocusVisible: control.matches(':focus-visible'),
          isConnected: control.isConnected,
          activeElement: document.activeElement?.outerHTML.slice(0, 240),
          outline: getComputedStyle(control).outline,
          wrapperBorder: inputPaint?.borderBottom,
        }
      }
      const deadline = performance.now() + 1000
      let paint = readPaint()
      while (
        paint.hasFocus &&
        paint.isConnected &&
        (!paint.hasIndicator || !paint.isFocusVisible) &&
        performance.now() < deadline
      ) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        paint = readPaint()
      }
      if (!paint.hasIndicator || !paint.hasFocus || !paint.isFocusVisible || !paint.isConnected) {
        failures.push(`${control.outerHTML.slice(0, 240)} ${JSON.stringify(paint)}`)
      }
      if (
        control.matches('.g-button, .g-tab') &&
        getComputedStyle(control).outlineStyle !== 'none'
      ) {
        failures.push(`Duplicate native ring: ${control.outerHTML.slice(0, 160)}`)
      }
    }
    return { failures, count, accent }
  })
  expect(audit.count).toBeGreaterThanOrEqual(5)
  expect(audit.failures).toEqual([])
  return audit.accent
}

test.describe('consistent keyboard focus', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  for (const appearance of [EAppearance.winter, EAppearance.original]) {
    test.describe(appearance, () => {
      test.beforeEach(async ({ context, baseURL }) => {
        if (!baseURL) throw new Error('Focus tests require the configured app origin.')
        await context.addCookies([{ name: APPEARANCE_COOKIE_KEY, value: appearance, url: baseURL }])
      })

      for (const route of ROUTES) {
        test(`paints active-accent focus on ${route}`, async ({ page }) => {
          await openReadyPage(page, route)
          await expect(page.locator('html')).toHaveAttribute('data-appearance', appearance)
          const accent = await expectPageFocus(page)
          if (appearance === EAppearance.winter) expect(accent).toBe('rgb(143, 211, 255)')
          else expect(accent).not.toBe('rgb(143, 211, 255)')
          await expectFocusRing(page.getByTestId('appearance-toggle-switch'))
          await expect(page.getByTestId('appearance-toggle-switch')).toHaveCSS(
            'border-radius',
            '8px',
          )
          await expectFocusRing(page.getByRole('button', { name: 'change language' }), '::before')
          await expectFocusRing(page.locator('footer a[href^="mailto:"]'))
          await expect(page.locator('footer a[href^="mailto:"]')).toHaveCSS('border-radius', '4px')
        })
      }

      test('keeps menu, drawer and avatar dialog focus in the active accent', async ({ page }) => {
        await openReadyPage(page, '/')
        const globe = page.getByRole('button', { name: 'change language' })
        await globe.focus()
        await page.keyboard.press('Enter')
        const menu = page.locator('.g-dropdown-menu__popup-content .g-menu')
        await expect(menu).toBeVisible()
        const items = menu.locator('.g-menu__item_interactive')
        const currentLanguage = menu.locator('[aria-current="true"]')
        const previousLanguage = await currentLanguage.textContent()
        const accent = await globe.evaluate(
          (node) => getComputedStyle(node, '::before').outlineColor,
        )
        await page.keyboard.press('ArrowDown')
        const selectedItem = menu.locator('.g-menu__item_selected')
        await expect(selectedItem).toHaveCount(1)
        const firstSelection = await selectedItem.textContent()
        await page.keyboard.press('ArrowDown')
        await expect(selectedItem).not.toHaveText(firstSelection ?? '')
        await expect(globe).toBeFocused()
        await expect(selectedItem).toHaveCSS('outline-style', 'solid')
        await expect(selectedItem).toHaveCSS('outline-width', '2px')
        await expect(selectedItem).toHaveCSS('outline-color', accent)
        await expect(selectedItem).toHaveCSS('outline-offset', '-2px')
        await expect(currentLanguage).toHaveText(previousLanguage ?? '')
        const chosenLanguage = await selectedItem.textContent()
        expect(chosenLanguage).not.toBe(previousLanguage)
        await page.keyboard.press('Enter')
        await expect(menu).toBeHidden()
        await expect(globe).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(menu).toBeVisible()
        await expect(currentLanguage).toHaveText(chosenLanguage ?? '')
        await items.first().focus()
        await page.keyboard.press('Tab')
        await expect(items.nth(1)).toBeFocused()
        await expectFocusRing(items.nth(1))
        await page.keyboard.press('Escape')
        await expect(globe).toBeFocused()

        // Restore English so the remaining accessible-name checks stay independent of selection.
        await page.keyboard.press('Enter')
        await menu.getByText('English', { exact: true }).click()
        await page.keyboard.press('Tab')

        const profileButton = page.getByTestId('header-open-profile')
        if (await profileButton.isVisible()) await expectFocusRing(profileButton, '::before')
        const aside = await revealAside(page)
        await page.keyboard.press('Tab')
        const home = aside.getByRole('link', { name: 'Back to home', exact: true })
        await expectFocusRing(home)
        await expect(home).toHaveCSS('border-radius', '4px')
        const drawerClose = aside.getByTestId('aside-close-profile')
        if (await drawerClose.isVisible()) await expectFocusRing(drawerClose, '::before')
        const avatar = aside.getByTestId('aside-avatar-trigger')
        await avatar.focus()
        await page.keyboard.press('Enter')
        const close = page.getByTestId('aside-avatar-lightbox-close')
        await expect(close).toBeVisible()
        await expect(page.getByRole('dialog').filter({ has: close })).toBeFocused()
        await page.keyboard.press('Tab')
        await expectFocusRing(close, '::before')
        await page.keyboard.press('Escape')
        await expect(aside.getByTestId('aside-avatar-trigger')).toBeFocused()
      })

      test('keeps attachment controls and preview dialog focus in the active accent', async ({
        page,
      }) => {
        await openReadyPage(page, '/')
        await page.locator('#contact-attachments').setInputFiles({
          name: 'focus.png',
          mimeType: 'image/png',
          buffer: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4mQAAAAASUVORK5CYII=',
            'base64',
          ),
        })
        const preview = page.getByRole('button', {
          name: en.contact.previewAttachment.replace('{{name}}', 'focus.png'),
        })
        await expectFocusRing(preview)
        await expectFocusRing(
          page.getByRole('button', {
            name: en.contact.removeAttachment.replace('{{name}}', 'focus.png'),
          }),
        )
        await preview.focus()
        await page.keyboard.press('Enter')
        const close = page.getByRole('button', { name: en.contact.closeAttachmentPreview })
        await expect(close).toBeVisible()
        await expectFocusRing(close, '::before')
        await page.keyboard.press('Escape')
        await expect(preview).toBeFocused()
      })
    })
  }

  test('updates focused indicators immediately across winter-original-winter', async ({ page }) => {
    await openReadyPage(page, '/')
    const toggle = page.getByTestId('appearance-toggle-switch')
    await expectFocusRing(toggle)
    for (const appearance of [EAppearance.original, EAppearance.winter]) {
      await page.keyboard.press('Space')
      await expect(page.locator('html')).toHaveAttribute('data-appearance', appearance)
      await expectFocusRing(toggle)
      await expectFocusRing(page.getByRole('button', { name: 'change language' }), '::before')
      await toggle.focus()
    }
  })
})
