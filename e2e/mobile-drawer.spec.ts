import { expect, test } from '@playwright/test'

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

    await drawer.getByTestId('aside-close-profile').click()

    await expect(drawer).toBeHidden()
  })
})
