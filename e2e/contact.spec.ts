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
