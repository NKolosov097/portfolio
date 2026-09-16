import { expect, test, type Route } from '@playwright/test'

import { LANG_COOKIE_KEY } from '@/helpers/language'
import { ELanguage } from '@/constants/header.constants'
import { aiBoilerplateSeniorEngineersArticle as article } from '@/constants/articles.constants'

/** Routes rendered through the root layout, where the server resolves the visitor's language. */
const ROUTES = ['/', `/articles/${article.slug}`]

/** Keeps hydration checks independent from GitHub's rate-limited project artwork. */
const fulfillProjectImage = (route: Route): Promise<void> =>
  route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' })

for (const route of ROUTES) {
  test(`renders ${route} in the cookie-persisted language with no hydration error`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: LANG_COOKIE_KEY, value: ELanguage.ru, domain: 'localhost', path: '/' },
    ])
    await page.route(
      /\/_next\/image\?url=https%3A%2F%2Fopengraph\.githubassets\.com/,
      fulfillProjectImage,
    )

    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))

    await page.goto(route, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    expect(errors, errors.join('\n\n')).toHaveLength(0)
  })
}
