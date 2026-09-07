import { expect, type Locator, type Page } from '@playwright/test'

import { clickWhenSettled } from './interaction'

import { ELanguage, languages } from '@/constants/header.constants'

/** Gravity UI portals the language menu out of the header; this is its stable DOM anchor. */
const LANGUAGE_MENU_SELECTOR = '.g-dropdown-menu__popup-content .g-menu'

/** Shipped menu labels keyed by language, so no spec has to spell a localized title out. */
const TITLE_BY_LANGUAGE = new Map(languages.map(({ value, title }) => [value, title]))

/** Opens the header's language menu and resolves once it is rendered. */
export const openLanguageMenu = async (page: Page): Promise<Locator> => {
  await page.getByRole('button', { name: 'change language' }).click()

  const menu = page.locator(LANGUAGE_MENU_SELECTOR)

  await expect(menu).toBeVisible()

  return menu
}

/**
 * Picks a language from the header menu. The popup slides down from the switcher inside the fixed
 * header, so a click fired mid-animation lands on the header instead of the entry.
 */
export const selectLanguage = async (page: Page, language: ELanguage): Promise<void> => {
  const title = TITLE_BY_LANGUAGE.get(language)

  if (!title) {
    throw new Error(`No language menu entry is shipped for "${language}".`)
  }

  const menu = await openLanguageMenu(page)

  await clickWhenSettled(menu.getByText(title, { exact: true }))
}
