import { type Locator, type Page } from '@playwright/test'

export const revealAside = async (page: Page): Promise<Locator> => {
  const openProfileButton = page.getByTestId('header-open-profile')

  await openProfileButton.waitFor({ state: 'attached' })

  if (await openProfileButton.isVisible()) {
    await openProfileButton.click()

    return page.getByTestId('aside-drawer')
  }

  return page.getByTestId('aside-sidebar')
}
