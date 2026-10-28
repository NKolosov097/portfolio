import { defineConfig, devices, type Project } from '@playwright/test'

import { E2E_BASE_URL } from './e2e/helpers/server'

/** The DOOM specs, matched by file name rather than listed one by one. */
const DOOM_SPECS = /doom-.*\.spec\.ts$/

/**
 * Browser projects allowed to boot DOOM: one Chromium and one WebKit. Every other project skips
 * those specs.
 *
 * Booting DOOM fetches a 6.8 MB WASM build, instantiates it and then burns a core on a
 * `requestAnimationFrame` loop for the rest of the test. Across the full matrix that was 60 of the
 * suite's 744 tests, which starved two CI workers badly enough to time out unrelated specs - a
 * different one almost every run. The game's behaviour is engine-dependent, not viewport-dependent,
 * so the remaining profiles were paying that cost for no extra signal.
 *
 * Four projects were still two too many. With two workers on a two-core runner, two of them could
 * reach the boot at once and starve each other: the boot timed out at 30s, then again at 60s after
 * that budget was raised, and passed on retry both times - which is contention, not a boot that
 * needs longer. Halving the allowlist halves both the number of boots and the chance of an
 * overlap. Firefox and the touch profile lose DOOM coverage; every other spec still runs on them.
 */
const DOOM_PROJECTS = new Set(['chromium', 'safari'])

/** Keeps DOOM off every project outside the allowlist without repeating the pattern per entry. */
const withDoomBudget = (projects: Project[]): Project[] =>
  projects.map((project) =>
    DOOM_PROJECTS.has(project.name ?? '') ? project : { ...project, testIgnore: DOOM_SPECS },
  )

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  failOnFlakyTests: Boolean(process.env.CI),
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry',
  },
  projects: withDoomBudget([
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    {
      name: 'mobile-firefox',
      use: { ...devices['Desktop Firefox'], viewport: { width: 393, height: 851 } },
    },
    { name: 'safari', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 15'] } },
    { name: 'tablet-safari', use: { ...devices['iPad Pro 11'] } },
    { name: 'tablet-chrome-landscape', use: { ...devices['Galaxy Tab S4 landscape'] } },
    { name: 'foldable-chrome', use: { ...devices['Galaxy Z Fold 7'] } },
    { name: 'foldable-cover-chrome', use: { ...devices['Galaxy Z Fold 7 Cover'] } },
    {
      name: 'tablet-firefox',
      use: { ...devices['Desktop Firefox'], viewport: { width: 834, height: 1194 } },
    },
    {
      name: 'near-square-safari',
      use: { ...devices['Desktop Safari'], viewport: { width: 984, height: 1016 } },
    },
  ]),
  /**
   * The server lifecycle lives in these hooks rather than Playwright's `webServer`, which cannot
   * stop `next start` on Windows: it re-spawns itself, survives the teardown kill and leaves the
   * run hanging after the last test. See `e2e/helpers/server.ts` for why the shutdown targets the
   * port instead of a pid tree.
   */
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
})
