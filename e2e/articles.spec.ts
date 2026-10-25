import { expect, test, type Locator, type Page } from '@playwright/test'

import { selectLanguage } from './helpers/language'

import { ELanguage } from '@/constants/header.constants'
import { aiBoilerplateSeniorEngineersArticle as article } from '@/constants/articles.constants'

const ARTICLE_SLUG = article.slug

/**
 * Ceiling for the first paint of a cold route. WebKit on a contended runner can take well past the
 * default expect timeout to get there, which is a slow machine, not a broken page.
 */
const ARTICLE_RENDER_TIMEOUT = 30_000

/** Opens the article page and resolves once its body heading is on screen. */
const openArticle = async (page: Page): Promise<Locator> => {
  await page.goto(`/articles/${ARTICLE_SLUG}`)

  const heading = page.locator('article').getByRole('heading', { level: 1 })

  await expect(heading).toBeVisible({ timeout: ARTICLE_RENDER_TIMEOUT })

  return heading
}

test.describe('self-hosted articles', () => {
  test('lists the article on the articles index', async ({ page }) => {
    await page.goto('/articles')

    await expect(page.getByTestId(`article-list-item-${ARTICLE_SLUG}`)).toBeVisible()
  })

  test('renders the article page with its content', async ({ page }) => {
    await openArticle(page)

    await expect(page.getByTestId(`article-content-${ARTICLE_SLUG}`)).toBeVisible()
  })

  test('scrolls to a section via a URL fragment without hiding it under the header', async ({
    page,
  }) => {
    await page.goto(`/articles/${ARTICLE_SLUG}#three-decisions-ai-wont-make-for-you`)

    const heading = page.locator('#three-decisions-ai-wont-make-for-you')
    const header = page.locator('#page-header')

    await expect
      .poll(
        async () => {
          const [headingRect, headerBottom, viewportHeight] = await Promise.all([
            heading.evaluate((element) => {
              const { top, bottom } = element.getBoundingClientRect()

              return { top, bottom }
            }),
            header.evaluate((element) => element.getBoundingClientRect().bottom),
            page.evaluate(() => window.innerHeight),
          ])

          return {
            isInViewport: headingRect.bottom > 0 && headingRect.top < viewportHeight,
            isBelowHeader: headingRect.top >= headerBottom,
          }
        },
        { timeout: 30_000 },
      )
      .toEqual({ isInViewport: true, isBelowHeader: true })
  })

  test('switches the article body language with the site language switcher', async ({ page }) => {
    const heading = await openArticle(page)

    await expect(heading).toHaveText(article.title[ELanguage.en])

    await selectLanguage(page, ELanguage.ru)

    await expect(heading).toHaveText(article.title[ELanguage.ru])
  })

  test('opens the self-hosted article in-app from the Writing section, not a new tab', async ({
    page,
    context,
  }) => {
    await page.goto('/')

    const card = page.getByTestId(`writing-article-${ARTICLE_SLUG}`)
    await expect(card).toHaveAttribute('href', `/articles/${ARTICLE_SLUG}`)
    await expect(card).not.toHaveAttribute('target', /.+/)
    await card.evaluate((element) => (element as HTMLElement).click())

    await expect(page).toHaveURL(new RegExp(`/articles/${ARTICLE_SLUG}$`))
    expect(context.pages().length).toBe(1)
  })
})
