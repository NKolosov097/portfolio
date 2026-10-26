import { expect, type Page } from '@playwright/test'

import en from '@public/locales/en.json'

/** WASM instantiation can outrun a short wait when CI runs the full parallel project matrix. */
export const DOOM_BOOT_TIMEOUT_MS = 30_000

/**
 * Clicks Play in the Resume section and waits for the game to boot.
 *
 * The boot is raced against the machine's own error state. Waiting on the Stop button alone
 * reports `element(s) not found` whether the engine failed or was merely slow, which is the same
 * message for two very different problems; the race names which one happened.
 */
export const startDoomGame = async (page: Page): Promise<void> => {
  await page.goto('/')
  const play = page.getByTestId('doom-play-button')
  await play.scrollIntoViewIfNeeded()
  await expect(play).toHaveText(en.resume.retroArcadePlay)
  await play.click()

  const stop = page.getByRole('button', { name: en.resume.retroArcadeStop })
  const bootError = page.getByText(en.resume.retroArcadeError, { exact: true })

  await expect
    .poll(
      async () => {
        if (await bootError.isVisible()) return 'error'

        return (await stop.isVisible()) ? 'playing' : 'booting'
      },
      {
        timeout: DOOM_BOOT_TIMEOUT_MS,
        message: `The DOOM machine never reached the playing state within ${DOOM_BOOT_TIMEOUT_MS}ms`,
      },
    )
    .toBe('playing')
}
