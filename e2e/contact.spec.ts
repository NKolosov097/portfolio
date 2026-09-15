import { expect, test } from '@playwright/test'

import en from '@public/locales/en.json'
import ru from '@public/locales/ru.json'

import { LANG_COOKIE_KEY } from '@/helpers/language'

import { clickWhenSettled } from './helpers/interaction'
import { E2E_BASE_URL } from './helpers/server'

test.describe('contact form', () => {
  test('exposes the section through keyboard navigation and its direct anchor', async ({
    page,
  }) => {
    await page.goto('/?lang=en#contact')

    const section = page.locator('section#contact')
    await expect(section).toBeVisible()
    await expect(section).toBeInViewport()
    const tab = page.getByRole('tab', { name: en.headerTabs.contact, exact: true })
    await tab.focus()
    await page.keyboard.press('Enter')
    await expect(section).toBeInViewport()
  })

  test('keeps an invalid draft and focuses its first invalid field', async ({ page }) => {
    await page.goto('/?lang=en#contact')

    await page.locator('#contact-message').fill('Please keep my draft')
    await page.getByRole('button', { name: en.contact.sendMessage, exact: true }).click()

    await expect(page.locator('#contact-name')).toBeFocused()
    await expect(page.locator('#contact-message')).toHaveValue('Please keep my draft')
    await expect(page.locator('#contact-name')).toHaveAttribute('aria-invalid', 'true')
  })

  // Guards the attachment control's visual alignment with the message input.
  test('centers the attachment button vertically in the message input', async ({ page }) => {
    await page.goto('/?lang=en#contact')

    const textarea = page.locator('#contact-message')
    const attachmentButton = page.locator(`button[aria-label="${en.contact.attachFiles}"]`)
    await expect(textarea).toBeVisible()
    await expect(attachmentButton).toBeVisible()
    const textareaBounds = await textarea.boundingBox()
    const buttonBounds = await attachmentButton.boundingBox()
    expect(textareaBounds).not.toBeNull()
    expect(buttonBounds).not.toBeNull()

    const textareaCenter = textareaBounds!.y + textareaBounds!.height / 2
    const buttonCenter = buttonBounds!.y + buttonBounds!.height / 2
    expect(Math.abs(buttonCenter - textareaCenter)).toBeLessThanOrEqual(0.5)
  })

  // Guards the single hold followed by an uninterrupted horizontal departure.
  test('holds the sending plane once, then flies steadily to the right', async ({ page }) => {
    await page.goto('/?lang=en#contact')
    await page.locator('#contact-name').fill('Animation Test')
    await page.locator('#contact-email').fill('animation@example.test')
    await page.locator('#contact-message').fill('Keep this request pending')

    // Holds the real Server Action request so the pending indicator remains mounted.
    await page.route('**/*', (route) => {
      if (route.request().method() === 'POST' && route.request().headers()['next-action']) return

      return route.continue()
    })
    await page.getByRole('button', { name: en.contact.sendMessage, exact: true }).click()
    const plane = page.getByTestId('contact-sending-indicator').locator('span')
    await expect(plane).toBeVisible()

    // Samples the browser's real CSS animation at equal time intervals after its initial hold.
    const samples = await plane.evaluate((element) => {
      const movement = element
        .getAnimations()
        .find(
          (animation) =>
            animation.effect instanceof KeyframeEffect && animation.effect.pseudoElement === null,
        )
      if (movement === undefined) throw new Error('Expected the plane movement animation')

      movement.pause()
      const duration = Number(movement.effect?.getTiming().duration)
      if (!Number.isFinite(duration)) throw new Error('Expected a finite animation duration')

      const positions: Array<{ x: number; y: number }> = []
      for (const offset of [0.05, 0.12, 0.34, 0.56, 0.78]) {
        movement.currentTime = duration * offset
        const bounds = element.getBoundingClientRect()
        positions.push({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 })
      }

      return positions
    })
    const [earlyHold, departure, ...flight] = samples
    expect(Math.abs(departure.x - earlyHold.x)).toBeLessThan(1)

    const flightSamples = [departure, ...flight]
    const distances = flightSamples.slice(1).map(({ x }, index) => x - flightSamples[index].x)
    expect(Math.min(...distances)).toBeGreaterThan(0)
    expect(Math.max(...distances) - Math.min(...distances)).toBeLessThan(2)
    const flightY = flightSamples.map(({ y }) => y)
    expect(Math.max(...flightY) - Math.min(...flightY)).toBeLessThan(1)
  })

  // Guards the pending announcement without restoring visible status text.
  test('announces the pending state without showing its text', async ({ page }) => {
    await page.goto('/?lang=en#contact')
    await page.locator('#contact-name').fill('Accessibility Test')
    await page.locator('#contact-email').fill('accessibility@example.test')
    await page.locator('#contact-message').fill('Keep this request pending')

    // Holds the real Server Action request so the pending status remains mounted.
    await page.route('**/*', (route) => {
      if (route.request().method() === 'POST' && route.request().headers()['next-action']) return

      return route.continue()
    })
    await page.getByRole('button', { name: en.contact.sendMessage, exact: true }).click()

    const pendingStatus = page.getByRole('status')
    await expect(pendingStatus).toHaveText(en.contact.sending)
    const bounds = await pendingStatus.boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.width).toBeLessThanOrEqual(1)
    expect(bounds!.height).toBeLessThanOrEqual(1)
  })

  test.describe('desktop attachment hint', () => {
    // Mirrors the CSS conditions that switch the inline hint to the desktop tooltip.
    test.skip(
      ({ viewport, hasTouch }) => (viewport?.width ?? 0) <= 900 || hasTouch,
      'Desktop-only tooltip',
    )
    test('shows attachment limits in the paperclip tooltip', async ({ page }) => {
      await page.goto('/?lang=en#contact')
      const attach = page.locator(`button[aria-label="${en.contact.attachFiles}"]`)

      await expect(page.locator('#contact-attachments-hint')).toBeHidden()
      await expect(attach).toBeEnabled()
      await attach.hover()
      await expect(
        page.getByRole('tooltip').getByText('Up to 3 PDF, JPG or PNG files.', { exact: true }),
      ).toBeVisible()
      await expect(
        page.getByRole('tooltip').getByText('5 MB each, 10 MB total.', { exact: true }),
      ).toBeVisible()
      await page.mouse.move(0, 0)
      await expect(page.getByRole('tooltip')).toBeHidden()
      await attach.focus()
      await expect(
        page.getByRole('tooltip').getByText('Up to 3 PDF, JPG or PNG files.', { exact: true }),
      ).toBeVisible()
      await expect(
        page.getByRole('tooltip').getByText('5 MB each, 10 MB total.', { exact: true }),
      ).toBeVisible()
    })
  })

  test('selects and removes multiple files and rejects a fourth before upload', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 })
    await page.goto('/?lang=en#contact')
    const input = page.locator('#contact-attachments')
    await expect(input).toBeEnabled()
    await expect(input).toHaveAttribute('multiple', '')
    await expect(input).toHaveAttribute('accept', 'application/pdf,image/jpeg,image/png')
    await expect(page.locator('#contact-attachments-hint')).toBeVisible()
    const fileChooser = page.waitForEvent('filechooser')
    await page.locator(`button[aria-label="${en.contact.attachFiles}"]`).click()
    await fileChooser

    await input.setInputFiles({
      name: 'brief.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-test'),
    })
    await input.setInputFiles({
      name: 'screen.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    })
    const pdfPreview = page.getByRole('button', {
      name: en.contact.previewAttachment.replace('{{name}}', 'brief.pdf'),
    })
    await expect(pdfPreview).toBeVisible()
    await expect(page.getByRole('img', { name: 'screen.png' })).toBeVisible()
    const listBox = await page.locator('ul').filter({ has: pdfPreview }).boundingBox()
    const removePdf = page.getByRole('button', {
      name: en.contact.removeAttachment.replace('{{name}}', 'brief.pdf'),
    })
    const removeBox = await removePdf.boundingBox()
    expect(listBox).not.toBeNull()
    expect(removeBox).not.toBeNull()
    expect(removeBox!.y).toBeGreaterThanOrEqual(listBox!.y)
    await page.locator(`button[aria-label="${en.contact.attachFiles}"]`).focus()
    await page.keyboard.press('Tab')
    await expect(pdfPreview).toBeFocused()
    await pdfPreview.click()
    await expect(page.locator('iframe[title="Preview brief.pdf"]')).toBeVisible()
    const closePreview = page.getByRole('button', { name: en.contact.closeAttachmentPreview })
    await closePreview.focus()
    const closeBox = await closePreview.boundingBox()
    expect(closeBox?.width).toBeCloseTo(closeBox?.height ?? 0, 2)
    await expect
      .poll(() =>
        closePreview.evaluate((element) => getComputedStyle(element, '::before').borderRadius),
      )
      .toBe('50%')
    await closePreview.click()
    await removePdf.click()
    await expect(pdfPreview).toBeHidden()
    await page
      .getByRole('button', { name: en.contact.removeAttachment.replace('{{name}}', 'screen.png') })
      .click()

    let uploadRequests = 0
    page.on('request', (request) => {
      if (request.url().includes('/api/contact-uploads')) uploadRequests += 1
    })
    await input.setInputFiles(
      Array.from({ length: 4 }, (_, index) => ({
        name: `${index}.pdf`,
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-test'),
      })),
    )
    await expect(page.locator('button[aria-label^="Preview "]')).toHaveCount(4)
    await expect(page.locator('#contact-attachment-error')).toHaveText(en.contact.tooManyFiles)
    expect(uploadRequests).toBe(0)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
  })

  test('keeps the attachment remove focus ring inside its scroll container', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 })
    await page.goto('/?lang=en#contact')
    const input = page.locator('#contact-attachments')

    await expect(input).toBeEnabled()
    await input.setInputFiles({
      name: 'brief.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-test'),
    })
    const remove = page.getByRole('button', {
      name: en.contact.removeAttachment.replace('{{name}}', 'brief.pdf'),
    })
    const list = page.locator('ul').filter({ has: remove })

    await remove.focus()
    const [listBox, removeBox, ringWidth] = await Promise.all([
      list.boundingBox(),
      remove.boundingBox(),
      remove.evaluate((element) => {
        const style = getComputedStyle(element)

        return Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset)
      }),
    ])

    expect(listBox).not.toBeNull()
    expect(removeBox).not.toBeNull()
    expect(removeBox!.y - ringWidth).toBeGreaterThanOrEqual(listBox!.y)
  })

  test('returns from an article to Contact and selects its header tab', async ({ page }) => {
    await page.goto('/')
    const articleCard = page.getByTestId('writing-article-ai-boilerplate-senior-engineers')
    await expect(articleCard).toBeVisible()
    await articleCard.scrollIntoViewIfNeeded()
    await clickWhenSettled(articleCard)
    await expect(page).toHaveURL(/\/articles\/ai-boilerplate-senior-engineers$/)
    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    const contactTab = page.getByRole('tab', { name: en.headerTabs.contact, exact: true })
    await contactTab.click()
    await expect(page.locator('section#contact')).toBeInViewport()
    await expect(contactTab).toHaveAttribute('aria-selected', 'true')
  })

  test('keeps Russian controls reachable across responsive boundaries', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.context().addCookies([{ name: LANG_COOKIE_KEY, value: 'ru', url: E2E_BASE_URL }])
    await page.goto('/#contact')

    for (const width of [320, 393, 499, 500, 501, 768, 899, 900, 901, 1023, 1024, 1025, 1440]) {
      await page.setViewportSize({ width, height: 740 })
      const submit = page.getByRole('button', { name: ru.contact.sendMessage, exact: true })
      await submit.scrollIntoViewIfNeeded()
      await expect(submit).toBeInViewport()
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true)
      if (testInfo.project.name === 'chromium' && [320, 1440].includes(width)) {
        await page.locator('section#contact').screenshot({
          path: testInfo.outputPath(`contact-${width}.png`),
        })
      }
    }
  })

  test('keeps the draft and retranslates validation when the locale changes', async ({ page }) => {
    await page.goto('/?lang=en#contact')
    await page.locator('#contact-message').fill('Keep this draft when switching languages')
    await page.getByRole('button', { name: en.contact.sendMessage, exact: true }).click()
    await expect(page.locator('#contact-name-error')).toHaveText(en.contact.requireName)
    await page.getByRole('button', { name: 'change language' }).click()
    const russianOption = page
      .locator('.g-dropdown-menu__popup-content .g-menu')
      .getByText('Русский', { exact: true })
    await expect(russianOption).toBeVisible()
    await russianOption.evaluate((element) => {
      if (!(element instanceof HTMLElement)) throw new Error('Expected a language menu item')
      element.click()
    })
    await expect(page.locator('#contact-name-error')).toHaveText(ru.contact.requireName)
    await expect(page.locator('#contact-message')).toHaveValue(
      'Keep this draft when switching languages',
    )
  })
})
