import { expect, test } from '@playwright/test'

import en from '@public/locales/en.json'

import { ETabID } from '@/constants/header.constants'

import { revealAside } from './helpers/aside'
import { clickWhenSettled } from './helpers/interaction'

const ALWAYS_RENDERED_SECTION_IDS = [
  ETabID.home,
  ETabID.portfolio,
  ETabID.aboutMe,
  ETabID.resume,
] as const

/** Reverse index of the shipped English tab labels, so no label is written out twice. */
const SECTION_ID_BY_TAB_LABEL = new Map(
  Object.entries(en.headerTabs).map(([tabId, label]) => [label, tabId]),
)

test.describe('home page smoke', () => {
  test('renders every section that is always present', async ({ page }) => {
    await page.goto('/')

    for (const sectionId of ALWAYS_RENDERED_SECTION_IDS) {
      await expect(page.locator(`section#${sectionId}`)).toBeAttached()
    }
  })

  test('gives every header tab a section to scroll to', async ({ page }) => {
    await page.goto('/')

    const tabLabels = await page.getByRole('tab').allInnerTexts()

    expect(tabLabels.length).toBeGreaterThan(0)

    for (const label of tabLabels) {
      const sectionId = SECTION_ID_BY_TAB_LABEL.get(label.trim())

      expect(sectionId, `header tab "${label}" is not in en.json headerTabs`).toBeDefined()
      await expect(page.locator(`section#${sectionId}`)).toBeAttached()
    }
  })

  test('shows the ghost and the social links wherever the aside lives', async ({ page }) => {
    await page.goto('/')

    const aside = await revealAside(page)

    await expect(aside.getByTestId('aside-ghost')).toBeVisible()
    await expect(aside.getByTestId('aside-social-github')).toBeVisible()
  })

  test('loads without uncaught errors', async ({ page }) => {
    const pageErrors: string[] = []
    const consoleErrors: string[] = []

    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text())
      }
    })

    await page.goto('/')
    await expect(page.locator(`section#${ETabID.home}`)).toBeVisible()

    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('scrolls to a section when its header tab is clicked', async ({ page }) => {
    await page.goto('/')

    await clickWhenSettled(page.getByRole('tab', { name: en.headerTabs.resume }))

    await expect(page.locator(`section#${ETabID.resume}`)).toBeInViewport({ timeout: 10_000 })
  })
})
