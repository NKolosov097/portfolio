import { expect, type Page } from '@playwright/test'

import en from '@public/locales/en.json'

/**
 * Budget for the boot alone. Fetching and instantiating a 6.8MB WASM build is real work, so more
 * wall clock genuinely finishes it - unlike a wait on animation progress, where a stalled timeline
 * makes every budget too small. Thirty seconds was not enough once the full project matrix ran in
 * parallel; the test budgets below leave room for this plus the interaction each one checks.
 */
export const DOOM_BOOT_TIMEOUT_MS = 60_000

/** The boot budget plus room for the interaction each DOOM test performs once the game is up. */
export const DOOM_TEST_TIMEOUT_MS = DOOM_BOOT_TIMEOUT_MS + 30_000

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
