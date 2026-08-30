import { expect, test } from '@playwright/test'

import en from '@public/locales/en.json'

test.describe('DOOM easter egg in the Resume section', () => {
  test('boots the game on click and can be stopped again', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.goto('/')

    const playButton = page.getByTestId('doom-play-button')
    await playButton.scrollIntoViewIfNeeded()
    await expect(playButton).toHaveText(en.resume.retroArcadePlay)

    await playButton.click()

    const canvas = page.getByTestId('doom-canvas')
    await expect(canvas).toBeVisible()
    await expect(playButton).not.toBeVisible()

    const stopButton = page.getByRole('button', { name: en.resume.retroArcadeStop })
    await expect(stopButton).toBeVisible({ timeout: 15_000 })

    await stopButton.click()
    await expect(page.getByTestId('doom-play-button')).toBeVisible()

    expect(pageErrors).toEqual([])
  })
})
