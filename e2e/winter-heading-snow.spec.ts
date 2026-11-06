import { expect, test, type Page } from '@playwright/test'
import { APPEARANCE_COOKIE_KEY, EAppearance } from '@/constants/theme.constants'
import { ELanguage } from '@/constants/header.constants'
import { LANG_COOKIE_KEY } from '@/helpers/language'
import { selectLanguage } from './helpers/language'

/** Checks that real translated characters stay selectable and the heading does not widen the viewport. */
async function expectLiveHeading(page: Page) {
  const heading = page.getByTestId('home-heading')
  const selected = await heading.evaluate((node) => {
    const range = document.createRange()
    range.selectNodeContents(node)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    const text = selection?.toString().replace(/\s+/g, ' ').trim() ?? ''
    selection?.removeAllRanges()
    return text
  })
  expect(selected).toBeTruthy()
  await expect(heading).toHaveAccessibleName(selected)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)
}

/** Verifies the fixed raster tracks the real Inter line box at every project viewport. */
async function expectSnowAlignment(page: Page) {
  const alignment = await page.getByTestId('home-heading').evaluate((heading) => {
    const glyph = heading.querySelector('[data-snow-glyph="N"]')
    const snow = glyph?.querySelector('svg')
    if (!glyph || !snow) throw new Error('Expected the prepared N snow geometry.')
    const style = getComputedStyle(heading)
    const glyphRect = glyph.getBoundingClientRect()
    const snowRect = snow.getBoundingClientRect()
    const fontSize = Number.parseFloat(style.fontSize)
    return {
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      x: snowRect.x - glyphRect.x,
      y: snowRect.y - glyphRect.y,
      expectedX: -0.12 * fontSize,
      expectedY: 0.5 * Number.parseFloat(style.lineHeight) - 0.695 * fontSize,
    }
  })
  expect(alignment.fontFamily).toContain('Inter')
  expect(alignment.fontWeight).toBe('700')
  expect(Math.abs(alignment.x - alignment.expectedX)).toBeLessThanOrEqual(1)
  expect(Math.abs(alignment.y - alignment.expectedY)).toBeLessThanOrEqual(1)
}

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: APPEARANCE_COOKIE_KEY, value: EAppearance.winter, domain: 'localhost', path: '/' },
    { name: LANG_COOKIE_KEY, value: ELanguage.en, domain: 'localhost', path: '/' },
  ])
})

test('keeps approved English snow, live text and sparkle across appearance changes', async ({
  page,
}) => {
  await page.goto('/')
  const heading = page.getByTestId('home-heading')
  await expect(heading).toHaveAccessibleName("I'm Nikita Kolosov")
  await expect(heading.locator('[data-snow-pocket]')).toHaveCount(7)
  await expect(heading.locator('[data-snow-inner-lip]')).toHaveCount(4)
  await expect(heading.locator('[data-snow-hanging]')).toHaveCount(4)
  await expectSnowAlignment(page)
  for (const ch of ['N', 'k', 'K'])
    await expect(heading.locator(`[data-snow-corner="${ch}"]`)).toHaveCount(1)
  const nPath = await heading.locator('[data-snow-corner="N"]').getAttribute('d')
  const wall = nPath?.match(/L([\d.]+),([\d.]+) L([\d.]+),([\d.]+) L\3,([\d.]+) Q/)
  expect(wall).toBeTruthy()
  if (!wall) throw new Error('Expected N floor extension followed by a vertical retaining wall.')
  expect(Number(wall[3])).toBeGreaterThan(Number(wall[1]))
  expect(Number(wall[5])).toBeLessThan(Number(wall[4]))
  await expect(heading.getByTestId('home-sparkle')).toHaveCount(1)
  await expectLiveHeading(page)
  const toggle = page.getByTestId('appearance-toggle-switch')
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)
  await expect(heading.locator('svg[data-testid="home-heading-snow"]')).toHaveCount(0)
  await expect(heading).toHaveText("I'm Nikita Kolosov")
  await toggle.click()
  await expect(heading.locator('[data-snow-pocket]')).toHaveCount(7)
  await expectLiveHeading(page)
})

test('replaces locale geometry without stale Latin pockets or duplicate materials', async ({
  page,
}) => {
  await page.goto('/')
  const heading = page.getByTestId('home-heading')
  await expect(heading.locator('[data-snow-pocket]')).toHaveCount(7)
  await selectLanguage(page, ELanguage.ru)
  await expect(heading).toHaveAccessibleName('Я - Никита Колосов')
  await expect(heading.locator('[data-snow-glyph="N"]')).toHaveCount(0)
  await expect(heading.locator('[data-snow-pocket]')).toHaveCount(0)
  await expect(heading.getByTestId('home-heading-snow').first()).toBeAttached()
  await expectLiveHeading(page)
  await selectLanguage(page, ELanguage.en)
  await expect(heading.locator('[data-snow-pocket]')).toHaveCount(7)
  for (const id of [
    'home-snow-inner-fill',
    'home-snow-inner-contact',
    'home-snow-hanging-fill',
    'home-snow-hanging-contact',
  ]) {
    await expect(page.locator(`[id="${id}"]`)).toHaveCount(1)
  }
  await expectLiveHeading(page)
})
