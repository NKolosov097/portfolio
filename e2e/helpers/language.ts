import { expect, type Locator, type Page } from '@playwright/test'

/** Gravity UI portals the language menu out of the header; this is its stable DOM anchor. */
const LANGUAGE_MENU_SELECTOR = '.g-dropdown-menu__popup-content .g-menu'

/** Opens the header's language menu and resolves once it is rendered. */
export const openLanguageMenu = async (page: Page): Promise<Locator> => {
  await page.getByRole('button', { name: 'change language' }).click()

  const menu = page.locator(LANGUAGE_MENU_SELECTOR)

  await expect(menu).toBeVisible()

  return menu
}

/** Resolves to `true` once the entry has stopped sliding and owns the point a click would land on. */
const isEntryClickable = (entry: Locator): Promise<boolean> =>
  entry.evaluate(async (node) => {
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    const { top: previousTop } = node.getBoundingClientRect()

    await nextFrame()

    const { top, left, width, height } = node.getBoundingClientRect()

    if (top !== previousTop) return false

    return node.contains(document.elementFromPoint(left + width / 2, top + height / 2))
  })

/**
 * Picks a language from the header menu. The popup slides down from the switcher inside the fixed
 * header, so a click fired mid-animation lands on the header instead of the entry.
 */
export const selectLanguage = async (page: Page, title: string): Promise<void> => {
  const menu = await openLanguageMenu(page)
  const entry = menu.getByText(title, { exact: true })

  await expect(entry).toBeVisible()
  await expect.poll(() => isEntryClickable(entry)).toBe(true)

  await entry.click()
}
