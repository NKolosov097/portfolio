import { type Locator, type Page } from '@playwright/test'

import { waitUntilSettled } from './interaction'

/** Reveals the responsive aside and returns it after any opening motion has settled. */
export const revealAside = async (page: Page): Promise<Locator> => {
  const openProfileButton = page.getByTestId('header-open-profile')

  await openProfileButton.waitFor({ state: 'attached' })

  if (await openProfileButton.isVisible()) {
    await openProfileButton.click()

    const drawer = page.getByTestId('aside-drawer')
    await waitUntilSettled(drawer)

    return drawer
  }

  return page.getByTestId('aside-sidebar')
}
