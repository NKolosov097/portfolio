import { defineConfig, devices } from '@playwright/test'

import { E2E_BASE_URL } from './e2e/helpers/server'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
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
  ],
  /**
   * The server lifecycle lives in these hooks rather than Playwright's `webServer`, which cannot
   * stop `next start` on Windows: it re-spawns itself, survives the teardown kill and leaves the
   * run hanging after the last test. See `e2e/helpers/server.ts` for why the shutdown targets the
   * port instead of a pid tree.
   */
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
})
