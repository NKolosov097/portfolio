import { expect, test } from '@playwright/test'

import en from '@public/locales/en.json'

import { startDoomGame } from './helpers/doom'

test.describe('DOOM easter egg in the Resume section', () => {
  test('boots the game on click and can be stopped again', async ({ page }) => {
    test.setTimeout(60_000)
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await startDoomGame(page)

    await expect(page.getByTestId('doom-canvas')).toBeVisible()
    await expect(page.getByTestId('doom-play-button')).not.toBeVisible()

    const stopButton = page.getByRole('button', { name: en.resume.retroArcadeStop })
    await stopButton.click()
    await expect(page.getByTestId('doom-play-button')).toBeVisible()

    expect(pageErrors).toEqual([])
  })
})
