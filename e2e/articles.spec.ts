import { expect, test } from '@playwright/test'

import { selectLanguage } from './helpers/language'

import { ELanguage } from '@/constants/header.constants'
import { aiBoilerplateSeniorEngineersArticle as article } from '@/constants/articles.constants'

const ARTICLE_SLUG = article.slug

test.describe('self-hosted articles', () => {
  test('lists the article on the articles index', async ({ page }) => {
    await page.goto('/articles')

    await expect(page.getByTestId(`article-list-item-${ARTICLE_SLUG}`)).toBeVisible()
  })

  test('renders the article page with its content', async ({ page }) => {
    await page.goto(`/articles/${ARTICLE_SLUG}`)

    await expect(page.locator('article').getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByTestId(`article-content-${ARTICLE_SLUG}`)).toBeVisible()
  })

  test('scrolls to a section via a URL fragment without hiding it under the header', async ({
    page,
  }) => {
    await page.goto(`/articles/${ARTICLE_SLUG}#three-decisions-ai-wont-make-for-you`)

    const heading = page.locator('#three-decisions-ai-wont-make-for-you')
    await expect(heading).toBeInViewport({ timeout: 10_000 })

    const headingTop = await heading.evaluate((element) => element.getBoundingClientRect().top)
    const headerHeight = await page
      .locator('#page-header')
      .evaluate((element) => element.getBoundingClientRect().height)

    expect(headingTop).toBeGreaterThanOrEqual(headerHeight)
  })

  test('switches the article body language with the site language switcher', async ({ page }) => {
    await page.goto(`/articles/${ARTICLE_SLUG}`)

    const heading = page.locator('article').getByRole('heading', { level: 1 })
    await expect(heading).toHaveText(article.title[ELanguage.en])

    await selectLanguage(page, 'Русский')

    await expect(heading).toHaveText(article.title[ELanguage.ru])
  })

  test('opens the self-hosted article in-app from the Writing section, not a new tab', async ({
    page,
    context,
  }) => {
    await page.goto('/')

    const card = page.getByTestId(`writing-article-${ARTICLE_SLUG}`)
    await expect(card).toBeVisible()
    // Explicit pre-scroll: WebKit's click-triggered auto-scroll otherwise races the
    // page's smooth scrolling and can land the click on the wrong element.
    await card.scrollIntoViewIfNeeded()
    await card.click()

    await expect(page).toHaveURL(new RegExp(`/articles/${ARTICLE_SLUG}$`))
    expect(context.pages().length).toBe(1)
  })
})
