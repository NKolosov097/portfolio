import { expect, type Page } from '@playwright/test'

import en from '@public/locales/en.json'

/** WASM instantiation can outrun a short wait when CI runs the full parallel project matrix. */
export const DOOM_BOOT_TIMEOUT_MS = 30_000

/** Clicks Play in the Resume section and waits for the game to boot. */
export const startDoomGame = async (page: Page): Promise<void> => {
  await page.goto('/')
  const play = page.getByTestId('doom-play-button')
  await play.scrollIntoViewIfNeeded()
  await expect(play).toHaveText(en.resume.retroArcadePlay)
  await play.click()
  await expect(page.getByRole('button', { name: en.resume.retroArcadeStop })).toBeVisible({
    timeout: DOOM_BOOT_TIMEOUT_MS,
  })
}
